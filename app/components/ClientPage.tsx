'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter, useSearchParams } from 'next/navigation';
import type { FeatureCollection, Feature, Polygon, MultiPolygon } from 'geojson';
import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import { point } from '@turf/helpers';
import ProgressBar from './ProgressBar';
import AddressLookup from './AddressLookup';
import RepList from './RepList';
import TargetedRepList from './TargetedRepList';
import TargetedRepCard from './TargetedRepCard';
import FactSheet from './FactSheet';
import { FIPS_TO_STATE } from './fips';
import type { DistrictClickInfo } from './Map';

const DistrictMap = dynamic(() => import('./Map'), { ssr: false });

interface Signer {
  name: string;
  state: string;
  stateAbbr: string;
  district: string;
  stateDistrict: string;
  party: string;
  dateSigned: string;
}

interface SignerData {
  lastUpdated: string;
  totalSignatures: number;
  needed: number;
  signers: Signer[];
}

interface HouseRep {
  name: string;
  party: string;
  stateDistrict: string;
  phone: string;
  area: string;
  searchTerms: string;
  targeted: boolean;
}

interface ClientPageProps {
  signerData: SignerData;
  allReps: HouseRep[];
  targetedReps: HouseRep[];
  learnContent: string;
  callScriptTemplate?: string;
  emailTemplate?: string;
}

export default function ClientPage({ signerData, allReps, targetedReps, learnContent, callScriptTemplate, emailTemplate }: ClientPageProps) {
  const [geoData, setGeoData] = useState<FeatureCollection | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [browserLocation, setBrowserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedDistrict, setSelectedDistrict] = useState<DistrictClickInfo | null>(null);
  const [networkSelectedDistrict, setNetworkSelectedDistrict] = useState<DistrictClickInfo | null>(null);
  const [networkSearchOverlay, setNetworkSearchOverlay] = useState<GeoJSON.GeoJsonObject | null>(null);
  const [youSearchOverlay, setYouSearchOverlay] = useState<GeoJSON.GeoJsonObject | null>(null);
  const [networkRepCount, setNetworkRepCount] = useState<number | undefined>(undefined);
  const [showTargetedList, setShowTargetedList] = useState(true);
  const [showZipSearch, setShowZipSearch] = useState(false);
  const [networkMapMode, setNetworkMapMode] = useState<null | 'results' | 'explore'>(null);
  const [youMapMode, setYouMapMode] = useState<null | 'results' | 'explore'>(null);
  const [youExploreEverShown, setYouExploreEverShown] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState<'you' | 'network' | 'learn' | 'facts'>(
    tabParam === 'network' || tabParam === 'learn' || tabParam === 'facts' ? tabParam : 'you'
  );

  const switchTab = useCallback((tab: 'you' | 'network' | 'learn' | 'facts') => {
    setActiveTab(tab);
    setSelectedDistrict(null);
    setNetworkSelectedDistrict(null);
    setNetworkMapMode(null);
    setNetworkSearchOverlay(null);
    setYouSearchOverlay(null);
    setNetworkRepCount(undefined);
    setYouMapMode(null);
    setUserLocation(null);
    setShowZipSearch(false);
    router.replace(`?tab=${tab}`, { scroll: false });
  }, [router]);


  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      (pos) => setBrowserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {} // silently ignore denial
    );
  }, []);

  useEffect(() => {
    fetch('/districts.geojson')
      .then((res) => res.json())
      .then((data) => setGeoData(data));
  }, []);

  const signerByDistrict = useMemo(
    () => new Map(signerData.signers.map((s) => [s.stateDistrict, s])),
    [signerData.signers]
  );
  const repByDistrict = useMemo(
    () => new Map(allReps.map((r) => [r.stateDistrict, r])),
    [allReps]
  );

  const findDistrict = useCallback(
    (lat: number, lng: number): { stateAbbr: string; district: string } | null => {
      if (!geoData) return null;
      const pt = point([lng, lat]);
      for (const feature of geoData.features) {
        const f = feature as Feature<Polygon | MultiPolygon, { STATEFP: string; CD118FP: string }>;
        if (booleanPointInPolygon(pt, f)) {
          const stateAbbr = FIPS_TO_STATE[f.properties.STATEFP] || f.properties.STATEFP;
          return { stateAbbr, district: f.properties.CD118FP };
        }
      }
      return null;
    },
    [geoData]
  );

  // Auto-detected district from geolocation
  const autoDistrict = useMemo(() => {
    if (!browserLocation || !geoData) return null;
    const dist = findDistrict(browserLocation.lat, browserLocation.lng);
    if (!dist) return null;
    const key = `${dist.stateAbbr}${dist.district}`;
    return {
      key,
      stateAbbr: dist.stateAbbr,
      district: dist.district,
      signer: signerByDistrict.get(key),
      targeted: repByDistrict.get(key),
    };
  }, [browserLocation, geoData, findDistrict, signerByDistrict, repByDistrict]);

  // Auto-select on map when geolocation resolves
  useEffect(() => {
    if (!autoDistrict || selectedDistrict) return;
    setSelectedDistrict({
      key: autoDistrict.key,
      stateAbbr: autoDistrict.stateAbbr,
      district: autoDistrict.district,
      signer: autoDistrict.signer,
      targeted: autoDistrict.targeted,
    });
  }, [autoDistrict]); // eslint-disable-line react-hooks/exhaustive-deps

  const repName = autoDistrict?.signer?.name || autoDistrict?.targeted?.name;
  const repParty = autoDistrict?.signer?.party || autoDistrict?.targeted?.party;

  return (
    <>
      {/* Header */}
      <header className="bg-gradient-to-br from-brand via-brand-mid to-brand-deep text-white">
        <div className="max-w-5xl mx-auto px-4 py-10 sm:py-14">
          <h1 className="text-3xl sm:text-5xl font-extrabold leading-tight tracking-tight">
            Call your representative today.
          </h1>
          <p className="mt-4 text-brand-light text-lg sm:text-xl max-w-2xl leading-relaxed">
            330,000 Haitians are at risk of losing their protection. A discharge petition
            needs 218 House signatures — and your rep may not have signed yet.
            Find out below and make the call.
          </p>
          <div className="mt-6">
            <ProgressBar current={signerData.totalSignatures} needed={signerData.needed} />
          </div>
        </div>
      </header>

      {/* Supreme Court Urgency Banner */}
      <div className="bg-gradient-to-r from-urgent to-urgent-end text-white">
        <div className="max-w-5xl mx-auto px-4 py-4 sm:py-5">
          <p className="text-sm sm:text-base leading-relaxed">
            <span className="font-bold">Why now: </span> On March 16, the Supreme Court agreed to hear the Trump administration&rsquo;s emergency case to strip TPS protections. Oral arguments are expected in April, with a decision by end of June. A ruling against TPS could mean deportation orders for hundreds of thousands of Haitians &mdash; making the discharge petition our best remaining legislative path to protect them before that decision lands.
          </p>
        </div>
      </div>

      <main className="flex-1 bg-page-bg">

        <div className="max-w-5xl mx-auto px-3 sm:px-4 pt-6 sm:pt-8">

          {/* Tabs */}
          <div className="flex rounded-xl overflow-hidden border border-gray-200 mb-6 shadow-sm">
            <button
              onClick={() => switchTab('you')}
              className={`flex-1 py-3.5 px-4 text-sm font-bold transition-all ${
                activeTab === 'you'
                  ? 'bg-gradient-to-r from-brand to-brand-mid text-white shadow-inner'
                  : 'bg-white text-gray-600 hover:bg-brand-tint hover:text-brand'
              }`}
            >
              For You
            </button>
            <button
              onClick={() => switchTab('network')}
              className={`flex-1 py-3.5 px-4 text-sm font-bold transition-all border-l border-gray-200 ${
                activeTab === 'network'
                  ? 'bg-gradient-to-r from-brand to-brand-mid text-white shadow-inner'
                  : 'bg-white text-gray-600 hover:bg-brand-tint hover:text-brand'
              }`}
            >
              For Your Network
            </button>
            <button
              onClick={() => switchTab('learn')}
              className={`flex-1 py-3.5 px-4 text-sm font-bold transition-all border-l border-gray-200 ${
                activeTab === 'learn'
                  ? 'bg-gradient-to-r from-brand to-brand-mid text-white shadow-inner'
                  : 'bg-white text-gray-600 hover:bg-brand-tint hover:text-brand'
              }`}
            >
              Learn About TPS
            </button>
            <button
              onClick={() => switchTab('facts')}
              className={`flex-1 py-3.5 px-4 text-sm font-bold transition-all border-l border-gray-200 ${
                activeTab === 'facts'
                  ? 'bg-gradient-to-r from-brand to-brand-mid text-white shadow-inner'
                  : 'bg-white text-gray-600 hover:bg-brand-tint hover:text-brand'
              }`}
            >
              Fact Sheet
            </button>
          </div>

          {/* -- FOR YOU -- */}
          {activeTab === 'you' && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
                {/* Tab bar */}
                <div className="flex border-b border-gray-100">
                  <button
                    onClick={() => setYouMapMode(autoDistrict || userLocation ? 'results' : null)}
                    className={`flex-1 py-3 px-4 text-sm font-semibold transition-all ${
                      youMapMode !== 'explore'
                        ? 'bg-white text-gray-900 border-b-2 border-brand -mb-px'
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    Find my rep
                  </button>
                  <button
                    onClick={() => { setYouMapMode('explore'); setYouExploreEverShown(true); }}
                    className={`flex-1 py-3 px-4 text-sm font-semibold transition-all border-l border-gray-100 ${
                      youMapMode === 'explore'
                        ? 'bg-white text-gray-900 border-b-2 border-brand -mb-px'
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    Explore map
                  </button>
                </div>

                {/* Find my rep tab — always mounted to preserve AddressLookup state */}
                <div className={`p-5 sm:p-7 ${youMapMode === 'explore' ? 'hidden' : ''}`}>
                    {!autoDistrict && (
                      <p className="text-sm text-gray-500 mb-4">
                        Enter your ZIP code to find your rep and see if they&apos;ve signed.
                      </p>
                    )}
                    <div className={youMapMode === 'results' ? 'flex flex-col md:flex-row gap-5' : ''}>
                      <div className={youMapMode === 'results' ? 'md:w-[60%] min-w-0' : ''}>
                        {autoDistrict && !showZipSearch && (
                          <div className="mb-3">
                            <p className="text-xs text-gray-400 mb-2">Your representative (based on your location)</p>
                            <TargetedRepCard
                              name={repName || `${autoDistrict.stateAbbr}-${autoDistrict.district}`}
                              party={repParty || ''}
                              area={autoDistrict.targeted?.area || ''}
                              stateDistrict={autoDistrict.key}
                              phone={autoDistrict.targeted?.phone || ''}
                              signed={!!autoDistrict.signer}
                              dateSigned={autoDistrict.signer?.dateSigned}
                              targeted={!!autoDistrict.targeted && !autoDistrict.signer}
                              callScriptTemplate={callScriptTemplate}
                              emailTemplate={emailTemplate}
                            />
                          </div>
                        )}
                        {autoDistrict && !showZipSearch ? (
                          <button
                            onClick={() => { setShowZipSearch(true); setSelectedDistrict(null); setYouMapMode(null); }}
                            className="text-sm text-brand hover:underline"
                          >
                            Not your district? Search by ZIP &rarr;
                          </button>
                        ) : (
                          <AddressLookup
                            signerData={signerData}
                            geoData={geoData}
                            targetedReps={allReps}
                            highlightedDistrict={selectedDistrict?.key}
                            onLocationFound={(loc) => {
                              setUserLocation(loc);
                              setYouMapMode('results');
                              if (loc.geojson) {
                                setYouSearchOverlay({ type: 'Feature', properties: {}, geometry: loc.geojson } as GeoJSON.GeoJsonObject);
                              }
                            }}
                            onSwitchToNetwork={() => switchTab('network')}
                            callScriptTemplate={callScriptTemplate}
                            emailTemplate={emailTemplate}
                          />
                        )}
                      </div>
                      {/* Map: render once userLocation is set, keep mounted across tab switches */}
                      {userLocation && (
                        <div className="md:w-[40%] md:sticky md:top-4 md:self-start">
                          <div className="flex items-center gap-3 mb-2 text-xs text-gray-500">
                            <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-sm bg-green-500" /> Signed</span>
                            <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-sm bg-yellow-400" /> Likely to sign</span>
                            <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-sm bg-gray-300" /> Other</span>
                          </div>
                          <DistrictMap
                            signerData={signerData}
                            allReps={allReps}
                            flyToLocation={userLocation ?? browserLocation}
                            initialZoom={userLocation ? 12 : 7}
                            searchOverlay={youSearchOverlay}
                            selectedDistrictKey={selectedDistrict?.key}
                            onDistrictClick={setSelectedDistrict}
                          />
                        </div>
                      )}
                    </div>
                  </div>

                {/* Explore map tab — lazy first render, then kept mounted to preserve Leaflet */}
                {youExploreEverShown && <div className={`p-5 sm:p-7 ${youMapMode !== 'explore' ? 'hidden' : ''}`}>
                    <div className="flex items-center gap-3 mb-3 text-xs text-gray-500">
                      <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-sm bg-green-500" /> Signed</span>
                      <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-sm bg-yellow-400" /> Most likely to sign</span>
                      <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-sm bg-gray-300" /> Not yet targeted</span>
                    </div>
                    <DistrictMap
                      signerData={signerData}
                      allReps={allReps}
                      selectedDistrictKey={selectedDistrict?.key}
                      onDistrictClick={setSelectedDistrict}
                    />
                  </div>}
              </div>
            </div>
          )}

          {/* -- FOR YOUR NETWORK -- */}
          {activeTab === 'network' && (
            <div className="space-y-6">

              {/* Search / Explore map card */}
              <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
                {/* Tab bar */}
                <div className="flex border-b border-gray-100">
                  <button
                    onClick={() => setNetworkMapMode(networkMapMode === 'explore' ? null : networkMapMode)}
                    className={`flex-1 py-3 px-4 text-sm font-semibold transition-all ${
                      networkMapMode !== 'explore'
                        ? 'bg-white text-gray-900 border-b-2 border-brand -mb-px'
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    Search by location
                  </button>
                  <button
                    onClick={() => { setNetworkMapMode('explore'); setNetworkSearchOverlay(null); }}
                    className={`flex-1 py-3 px-4 text-sm font-semibold transition-all border-l border-gray-100 ${
                      networkMapMode === 'explore'
                        ? 'bg-white text-gray-900 border-b-2 border-brand -mb-px'
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    Explore map
                  </button>
                </div>

                {/* Search tab */}
                {networkMapMode !== 'explore' && (
                  <div className="p-5 sm:p-7">
                    <p className="text-sm text-gray-500 mb-4">
                      Search by city, state, ZIP, or region to find reps and forward the email script.
                    </p>
                    <div className={`${networkMapMode === 'results' ? 'flex flex-col md:flex-row gap-5' : ''}`}>
                      <div className={networkMapMode === 'results' ? 'md:w-[60%] min-w-0' : ''}>
                        <RepList
                          allReps={allReps}
                          signerData={signerData}
                          geoData={geoData}
                          onSearchOverlay={setNetworkSearchOverlay}
                          onResultsFound={(count) => { setNetworkMapMode('results'); setNetworkRepCount(count); }}
                          highlightedDistrict={networkSelectedDistrict?.key}
                          callScriptTemplate={callScriptTemplate}
                          emailTemplate={emailTemplate}
                        />
                      </div>
                      {networkMapMode === 'results' && (
                        <div className="md:w-[40%] md:sticky md:top-4 md:self-start">
                          <div className="flex items-center gap-3 mb-2 text-xs text-gray-500">
                            <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-sm bg-green-500" /> Signed</span>
                            <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-sm bg-yellow-400" /> High priority</span>
                            <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-sm bg-gray-300" /> Other</span>
                          </div>
                          <DistrictMap
                            signerData={signerData}
                            allReps={allReps}
                            onDistrictClick={setNetworkSelectedDistrict}
                            selectedDistrictKey={networkSelectedDistrict?.key}
                            searchOverlay={networkSearchOverlay}
                            compact
                            repCount={networkRepCount}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Explore map tab */}
                {networkMapMode === 'explore' && (
                  <div className="p-5 sm:p-7">
                    <div className="flex items-center gap-3 mb-3 text-xs text-gray-500">
                      <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-sm bg-green-500" /> Signed</span>
                      <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-sm bg-yellow-400" /> High priority</span>
                      <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-sm bg-gray-300" /> Other</span>
                    </div>
                    <DistrictMap
                      signerData={signerData}
                      allReps={allReps}
                      onDistrictClick={setNetworkSelectedDistrict}
                    />
                  </div>
                )}
              </div>

              {/* High-priority targeted reps — collapsible */}
              <div className="bg-white rounded-2xl shadow-md border border-gray-100">
                <button
                  onClick={() => setShowTargetedList(!showTargetedList)}
                  className="w-full text-left p-5 sm:p-7 flex items-center justify-between gap-3"
                >
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">
                      High-priority representatives
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">
                      {targetedReps.length} reps most likely to sign &mdash; browse by state
                    </p>
                  </div>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className={`h-6 w-6 text-gray-400 transition-transform shrink-0 ${showTargetedList ? 'rotate-180' : ''}`}
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
                {showTargetedList && (
                  <div className="px-5 pb-5 sm:px-7 sm:pb-7 pt-0">
                    <TargetedRepList targetedReps={targetedReps} callScriptTemplate={callScriptTemplate} emailTemplate={emailTemplate} />
                  </div>
                )}
              </div>
            </div>
          )}
          {/* -- LEARN ABOUT TPS -- */}
          {activeTab === 'learn' && (
            <div className="space-y-6 pb-6 sm:pb-8">

              {/* Live Google Doc content */}
              {learnContent ? (
                <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-5 sm:p-7">
                  <div className="overflow-x-auto">
                  <div
                    className="
                      text-sm text-black leading-relaxed
                      [&_h1]:text-xl [&_h1]:font-bold [&_h1]:text-gray-900 [&_h1]:mt-6 [&_h1]:mb-3 [&_h1]:first:mt-0
                      [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-gray-900 [&_h2]:mt-5 [&_h2]:mb-2 [&_h2]:first:mt-0
                      [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-gray-800 [&_h3]:mt-4 [&_h3]:mb-1
                      [&_p]:mb-3 [&_p]:leading-relaxed
                      [&_ul]:list-disc [&_ul]:ml-5 [&_ul]:mb-3 [&_ul]:space-y-1
                      [&_ol]:list-decimal [&_ol]:ml-5 [&_ol]:mb-3 [&_ol]:space-y-1
                      [&_li]:leading-relaxed
                      [&_b]:font-semibold [&_strong]:font-semibold [&_u]:underline
                      [&_a]:text-link [&_a]:underline [&_a:hover]:text-link-hover
                      [&_hr]:border-gray-200 [&_hr]:my-4
                      [&_table]:w-full [&_table]:border-collapse [&_table]:my-4 [&_table]:text-sm
                      [&_th]:border [&_th]:border-gray-300 [&_th]:bg-gray-100 [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:font-semibold
                      [&_td]:border [&_td]:border-gray-300 [&_td]:px-3 [&_td]:py-2 [&_td]:align-top
                      [&_tr:nth-child(even)_td]:bg-gray-50
                      [&_img]:max-w-full [&_img]:h-auto [&_img]:rounded-lg [&_img]:my-4
                    "
                    dangerouslySetInnerHTML={{ __html: learnContent }}
                  />
                  </div>
                  <p className="mt-6 pt-4 border-t border-gray-100 text-xs text-gray-400">
                    Content sourced from{' '}
                    <a href="https://beyondborders.net/save-temporary-protected-status-tps-for-haitians-in-the-u-s/" target="_blank" rel="noopener noreferrer" className="text-link hover:underline">
                      Beyond Borders
                    </a>
                    {' '}and updated automatically from a shared document.
                  </p>
                </div>
              ) : (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-center text-gray-500 text-sm">
                  Additional background information is temporarily unavailable.
                </div>
              )}
            </div>
          )}
          {/* -- FACT SHEET -- */}
          {activeTab === 'facts' && <FactSheet />}

        </div>
      </main>

      {/* Spread the word */}
      {activeTab !== 'network' && activeTab !== 'facts' && <div className="bg-gradient-to-r from-brand via-brand-mid to-brand-deep text-white">
        <div className="max-w-5xl mx-auto px-4 py-10 sm:py-12 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
          <div>
            <p className="text-xl sm:text-2xl font-bold">Help us spread the word.</p>
            <p className="text-brand-light text-sm sm:text-base mt-1.5">Reach out to your network &mdash; a call from their constituent can genuinely move the needle.</p>
          </div>
          <button
            onClick={() => { switchTab('network'); window.scrollTo({ top: 0, behavior: 'smooth' }); } }
            className="shrink-0 inline-flex items-center gap-2 bg-white text-brand hover:bg-brand-tint font-bold py-3 px-6 rounded-xl text-sm transition-all shadow-lg hover:shadow-xl"
          >
            Reach out to your network &rarr;
          </button>
        </div>
      </div>}

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-6">
        <div className="max-w-5xl mx-auto px-3 sm:px-4 text-sm">
          <p className="text-gray-500">
            Signer data from the{' '}
            <a href="https://clerk.house.gov/DischargePetition" target="_blank" rel="noopener noreferrer" className="text-link-on-dark hover:text-link-on-dark-hover underline">
              Office of the Clerk
            </a>.
            Phone numbers from the{' '}
            <a href="https://www.house.gov/representatives" target="_blank" rel="noopener noreferrer" className="text-link-on-dark hover:text-link-on-dark-hover underline">
              House Member Directory
            </a>.
          </p>
        </div>
      </footer>
    </>
  );
}
