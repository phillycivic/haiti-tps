'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import type { FeatureCollection } from 'geojson';
import ProgressBar from './ProgressBar';
import AddressLookup from './AddressLookup';
import TargetedRepList from './TargetedRepList';

const Map = dynamic(() => import('./Map'), { ssr: false });

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
  const [activeTab, setActiveTab] = useState<'map' | 'address' | 'search'>('map');
  const [browserLocation, setBrowserLocation] = useState<{ lat: number; lng: number } | null>(null);

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

  return (
    <>
      {/* Header */}
      <header className="bg-blue-700 text-white">
        <div className="max-w-5xl mx-auto px-4 py-8 sm:py-12">
          <h1 className="text-3xl sm:text-4xl font-bold leading-tight">
            Protect TPS for 350,000 Haitians
          </h1>
          <p className="mt-3 text-blue-100 text-lg max-w-2xl">
            A discharge petition (H.Res. 965) needs 218 House signatures to force a vote
            on H.R. 1689, which would extend Temporary Protected Status for Haiti.
            Look up your rep and make the call.
          </p>
          <div className="mt-6">
            <ProgressBar current={signerData.totalSignatures} needed={signerData.needed} />
          </div>
        </div>
      </header>

      <main className="flex-1 bg-gray-50">
        {/* Address Lookup / Rep Search Section */}
        <section className="max-w-5xl mx-auto px-3 sm:px-4 py-6 sm:py-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Has your representative signed?
            </h2>
            <div role="tablist" className="grid grid-cols-3 border-b border-gray-200 mb-6">
              <button
                role="tab"
                aria-selected={activeTab === 'map'}
                onClick={() => setActiveTab('map')}
                className={`px-2 sm:px-4 py-2.5 text-xs sm:text-sm font-medium border-b-2 transition-colors text-center ${
                  activeTab === 'map'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Signature map
              </button>
              <button
                role="tab"
                aria-selected={activeTab === 'address'}
                onClick={() => setActiveTab('address')}
                className={`px-2 sm:px-4 py-2.5 text-xs sm:text-sm font-medium border-b-2 transition-colors text-center ${
                  activeTab === 'address'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Check your rep
              </button>
              <button
                role="tab"
                aria-selected={activeTab === 'search'}
                onClick={() => setActiveTab('search')}
                className={`px-2 sm:px-4 py-2.5 text-xs sm:text-sm font-medium border-b-2 transition-colors text-center ${
                  activeTab === 'search'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Key districts
              </button>
            </div>
            <div role="tabpanel">
              {activeTab === 'address' && (
                <AddressLookup signerData={signerData} geoData={geoData} targetedReps={targetedReps} onLocationFound={setUserLocation} />
              )}
              {activeTab === 'search' && (
                <TargetedRepList targetedReps={targetedReps} />
              )}
              {activeTab === 'map' && (
                <>
                  <p className="text-sm text-gray-500 mb-4">
                    <span className="inline-block w-3 h-3 rounded-sm bg-green-500 mr-1 align-middle" /> Signed
                    <span className="inline-block w-3 h-3 rounded-sm bg-yellow-400 ml-3 mr-1 align-middle" /> Targeted
                    <span className="inline-block w-3 h-3 rounded-sm bg-gray-300 ml-3 mr-1 align-middle" /> Not targeted
                    &mdash; Click a district for details.
                  </p>
                  <Map signerData={signerData} targetedReps={targetedReps} userLocation={userLocation || browserLocation} initialZoom={browserLocation && !userLocation ? 7 : undefined} />
                </>
              )}
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="max-w-5xl mx-auto px-3 sm:px-4 pb-6 sm:pb-8">
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
