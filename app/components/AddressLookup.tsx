'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import booleanIntersects from '@turf/boolean-intersects';
import { point } from '@turf/helpers';
import type { FeatureCollection, Feature, MultiPolygon, Polygon, GeoJsonProperties } from 'geojson';
import { FIPS_TO_STATE } from './fips';
import TargetedRepCard from './TargetedRepCard';

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
  onLocationFound?: (location: { lat: number; lng: number; geojson?: object | null }) => void;
  onSwitchToNetwork?: () => void;
  highlightedDistrict?: string | null;
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

export default function AddressLookup({ signerData, geoData, targetedReps, onLocationFound, onSwitchToNetwork, highlightedDistrict, callScriptTemplate, emailTemplate }: AddressLookupProps) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState<DistrictResult[]>([]);
  const [displayName, setDisplayName] = useState('');
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!highlightedDistrict || !listRef.current) return;
    const el = listRef.current.querySelector(`[data-district="${highlightedDistrict}"]`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [highlightedDistrict]);

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
    const zip = query.trim();
    if (!/^\d{5}$/.test(zip)) {
      setError('Please enter a valid 5-digit ZIP code.');
      return;
    }
    setLoading(true);
    setError('');
    setResults([]);
    setDisplayName('');

    try {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(zip)}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'ZIP code not found. Please check and try again.');
        return;
      }

      const data = await res.json();
      setDisplayName(data.displayName);
      onLocationFound?.({ lat: data.lat, lng: data.lng, geojson: data.geojson ?? null });

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


  return (
    <div className="w-full">
      <form onSubmit={handleSubmit} className="flex gap-3">
        <div className="flex-1">
          <label htmlFor="location" className="sr-only">Location</label>
          <input
            id="location"
            type="text"
            inputMode="numeric"
            maxLength={5}
            value={query}
            onChange={(e) => setQuery(e.target.value.replace(/\D/g, ''))}
            placeholder="Enter your ZIP code"
            required
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-ring focus:border-ring text-gray-900 text-lg shadow-sm"
          />
        </div>
        <button
          type="submit"
          disabled={loading || !geoData || !/^\d{5}$/.test(query.trim())}
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
        <div className="mt-4 space-y-2" ref={listRef}>
          {results.length > 1 && (
            <p className="text-sm text-gray-500 mb-1">
              This ZIP spans {results.length} congressional districts:
            </p>
          )}
          {results.map((r) => (
            <div key={r.key} data-district={r.key} className={r.key === highlightedDistrict ? 'ring-2 ring-blue-400 rounded-xl' : ''}>
              <TargetedRepCard
                name={r.signer?.name || r.targeted?.name || `${r.stateAbbr}-${r.district}`}
                party={r.signer?.party || r.targeted?.party || ''}
                area={r.targeted?.area || ''}
                stateDistrict={r.key}
                phone={r.targeted?.phone || ''}
                signed={!!r.signer}
                dateSigned={r.signer?.dateSigned}
                targeted={!!r.targeted && !r.signer}
                callScriptTemplate={callScriptTemplate}
                emailTemplate={emailTemplate}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
