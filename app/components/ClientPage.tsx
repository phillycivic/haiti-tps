'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
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

interface TargetedRep {
  name: string;
  party: string;
  stateDistrict: string;
  phone: string;
  area: string;
  searchTerms: string;
}

interface ClientPageProps {
  signerData: SignerData;
  targetedReps: TargetedRep[];
}

export default function ClientPage({ signerData, targetedReps }: ClientPageProps) {
  const [geoData, setGeoData] = useState<FeatureCollection | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [browserLocation, setBrowserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedDistrict, setSelectedDistrict] = useState<DistrictClickInfo | null>(null);
  const [showMap, setShowMap] = useState(false);
  const calloutRef = useRef<HTMLDivElement>(null);
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
  const targetedByDistrict = useMemo(
    () => new Map(targetedReps.map((t) => [t.stateDistrict, t])),
    [targetedReps]
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
      targeted: targetedByDistrict.get(key),
    };
  }, [browserLocation, geoData, findDistrict, signerByDistrict, targetedByDistrict]);

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

  const repName = autoDistrict?.signer?.name || autoDistrict?.targeted?.name;
  const repParty = autoDistrict?.signer?.party || autoDistrict?.targeted?.party;

  return (
    <>
      {/* Header */}
      <header className="bg-blue-700 text-white">
        <div className="max-w-5xl mx-auto px-4 py-8 sm:py-10">
          <h1 className="text-3xl sm:text-4xl font-bold leading-tight">
            Call your representative today.
          </h1>
          <p className="mt-3 text-blue-100 text-lg max-w-2xl">
            350,000 Haitians are at risk of losing their protection. A discharge petition
            needs 218 House signatures — and your rep may not have signed yet.
            Find out below and make the call.
          </p>
          <div className="mt-5">
            <ProgressBar current={signerData.totalSignatures} needed={signerData.needed} />
          </div>
        </div>
      </header>

      {/* Supreme Court Urgency Banner */}
      <div className="bg-red-700 text-white">
        <div className="max-w-5xl mx-auto px-4 py-4 sm:py-5">
          <p className="text-sm sm:text-base leading-relaxed">
            <span className="font-bold">Why now:</span> On March 16, the Supreme Court agreed to hear the Trump administration&rsquo;s emergency case to strip TPS protections. Oral arguments are expected in April, with a decision by end of June. A ruling against TPS could mean deportation orders for hundreds of thousands of Haitians &mdash; making the discharge petition our best remaining legislative path to protect them before that decision lands.
          </p>
        </div>
      </div>

      <main className="flex-1 bg-gray-50">

        {/* ──────────────────────────────────────────────── */}
        {/* SECTION 1: Auto-detected district (geolocation) */}
        {/* ──────────────────────────────────────────────── */}
        {autoDistrict && (
          <section className="max-w-5xl mx-auto px-3 sm:px-4 pt-6 sm:pt-8">
            <div className={`rounded-xl shadow-sm border p-4 sm:p-6 ${
              autoDistrict.signer
                ? 'bg-green-50 border-green-200'
                : 'bg-amber-50 border-amber-200'
            }`}>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                Your representative (based on your location)
              </p>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
                {repName || `${autoDistrict.stateAbbr}-${autoDistrict.district}`}
                {repParty && (
                  <span className="text-gray-500 font-normal text-lg"> ({repParty})</span>
                )}
              </h2>
              <p className="text-sm text-gray-500 mt-0.5">
                {autoDistrict.stateAbbr}-{autoDistrict.district}
                {autoDistrict.targeted?.area && ` \u2014 ${autoDistrict.targeted.area}`}
              </p>

              {autoDistrict.signer ? (
                <>
                  <p className="mt-2 text-green-700 font-semibold">
                    Signed the petition on {autoDistrict.signer.dateSigned}
                  </p>
                  <div className="mt-4 bg-white/70 rounded-lg p-4 border border-green-200">
                    <p className="text-sm text-gray-700 font-medium">
                      Your rep already signed! Help by sharing with friends whose reps haven&rsquo;t yet. The Supreme Court decides by June &mdash; every signature matters.
                    </p>
                    <a
                      href={`mailto:?subject=${encodeURIComponent('Help protect TPS for 350,000 Haitians')}&body=${encodeURIComponent("Hi,\n\nThe Supreme Court is about to decide whether to strip TPS protections from 350,000 Haitians. A decision comes by end of June.\n\nA discharge petition needs 218 House signatures to force a vote. My rep already signed, but many haven't -- yours might be one of them.\n\nA 2-minute phone call makes a real difference. Look up your rep and find a call script at haitiantps.org")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-5 rounded-lg text-sm transition-colors"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                        <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                      </svg>
                      Email a Friend to Call Their Rep
                    </a>
                  </div>
                </>
              ) : (
                <>
                  <p className="mt-2 text-amber-700 font-semibold text-lg">
                    Has NOT signed yet &mdash; your call matters!
                  </p>
                  <CallScript
                    repName={autoDistrict.targeted?.name || `your representative (${autoDistrict.stateAbbr}-${autoDistrict.district})`}
                    phone={autoDistrict.targeted?.phone}
                  />
                </>
              )}

              <p className="mt-3 text-xs text-gray-400">
                Not your district? Use the address lookup below.
              </p>
            </div>
          </section>
        )}

        {/* ──────────────────────────────────────────────── */}
        {/* SECTION 2: Address lookup                        */}
        {/* ──────────────────────────────────────────────── */}
        <section className="max-w-5xl mx-auto px-3 sm:px-4 pt-6 sm:pt-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-1">
              Check a friend&rsquo;s rep
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              Know someone in another district? Enter their ZIP to see if their rep has signed &mdash; and send them the call script if not.
            </p>
            <AddressLookup signerData={signerData} geoData={geoData} targetedReps={targetedReps} onLocationFound={setUserLocation} />
          </div>
        </section>

        {/* ──────────────────────────────────────────────── */}
        {/* SECTION 3: Key districts to call                 */}
        {/* ──────────────────────────────────────────────── */}
        <section className="max-w-5xl mx-auto px-3 sm:px-4 pt-6 sm:pt-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-1">
              Spread the word to your network
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              These are the districts most likely to tip the balance. If you know anyone who lives in one of these areas, forward them the call script &mdash; their rep&rsquo;s call could be the one that gets us to 218.
            </p>
            <TargetedRepList targetedReps={targetedReps} />
          </div>
        </section>

        {/* ──────────────────────────────────────────────── */}
        {/* SECTION 4: Signature map (collapsed by default)  */}
        {/* ──────────────────────────────────────────────── */}
        <section className="max-w-5xl mx-auto px-3 sm:px-4 pt-6 sm:pt-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
            <button
              onClick={() => setShowMap(!showMap)}
              className="w-full flex items-center justify-between"
            >
              <div>
                <h2 className="text-xl font-semibold text-gray-900 text-left">
                  Signature map
                </h2>
                <p className="text-sm text-gray-500 text-left">
                  See which districts have signed and which haven&rsquo;t.
                </p>
              </div>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className={`h-6 w-6 text-gray-400 transition-transform shrink-0 ${showMap ? 'rotate-180' : ''}`}
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
            {showMap && (
              <div className="mt-4">
                <p className="text-sm text-gray-500 mb-4">
                  <span className="inline-block w-3 h-3 rounded-sm bg-green-500 mr-1 align-middle" /> Signed
                  <span className="inline-block w-3 h-3 rounded-sm bg-yellow-400 ml-3 mr-1 align-middle" /> Targeted
                  <span className="inline-block w-3 h-3 rounded-sm bg-gray-300 ml-3 mr-1 align-middle" /> Not targeted
                  &mdash; Click a district for details.
                </p>
                <DistrictMap
                  signerData={signerData}
                  targetedReps={targetedReps}
                  userLocation={userLocation || browserLocation}
                  initialZoom={browserLocation && !userLocation ? 7 : undefined}
                  selectedDistrictKey={selectedDistrict?.key}
                  onDistrictClick={setSelectedDistrict}
                />
                {selectedDistrict && (
                  <div id="district-callout" ref={calloutRef} className="mt-4 border border-gray-200 rounded-lg bg-white p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-semibold text-gray-900 text-lg">
                          {selectedDistrict.signer?.name || selectedDistrict.targeted?.name || `${selectedDistrict.stateAbbr}-${selectedDistrict.district}`}
                          {(selectedDistrict.signer?.party || selectedDistrict.targeted?.party) && (
                            <span className="text-gray-500 font-normal"> ({selectedDistrict.signer?.party || selectedDistrict.targeted?.party})</span>
                          )}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {selectedDistrict.stateAbbr}-{selectedDistrict.district}
                          {selectedDistrict.targeted?.area && ` \u2014 ${selectedDistrict.targeted.area}`}
                        </p>
                        {selectedDistrict.signer && (
                          <p className="mt-1 text-sm font-semibold text-green-600">
                            Signed {selectedDistrict.signer.dateSigned}
                          </p>
                        )}
                        {!selectedDistrict.signer && selectedDistrict.targeted && (
                          <p className="mt-1 text-sm font-semibold text-amber-600">
                            Not yet signed &mdash; call this rep!
                          </p>
                        )}
                        {!selectedDistrict.signer && !selectedDistrict.targeted && (
                          <p className="mt-1 text-sm font-semibold text-gray-500">
                            Not yet signed
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => setSelectedDistrict(null)}
                        className="shrink-0 text-gray-400 hover:text-gray-600"
                        aria-label="Close"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
                    {!selectedDistrict.signer && (
                      <CallScript
                        repName={selectedDistrict.targeted?.name || `your representative (${selectedDistrict.stateAbbr}-${selectedDistrict.district})`}
                        phone={selectedDistrict.targeted?.phone}
                      />
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {/* How It Works */}
        <section className="max-w-5xl mx-auto px-3 sm:px-4 py-6 sm:py-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              How does this work?
            </h2>
            <div className="space-y-4 text-sm text-gray-700 leading-relaxed">
              <div className="flex gap-3">
                <span className="shrink-0 w-7 h-7 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs">1</span>
                <div>
                  <h3 className="font-semibold text-gray-900">
                    <a href="https://www.uscis.gov/humanitarian/temporary-protected-status" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                      Temporary Protected Status (TPS)
                    </a>
                  </h3>
                  <p>A humanitarian protection for people from countries experiencing armed conflict, natural disasters, or other extraordinary conditions. It allows people already in the U.S. to live and work legally for a limited time &mdash; it does not provide permanent residency or citizenship. Over 350,000 Haitians currently live under TPS.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <span className="shrink-0 w-7 h-7 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs">2</span>
                <div>
                  <h3 className="font-semibold text-gray-900">
                    <a href="https://www.congress.gov/bill/119th-congress/house-bill/1689" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                      H.R. 1689
                    </a>
                    {' '}&mdash; The Bill
                  </h3>
                  <p>The actual legislation that would require the Secretary of Homeland Security to designate Haiti for TPS. If it passes the House, passes the Senate, and is signed by the President, it becomes law.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <span className="shrink-0 w-7 h-7 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs">3</span>
                <div>
                  <h3 className="font-semibold text-gray-900">
                    <a href="https://www.congress.gov/bill/119th-congress/house-resolution/965" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                      H.Res. 965
                    </a>
                    {' '}&mdash; The Resolution
                  </h3>
                  <p>A procedural resolution that sets the rules for debating H.R. 1689. It doesn&rsquo;t grant TPS itself &mdash; it clears the way for the House to vote on the bill that would.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <span className="shrink-0 w-7 h-7 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs">4</span>
                <div>
                  <h3 className="font-semibold text-gray-900">
                    <a href="https://clerk.house.gov/DischargePetition/2026012215" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                      The Discharge Petition
                    </a>
                    {' '}&mdash; Why We Need 218 Signatures
                  </h3>
                  <p>A procedural tool to force H.Res. 965 out of committee and onto the House floor. Once 218 members sign, the House votes on the resolution, and if it passes, immediately proceeds to debate and vote on H.R. 1689.</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-gray-800 text-gray-300 py-6">
        <div className="max-w-5xl mx-auto px-3 sm:px-4 text-sm">
          <p className="text-gray-500">
            Signer data from the{' '}
            <a href="https://clerk.house.gov/DischargePetition" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline">
              Office of the Clerk
            </a>.
            Phone numbers from the{' '}
            <a href="https://www.house.gov/representatives" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline">
              House Member Directory
            </a>.
          </p>
        </div>
      </footer>
    </>
  );
}
