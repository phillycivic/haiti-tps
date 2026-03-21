'use client';

import { useState, useCallback } from 'react';
import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import { point } from '@turf/helpers';
import type { FeatureCollection, Feature, MultiPolygon, Polygon } from 'geojson';
import { FIPS_TO_STATE } from './fips';
import CallScript from './CallScript';

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
  signers: Signer[];
}

interface DistrictProperties {
  STATEFP: string;
  CD118FP: string;
  GEOID: string;
  NAMELSAD: string;
  [key: string]: unknown;
}

interface TargetedRep {
  name: string;
  party: string;
  stateDistrict: string;
  phone: string;
  area: string;
  searchTerms: string;
}

interface DistrictResult {
  key: string;
  stateAbbr: string;
  district: string;
  signer?: Signer;
  targeted?: TargetedRep;
}

interface AddressLookupProps {
  signerData: SignerData;
  geoData: FeatureCollection | null;
  targetedReps?: TargetedRep[];
  onLocationFound?: (location: { lat: number; lng: number }) => void;
  onSwitchToNetwork?: () => void;
  callScriptTemplate?: string;
  emailTemplate?: string;
}

// Sample offsets (~2mi grid) to catch ZIPs that span multiple districts
const SAMPLE_OFFSETS = [
  [0, 0],
  [0.025, 0], [-0.025, 0], [0, 0.025], [0, -0.025],
  [0.025, 0.025], [-0.025, 0.025], [0.025, -0.025], [-0.025, -0.025],
  [0.05, 0], [-0.05, 0], [0, 0.05], [0, -0.05],
];

export default function AddressLookup({ signerData, geoData, targetedReps, onLocationFound, onSwitchToNetwork, callScriptTemplate, emailTemplate }: AddressLookupProps) {
  const [zip, setZip] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState<DistrictResult[]>([]);

  const signerByDistrict = new Map(
    signerData.signers.map((s) => [s.stateDistrict, s])
  );

  const targetedByDistrict = new Map(
    (targetedReps || []).map((t) => [t.stateDistrict, t])
  );

  const findDistrictsNear = useCallback(
    (lat: number, lng: number): DistrictResult[] => {
      if (!geoData) return [];
      const found = new Map<string, DistrictResult>();

      for (const [dlat, dlng] of SAMPLE_OFFSETS) {
        const pt = point([lng + dlng, lat + dlat]);
        for (const feature of geoData.features) {
          const f = feature as Feature<Polygon | MultiPolygon, DistrictProperties>;
          if (booleanPointInPolygon(pt, f)) {
            const stateAbbr = FIPS_TO_STATE[f.properties.STATEFP] || f.properties.STATEFP;
            const district = f.properties.CD118FP;
            const key = `${stateAbbr}${district}`;
            if (!found.has(key)) {
              found.set(key, {
                key,
                stateAbbr,
                district,
                signer: signerByDistrict.get(key),
                targeted: targetedByDistrict.get(key),
              });
            }
            break; // this point matched, move to next offset
          }
        }
      }

      return Array.from(found.values());
    },
    [geoData, signerByDistrict, targetedByDistrict]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResults([]);

    try {
      const res = await fetch(`https://api.zippopotam.us/us/${zip}`);
      if (!res.ok) {
        setError('ZIP code not found. Please check and try again.');
        return;
      }
      const data = await res.json();
      const place = data.places?.[0];
      if (!place) {
        setError('ZIP code not found. Please check and try again.');
        return;
      }

      const lat = parseFloat(place.latitude);
      const lng = parseFloat(place.longitude);
      onLocationFound?.({ lat, lng });

      const districts = findDistrictsNear(lat, lng);
      if (districts.length === 0) {
        setError('Could not determine congressional district for this ZIP code.');
        return;
      }

      setResults(districts);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit} className="flex gap-3">
        <div className="flex-1">
          <label htmlFor="zip" className="sr-only">ZIP Code</label>
          <input
            id="zip"
            type="text"
            inputMode="numeric"
            value={zip}
            onChange={(e) => setZip(e.target.value.replace(/\D/g, '').slice(0, 5))}
            placeholder="Enter your ZIP code"
            required
            pattern="[0-9]{5}"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 text-lg"
          />
        </div>
        <button
          type="submit"
          disabled={loading || !geoData || zip.length !== 5}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold py-3 px-6 rounded-lg transition-colors shrink-0"
        >
          {loading ? 'Looking up...' : !geoData ? 'Loading...' : 'Find My Rep'}
        </button>
      </form>

      {error && (
        <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
          {error}
        </div>
      )}

      {results.length > 0 && (
        <div className="mt-4 space-y-3">
          {results.length > 1 && (
            <p className="text-sm text-gray-500">
              This ZIP code spans {results.length} congressional districts:
            </p>
          )}
          {results.map((r) => {
            const repName = r.signer?.name || r.targeted?.name;
            const repParty = r.signer?.party || r.targeted?.party;

            return (
              <div
                key={r.key}
                className={`rounded-lg border p-4 ${
                  r.signer
                    ? 'bg-green-50 border-green-200'
                    : 'bg-amber-50 border-amber-200'
                }`}
              >
                <h3 className="font-bold text-gray-900 text-lg">
                  {repName || `${r.stateAbbr}-${r.district}`}
                  {repParty && (
                    <span className="text-gray-500 font-normal"> ({repParty})</span>
                  )}
                </h3>
                <p className="text-sm text-gray-500">
                  {r.stateAbbr}-{r.district}
                  {r.targeted?.area && ` \u2014 ${r.targeted.area}`}
                </p>

                {r.signer ? (
                  <>
                    <p className="mt-1 text-green-700 font-semibold text-sm">
                      Signed the petition on {r.signer.dateSigned}
                    </p>
                    {onSwitchToNetwork && (
                      <div className="mt-3 bg-white/70 rounded-lg p-3 border border-green-200">
                        <p className="text-sm text-gray-700 font-medium">
                          Awesome — your representative has already signed. Reach out to your network to see if their reps have too!
                        </p>
                        <button
                          onClick={onSwitchToNetwork}
                          className="mt-2 inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg text-sm transition-colors"
                        >
                          Reach Out to Your Network &rarr;
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <p className="mt-1 text-amber-700 font-semibold">
                      Has NOT signed yet &mdash; your call matters!
                    </p>
                    <CallScript
                      repName={r.targeted?.name || `your representative (${r.stateAbbr}-${r.district})`}
                      zip={zip}
                      phone={r.targeted?.phone}
                      callScriptTemplate={callScriptTemplate}
                      emailTemplate={emailTemplate}
                    />
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
