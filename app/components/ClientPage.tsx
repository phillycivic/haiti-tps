'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter, useSearchParams } from 'next/navigation';
import type { FeatureCollection, Feature, Polygon, MultiPolygon } from 'geojson';
import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import { point } from '@turf/helpers';
import ProgressBar from './ProgressBar';
import AddressLookup from './AddressLookup';
import TargetedRepList from './TargetedRepList';
import CallScript from './CallScript';
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
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState<'you' | 'network' | 'learn'>(
    tabParam === 'network' || tabParam === 'learn' ? tabParam : 'you'
  );

  const switchTab = useCallback((tab: 'you' | 'network' | 'learn') => {
    setActiveTab(tab);
    setSelectedDistrict(null);
    setNetworkSelectedDistrict(null);
    router.replace(`?tab=${tab}`, { scroll: false });
  }, [router]);
  const calloutRef = useRef<HTMLDivElement>(null);
  const networkCalloutRef = useRef<HTMLDivElement>(null);
  const autoSelectedRef = useRef(false);

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
    autoSelectedRef.current = true;
    setSelectedDistrict({
      key: autoDistrict.key,
      stateAbbr: autoDistrict.stateAbbr,
      district: autoDistrict.district,
      signer: autoDistrict.signer,
      targeted: autoDistrict.targeted,
    });
  }, [autoDistrict]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (selectedDistrict && calloutRef.current && !autoSelectedRef.current) {
      calloutRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    autoSelectedRef.current = false;
  }, [selectedDistrict]);

  useEffect(() => {
    if (networkSelectedDistrict && networkCalloutRef.current) {
      networkCalloutRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [networkSelectedDistrict]);

  const repName = autoDistrict?.signer?.name || autoDistrict?.targeted?.name;
  const repParty = autoDistrict?.signer?.party || autoDistrict?.targeted?.party;

  // District callout for map clicks
  const renderCallout = (district: DistrictClickInfo, onClose: () => void, ref: React.RefObject<HTMLDivElement | null>) => (
    <div id="district-callout" ref={ref} className="mt-4 border border-gray-200 rounded-lg bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-gray-900 text-lg">
            {district.signer?.name || district.targeted?.name || `${district.stateAbbr}-${district.district}`}
            {(district.signer?.party || district.targeted?.party) && (
              <span className="text-gray-500 font-normal"> ({district.signer?.party || district.targeted?.party})</span>
            )}
          </h3>
          <p className="text-sm text-gray-500">
            {district.stateAbbr}-{district.district}
            {district.targeted?.area && ` \u2014 ${district.targeted.area}`}
          </p>
          {district.signer && (
            <p className="mt-1 text-sm font-semibold text-green-600">
              Signed {district.signer.dateSigned}
            </p>
          )}
          {!district.signer && district.targeted && (
            <p className="mt-1 text-sm font-semibold text-amber-600">
              Not yet signed &mdash; most likely to sign &mdash; call this rep!
            </p>
          )}
          {!district.signer && !district.targeted && (
            <p className="mt-1 text-sm font-semibold text-gray-500">
              Not yet signed
            </p>
          )}
        </div>
        <button
          onClick={onClose}
          className="shrink-0 text-gray-400 hover:text-gray-600"
          aria-label="Close"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
      {!district.signer && (
        <CallScript
          repName={district.targeted?.name || `your representative (${district.stateAbbr}-${district.district})`}
          phone={district.targeted?.phone}
          callScriptTemplate={callScriptTemplate}
          emailTemplate={emailTemplate}
        />
      )}
    </div>
  );

  return (
    <>
      {/* Header */}
      <header className="bg-gradient-to-br from-brand via-brand-mid to-brand-deep text-white">
        <div className="max-w-5xl mx-auto px-4 py-10 sm:py-14">
          <h1 className="text-3xl sm:text-5xl font-extrabold leading-tight tracking-tight">
            Call your representative today.
          </h1>
          <p className="mt-4 text-brand-light text-lg sm:text-xl max-w-2xl leading-relaxed">
            350,000 Haitians are at risk of losing their protection. A discharge petition
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
          </div>

          {/* -- FOR YOU -- */}
          {activeTab === 'you' && (
            <div className="space-y-6">

              {/* Auto-detected district */}
              {autoDistrict && (
                <div className={`rounded-2xl shadow-md border p-5 sm:p-7 ${
                  autoDistrict.signer ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-300'
                }`}>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                    Your representative (based on your location)
                  </p>
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
                    {repName || `${autoDistrict.stateAbbr}-${autoDistrict.district}`}
                    {repParty && <span className="text-gray-500 font-normal text-lg"> ({repParty})</span>}
                  </h2>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {autoDistrict.stateAbbr}-{autoDistrict.district}
                    {autoDistrict.targeted?.area && ` \u2014 ${autoDistrict.targeted.area}`}
                  </p>
                  {autoDistrict.signer ? (
                    <>
                      <p className="mt-2 text-emerald-700 font-semibold">
                        Signed the petition on {autoDistrict.signer.dateSigned}
                      </p>
                      <div className="mt-4 bg-white/80 rounded-xl p-4 border border-emerald-200">
                        <p className="text-sm text-gray-700 font-medium">
                          Your rep already signed! Switch to the &ldquo;For Your Network&rdquo; tab to find friends whose reps haven&rsquo;t yet.
                        </p>
                        <button
                          onClick={() => switchTab('network')}
                          className="mt-3 inline-flex items-center gap-2 bg-gradient-to-r from-action to-action-end hover:from-action-dark hover:to-action-end-dark text-white font-semibold py-2.5 px-5 rounded-lg text-sm transition-all shadow-sm hover:shadow-md"
                        >
                          Help us spread the word &mdash; reach out to your network &rarr;
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="mt-2 text-orange-700 font-bold text-lg">
                        Has NOT signed yet &mdash; your call matters!
                      </p>
                      <CallScript
                        repName={autoDistrict.targeted?.name || `your representative (${autoDistrict.stateAbbr}-${autoDistrict.district})`}
                        phone={autoDistrict.targeted?.phone}
                        callScriptTemplate={callScriptTemplate}
                        emailTemplate={emailTemplate}
                      />
                    </>
                  )}
                  <p className="mt-3 text-xs text-gray-400">
                    Not your district? Look up by ZIP below.
                  </p>
                </div>
              )}

              {/* ZIP lookup -- only show if we don't have a location */}
              {!autoDistrict && (
                <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-5 sm:p-7">
                  <h2 className="text-xl font-semibold text-gray-900 mb-1">
                    Look up your rep by ZIP
                  </h2>
                  <p className="text-sm text-gray-500 mb-4">
                    Enter your ZIP code to find your congressional district and see if your rep has signed.
                  </p>
                  <AddressLookup signerData={signerData} geoData={geoData} targetedReps={allReps} onSwitchToNetwork={() => switchTab('network')} callScriptTemplate={callScriptTemplate} emailTemplate={emailTemplate} />
                </div>
              )}

              {/* Signature map */}
              <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-5 sm:p-7">
                <h2 className="text-xl font-semibold text-gray-900 mb-1">Signature map</h2>
                <p className="text-sm text-gray-500 mb-4">
                  <span className="inline-block w-3 h-3 rounded-sm bg-green-500 mr-1 align-middle" /> Signed
                  <span className="inline-block w-3 h-3 rounded-sm bg-yellow-400 ml-3 mr-1 align-middle" /> Most likely to sign
                  <span className="inline-block w-3 h-3 rounded-sm bg-gray-300 ml-3 mr-1 align-middle" /> Not yet targeted
                  &mdash; Click a district for details.
                </p>
                <DistrictMap
                  signerData={signerData}
                  allReps={allReps}
                  userLocation={userLocation || browserLocation}
                  initialZoom={browserLocation && !userLocation ? 7 : undefined}
                  selectedDistrictKey={selectedDistrict?.key}
                  onDistrictClick={setSelectedDistrict}
                />
                {selectedDistrict && renderCallout(selectedDistrict, () => setSelectedDistrict(null), calloutRef)}
              </div>
            </div>
          )}

          {/* -- FOR YOUR NETWORK -- */}
          {activeTab === 'network' && (
            <div className="space-y-6">

              {/* ZIP lookup for a friend */}
              <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-5 sm:p-7">
                <h2 className="text-xl font-semibold text-gray-900 mb-1">
                  Check a friend&rsquo;s rep
                </h2>
                <p className="text-sm text-gray-500 mb-4">
                  Enter a friend&rsquo;s ZIP to see if their rep has signed &mdash; and get a call script to forward to them.
                </p>
                <AddressLookup signerData={signerData} geoData={geoData} targetedReps={allReps} callScriptTemplate={callScriptTemplate} emailTemplate={emailTemplate} />
              </div>

              {/* Key districts */}
              <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-5 sm:p-7">
                <h2 className="text-xl font-semibold text-gray-900 mb-1">
                  Spread the word to your network
                </h2>
                <p className="text-sm text-gray-500 mb-4">
                  These are the districts most likely to tip the balance. If you know anyone who lives in one of these areas, forward them the call script &mdash; their call could be the one that gets us to 218.
                </p>
                <TargetedRepList targetedReps={targetedReps} />
              </div>

              {/* Signature map */}
              <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-5 sm:p-7">
                <h2 className="text-xl font-semibold text-gray-900 mb-1">Signature map</h2>
                <p className="text-sm text-gray-500 mb-1">
                  <span className="inline-block w-3 h-3 rounded-sm bg-green-500 mr-1 align-middle" /> Signed
                  <span className="inline-block w-3 h-3 rounded-sm bg-yellow-400 ml-3 mr-1 align-middle" /> Most likely to sign
                  <span className="inline-block w-3 h-3 rounded-sm bg-gray-300 ml-3 mr-1 align-middle" /> Not yet targeted
                  &mdash; Click a district for details.
                </p>
                <p className="text-xs text-link mb-4">Don&rsquo;t know the zip code? Use the map to zoom in.</p>
                <DistrictMap
                  signerData={signerData}
                  allReps={allReps}
                  selectedDistrictKey={networkSelectedDistrict?.key}
                  onDistrictClick={setNetworkSelectedDistrict}
                />
                {networkSelectedDistrict && renderCallout(networkSelectedDistrict, () => setNetworkSelectedDistrict(null), networkCalloutRef)}
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
                      text-sm text-gray-700 leading-relaxed
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

        </div>
      </main>

      {/* Spread the word */}
      <div className="bg-gradient-to-r from-brand via-brand-mid to-brand-deep text-white">
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
      </div>

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
