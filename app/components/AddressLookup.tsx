'use client';

import { useState, useCallback } from 'react';
import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import booleanIntersects from '@turf/boolean-intersects';
import { point } from '@turf/helpers';
import type { FeatureCollection, Feature, MultiPolygon, Polygon, GeoJsonProperties } from 'geojson';
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

// Sample offsets (~2mi grid) to catch locations that span multiple districts
const SAMPLE_OFFSETS = [
  [0, 0],
  [0.025, 0], [-0.025, 0], [0, 0.025], [0, -0.025],
  [0.025, 0.025], [-0.025, 0.025], [0.025, -0.025], [-0.025, -0.025],
  [0.05, 0], [-0.05, 0], [0, 0.05], [0, -0.05],
];

export default function AddressLookup({ signerData, geoData, targetedReps, onLocationFound, onSwitchToNetwork, callScriptTemplate, emailTemplate }: AddressLookupProps) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState<DistrictResult[]>([]);
  const [displayName, setDisplayName] = useState('');
  const [resolvedCity, setResolvedCity] = useState('');
  const [resolvedState, setResolvedState] = useState('');

  const signerByDistrict = new Map(
    signerData.signers.map((s) => [s.stateDistrict, s])
  );

  const targetedByDistrict = new Map(
    (targetedReps || []).map((t) => [t.stateDistrict, t])
  );

  const findDistrictsByPoint = useCallback(
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
            break;
          }
        }
      }

      return Array.from(found.values());
    },
    [geoData, signerByDistrict, targetedByDistrict]
  );

  const findDistrictsByPolygon = useCallback(
    (geojson: Feature<Polygon | MultiPolygon, GeoJsonProperties>): DistrictResult[] => {
      if (!geoData) return [];
      const found = new Map<string, DistrictResult>();

      for (const feature of geoData.features) {
        const f = feature as Feature<Polygon | MultiPolygon, DistrictProperties>;
        try {
          if (booleanIntersects(geojson, f)) {
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
          }
        } catch {
          // skip features that fail intersection check
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
    setDisplayName('');
    setResolvedCity('');
    setResolvedState('');

    try {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(query.trim())}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Location not found. Try a city name, ZIP code, or state.');
        return;
      }

      const data = await res.json();
      setDisplayName(data.displayName);
      setResolvedCity(data.city);
      setResolvedState(data.state);
      onLocationFound?.({ lat: data.lat, lng: data.lng });

      let districts: DistrictResult[];
      if (data.geojson && (data.geojson.type === 'Polygon' || data.geojson.type === 'MultiPolygon')) {
        const geoFeature: Feature<Polygon | MultiPolygon, GeoJsonProperties> = {
          type: 'Feature',
          properties: {},
          geometry: data.geojson,
        };
        districts = findDistrictsByPolygon(geoFeature);
      } else {
        districts = findDistrictsByPoint(data.lat, data.lng);
      }

      if (districts.length === 0) {
        setError('Could not determine congressional district for this location.');
        return;
      }

      setResults(districts);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const isZip = /^\d{5}$/.test(query.trim());

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit} className="flex gap-3">
        <div className="flex-1">
          <label htmlFor="location" className="sr-only">Location</label>
          <input
            id="location"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="City, ZIP, or region (e.g. Tucson, 32801)"
            required
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-ring focus:border-ring text-gray-900 text-lg shadow-sm"
          />
        </div>
        <button
          type="submit"
          disabled={loading || !geoData || !query.trim()}
          className="bg-gradient-to-r from-action to-action-end hover:from-action-dark hover:to-action-end-dark disabled:from-gray-300 disabled:to-gray-300 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-sm hover:shadow-md shrink-0"
        >
          {loading ? 'Looking up...' : !geoData ? 'Loading...' : 'Find My Rep'}
        </button>
      </form>

      {error && (
        <div className="mt-4 bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
          {error}
        </div>
      )}

      {displayName && results.length > 0 && (
        <p className="mt-3 text-sm text-gray-500">
          Results for: <strong>{displayName}</strong>
        </p>
      )}

      {results.length > 0 && (
        <div className="mt-4 space-y-3">
          {results.length > 1 && (
            <p className="text-sm text-gray-500">
              This location spans {results.length} congressional districts:
            </p>
          )}
          {results.map((r) => {
            const repName = r.signer?.name || r.targeted?.name;
            const repParty = r.signer?.party || r.targeted?.party;

            return (
              <div
                key={r.key}
                className={`rounded-xl border p-5 shadow-sm ${
                  r.signer
                    ? 'bg-emerald-50 border-emerald-200'
                    : 'bg-amber-50 border-amber-300'
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
                    <p className="mt-1 text-emerald-700 font-semibold text-sm">
                      Signed the petition on {r.signer.dateSigned}
                    </p>
                    {onSwitchToNetwork && (
                      <div className="mt-3 bg-white/80 rounded-xl p-3 border border-emerald-200">
                        <p className="text-sm text-gray-700 font-medium">
                          Awesome — your representative has already signed. Reach out to your network to see if their reps have too!
                        </p>
                        <button
                          onClick={onSwitchToNetwork}
                          className="mt-2 inline-flex items-center gap-2 bg-gradient-to-r from-action to-action-end hover:from-action-dark hover:to-action-end-dark text-white font-semibold py-2 px-4 rounded-xl text-sm transition-all shadow-sm"
                        >
                          Reach Out to Your Network &rarr;
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <p className="mt-1 text-orange-700 font-bold">
                      Has NOT signed yet &mdash; your call matters!
                    </p>
                    <CallScript
                      repName={r.targeted?.name || `your representative (${r.stateAbbr}-${r.district})`}
                      city={resolvedCity}
                      state={resolvedState}
                      zip={isZip ? query.trim() : undefined}
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
