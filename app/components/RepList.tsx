'use client';

import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import booleanIntersects from '@turf/boolean-intersects';
import { point } from '@turf/helpers';
import type { FeatureCollection, Feature, MultiPolygon, Polygon, GeoJsonProperties } from 'geojson';
import { FIPS_TO_STATE } from './fips';
import TargetedRepCard from './TargetedRepCard';

interface Signer {
  name: string;
  stateDistrict: string;
  dateSigned: string;
}

interface SignerData {
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

interface DistrictProperties {
  STATEFP: string;
  CD118FP: string;
  [key: string]: unknown;
}

interface RepListProps {
  allReps: HouseRep[];
  signerData: SignerData;
  geoData: FeatureCollection | null;
  onLocationFound?: (location: { lat: number; lng: number }) => void;
  onSearchOverlay?: (geojson: GeoJSON.GeoJsonObject | null) => void;
  onResultsFound?: () => void;
  highlightedDistrict?: string | null;
  callScriptTemplate?: string;
  emailTemplate?: string;
}

// Sample offsets (~2mi grid) for point-based fallback
const SAMPLE_OFFSETS = [
  [0, 0],
  [0.025, 0], [-0.025, 0], [0, 0.025], [0, -0.025],
  [0.025, 0.025], [-0.025, 0.025], [0.025, -0.025], [-0.025, -0.025],
  [0.05, 0], [-0.05, 0], [0, 0.05], [0, -0.05],
];

export default function RepList({ allReps, signerData, geoData, onLocationFound, onSearchOverlay, onResultsFound, highlightedDistrict, callScriptTemplate, emailTemplate }: RepListProps) {
  const [query, setQuery] = useState('');
  const [geocodeLoading, setGeocodeLoading] = useState(false);
  const [geocodeError, setGeocodeError] = useState('');
  const [geocodeDisplayName, setGeocodeDisplayName] = useState('');
  const [geocodeMatchedDistricts, setGeocodeMatchedDistricts] = useState<Set<string> | null>(null);
  const [isAtTop, setIsAtTop] = useState(true);
  const [isAtBottom, setIsAtBottom] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  const signerByDistrict = useMemo(
    () => new Map(signerData.signers.map((s) => [s.stateDistrict, s])),
    [signerData.signers]
  );

  const repByDistrict = useMemo(
    () => new Map(allReps.map((r) => [r.stateDistrict, r])),
    [allReps]
  );

  const findDistrictsByPolygon = useCallback(
    (geojson: Feature<Polygon | MultiPolygon, GeoJsonProperties>): Set<string> => {
      if (!geoData) return new Set();
      const matched = new Set<string>();
      for (const feature of geoData.features) {
        const f = feature as Feature<Polygon | MultiPolygon, DistrictProperties>;
        try {
          if (booleanIntersects(geojson, f)) {
            const stateAbbr = FIPS_TO_STATE[f.properties.STATEFP] || f.properties.STATEFP;
            const district = f.properties.CD118FP;
            matched.add(`${stateAbbr}${district}`);
          }
        } catch {
          // skip features that fail intersection check
        }
      }
      return matched;
    },
    [geoData]
  );

  const findDistrictsByPoint = useCallback(
    (lat: number, lng: number): Set<string> => {
      if (!geoData) return new Set();
      const matched = new Set<string>();
      for (const [dlat, dlng] of SAMPLE_OFFSETS) {
        const pt = point([lng + dlng, lat + dlat]);
        for (const feature of geoData.features) {
          const f = feature as Feature<Polygon | MultiPolygon, DistrictProperties>;
          if (booleanPointInPolygon(pt, f)) {
            const stateAbbr = FIPS_TO_STATE[f.properties.STATEFP] || f.properties.STATEFP;
            const district = f.properties.CD118FP;
            matched.add(`${stateAbbr}${district}`);
            break;
          }
        }
      }
      return matched;
    },
    [geoData]
  );

  // Determine which reps to show — only geocode results
  const displayReps = useMemo(() => {
    if (!geocodeMatchedDistricts) return [];
    const reps = allReps.filter(r => geocodeMatchedDistricts.has(r.stateDistrict));

    // Sort: targeted first, then unsigned, then signed
    return [...reps].sort((a, b) => {
      const aSigned = !!signerByDistrict.get(a.stateDistrict);
      const bSigned = !!signerByDistrict.get(b.stateDistrict);
      const aScore = a.targeted && !aSigned ? 0 : !aSigned ? 1 : 2;
      const bScore = b.targeted && !bSigned ? 0 : !bSigned ? 1 : 2;
      if (aScore !== bScore) return aScore - bScore;
      return a.name.localeCompare(b.name);
    });
  }, [geocodeMatchedDistricts, allReps, signerByDistrict]);

  const handleGeocode = async () => {
    const q = query.trim();
    if (!q) return;

    setGeocodeLoading(true);
    setGeocodeError('');
    setGeocodeDisplayName('');
    setGeocodeMatchedDistricts(null);
    onSearchOverlay?.(null);

    try {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setGeocodeError(data.error || 'Location not found. Try a city name, ZIP code, or state.');
        return;
      }

      const data = await res.json();
      setGeocodeDisplayName(data.displayName);
      onLocationFound?.({ lat: data.lat, lng: data.lng });

      let matched: Set<string>;
      if (data.geojson && (data.geojson.type === 'Polygon' || data.geojson.type === 'MultiPolygon')) {
        const geoFeature: Feature<Polygon | MultiPolygon, GeoJsonProperties> = {
          type: 'Feature',
          properties: {},
          geometry: data.geojson,
        };
        matched = findDistrictsByPolygon(geoFeature);
      } else {
        matched = findDistrictsByPoint(data.lat, data.lng);
      }

      if (matched.size === 0) {
        setGeocodeError('Could not determine congressional district(s) for this location.');
        return;
      }

      setGeocodeMatchedDistricts(matched);
      onResultsFound?.();

      // Send the geocoded boundary to the map overlay
      if (data.geojson) {
        onSearchOverlay?.({
          type: 'Feature',
          properties: {},
          geometry: data.geojson,
        } as GeoJSON.GeoJsonObject);
      }
    } catch {
      setGeocodeError('Something went wrong. Please try again.');
    } finally {
      setGeocodeLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleGeocode();
  };

  const clearGeocode = () => {
    setGeocodeMatchedDistricts(null);
    setGeocodeDisplayName('');
    setGeocodeError('');
    onSearchOverlay?.(null);
  };

  const handleQueryChange = (value: string) => {
    setQuery(value);
    // Clear geocode results when user changes the query
    if (geocodeMatchedDistricts) {
      clearGeocode();
    }
  };

  const handleScroll = () => {
    if (!listRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = listRef.current;
    setIsAtTop(scrollTop <= 10);
    setIsAtBottom(scrollTop + clientHeight >= scrollHeight - 10);
  };

  useEffect(() => {
    if (!highlightedDistrict || !listRef.current) return;
    const el = listRef.current.querySelector(`[data-district="${highlightedDistrict}"]`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [highlightedDistrict]);

  const scrollUp = () => {
    listRef.current?.scrollBy({ top: -200, behavior: 'smooth' });
  };

  const scrollDown = () => {
    listRef.current?.scrollBy({ top: 200, behavior: 'smooth' });
  };

  const showingGeocode = !!geocodeMatchedDistricts;

  return (
    <div>
      {/* Search input */}
      <form onSubmit={handleSubmit} className="flex gap-3 mb-3">
        <div className="flex-1">
          <label htmlFor="rep-search" className="sr-only">Search</label>
          <input
            id="rep-search"
            type="text"
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            placeholder="City, ZIP, or region (e.g. Tucson, 32801, Miami)"
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-ring focus:border-ring text-gray-900 text-lg shadow-sm"
          />
        </div>
        <button
          type="submit"
          disabled={geocodeLoading || !geoData || !query.trim()}
          className="bg-gradient-to-r from-action to-action-end hover:from-action-dark hover:to-action-end-dark disabled:from-gray-300 disabled:to-gray-300 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-sm hover:shadow-md shrink-0"
        >
          {geocodeLoading ? 'Searching...' : !geoData ? 'Loading...' : 'Search'}
        </button>
      </form>

      {/* Geocode result label */}
      {geocodeDisplayName && showingGeocode && (
        <div className="flex items-center gap-2 mb-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-2.5">
          <p className="text-sm text-blue-800 flex-1">
            Showing {displayReps.length} rep{displayReps.length !== 1 ? 's' : ''} for: <strong>{geocodeDisplayName}</strong>
          </p>
          <button
            onClick={clearGeocode}
            className="text-blue-500 hover:text-blue-700 text-sm font-medium shrink-0"
          >
            Clear
          </button>
        </div>
      )}

      {/* Error */}
      {geocodeError && (
        <div className="mb-3 bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
          {geocodeError}
        </div>
      )}

      {/* Rep list */}
      {displayReps.length === 0 ? (
        showingGeocode ? (
          <p className="text-gray-500 text-sm text-center py-4">
            No representatives found.
          </p>
        ) : null
      ) : (
        <div className="relative">
          {!isAtTop && displayReps.length > 8 && (
            <button
              onClick={scrollUp}
              className="absolute top-0 left-0 right-0 z-10 flex items-center justify-center py-2 bg-gradient-to-b from-white via-white/95 to-transparent cursor-pointer"
              aria-label="Scroll up for more"
            >
              <span className="flex items-center gap-1 text-sm text-gray-500 font-medium animate-bounce">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 rotate-180" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
                More reps above
              </span>
            </button>
          )}
          <div
            ref={listRef}
            onScroll={handleScroll}
            className="space-y-2 max-h-[32rem] overflow-y-auto px-1 py-0.5"
          >
            {displayReps.map(rep => {
              const signer = signerByDistrict.get(rep.stateDistrict);
              const isHighlighted = rep.stateDistrict === highlightedDistrict;
              return (
                <div key={rep.stateDistrict} data-district={rep.stateDistrict} className={isHighlighted ? 'ring-2 ring-blue-400 rounded-xl' : ''}>
                  <TargetedRepCard
                    name={rep.name}
                    party={rep.party}
                    area={rep.area}
                    stateDistrict={rep.stateDistrict}
                    phone={rep.phone}
                    signed={!!signer}
                    dateSigned={signer?.dateSigned}
                    targeted={rep.targeted}
                    callScriptTemplate={callScriptTemplate}
                    emailTemplate={emailTemplate}
                    emailOnly
                  />
                </div>
              );
            })}
          </div>
          {!isAtBottom && displayReps.length > 8 && (
            <button
              onClick={scrollDown}
              className="absolute bottom-0 left-0 right-0 flex items-center justify-center py-2 bg-gradient-to-t from-white via-white/95 to-transparent cursor-pointer"
              aria-label="Scroll for more"
            >
              <span className="flex items-center gap-1 text-sm text-gray-500 font-medium animate-bounce">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
                More reps below
              </span>
            </button>
          )}
        </div>
      )}
      {displayReps.length > 0 && (
        <p className="text-xs text-gray-400 mt-3 text-center">
          {displayReps.length} representative{displayReps.length !== 1 ? 's' : ''} found
        </p>
      )}
    </div>
  );
}
