'use client';

import { useState, useCallback } from 'react';
import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import { point } from '@turf/helpers';
import type { FeatureCollection, Feature, Geometry, MultiPolygon, Polygon } from 'geojson';
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

interface LookupResult {
  type: 'signed' | 'not_signed' | 'not_found';
  signer?: Signer;
  stateAbbr?: string;
  district?: string;
}

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','DC','FL','GA','HI','ID','IL','IN',
  'IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH',
  'NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT',
  'VT','VA','WA','WV','WI','WY',
];

interface TargetedRep {
  name: string;
  stateDistrict: string;
  phone: string;
  area: string;
  searchTerms: string;
}

interface AddressLookupProps {
  signerData: SignerData;
  geoData: FeatureCollection | null;
  targetedReps?: TargetedRep[];
  onLocationFound?: (location: { lat: number; lng: number }) => void;
}

export default function AddressLookup({ signerData, geoData, targetedReps, onLocationFound }: AddressLookupProps) {
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zip, setZip] = useState('');
  const [loading, setLoading] = useState(false);
  const [zipLoading, setZipLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<LookupResult | null>(null);

  const handleZipChange = useCallback(async (value: string) => {
    setZip(value);
    if (value.length === 5 && /^\d{5}$/.test(value)) {
      setZipLoading(true);
      try {
        const res = await fetch(`https://api.zippopotam.us/us/${value}`);
        if (res.ok) {
          const data = await res.json();
          const place = data.places?.[0];
          if (place) {
            setCity(place['place name'] || '');
            setState(place['state abbreviation'] || '');
          }
        }
      } catch {
        // Zip lookup failed silently — user can still fill in manually
      } finally {
        setZipLoading(false);
      }
    }
  }, []);

  const signerByDistrict = new Map(
    signerData.signers.map((s) => [s.stateDistrict, s])
  );

  const targetedByDistrict = new Map(
    (targetedReps || []).map((t) => [t.stateDistrict, t])
  );

  const findDistrict = useCallback(
    (lat: number, lng: number): { stateAbbr: string; district: string } | null => {
      if (!geoData) return null;

      const pt = point([lng, lat]);
      for (const feature of geoData.features) {
        const f = feature as Feature<Polygon | MultiPolygon, DistrictProperties>;
        if (booleanPointInPolygon(pt, f)) {
          const stateAbbr = FIPS_TO_STATE[f.properties.STATEFP] || f.properties.STATEFP;
          return { stateAbbr, district: f.properties.CD118FP };
        }
      }
      return null;
    },
    [geoData]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const params = new URLSearchParams({ street, city, state, zip });
      const res = await fetch(`/api/geocode?${params}`);
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to look up address');
        return;
      }

      onLocationFound?.({ lat: data.lat, lng: data.lng });

      const district = findDistrict(data.lat, data.lng);
      if (!district) {
        setError('Could not determine your congressional district. Please try again.');
        return;
      }

      const key = `${district.stateAbbr}${district.district}`;
      const signer = signerByDistrict.get(key);

      if (signer) {
        setResult({ type: 'signed', signer, stateAbbr: district.stateAbbr, district: district.district });
      } else {
        setResult({ type: 'not_signed', stateAbbr: district.stateAbbr, district: district.district });
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label htmlFor="zip" className="block text-sm font-medium text-gray-700 mb-1">
              ZIP Code
            </label>
            <input
              id="zip"
              type="text"
              inputMode="numeric"
              value={zip}
              onChange={(e) => handleZipChange(e.target.value)}
              placeholder="12345"
              required
              pattern="[0-9]{5}"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
            />
          </div>
          <div>
            <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">
              City {zipLoading && <span className="text-gray-400 text-xs">(loading...)</span>}
            </label>
            <input
              id="city"
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="City"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
            />
          </div>
          <div>
            <label htmlFor="state" className="block text-sm font-medium text-gray-700 mb-1">
              State
            </label>
            <select
              id="state"
              value={state}
              onChange={(e) => setState(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
            >
              <option value="">--</option>
              {US_STATES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label htmlFor="street" className="block text-sm font-medium text-gray-700 mb-1">
            Street Address
          </label>
          <input
            id="street"
            type="text"
            value={street}
            onChange={(e) => setStreet(e.target.value)}
            placeholder="123 Main St"
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
          />
        </div>
        <button
          type="submit"
          disabled={loading || !geoData}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
        >
          {loading ? 'Looking up...' : !geoData ? 'Loading district data...' : 'Find My Rep'}
        </button>
      </form>

      {error && (
        <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
          {error}
        </div>
      )}

      {result?.type === 'signed' && result.signer && (
        <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="text-3xl">&#10003;</div>
            <div>
              <h3 className="font-semibold text-green-800 text-lg">
                {result.signer.name} has signed!
              </h3>
              <p className="text-green-700 text-sm mt-1">
                Your representative ({result.stateAbbr}-{result.district}, {result.signer.party}) signed the discharge petition on {result.signer.dateSigned}.
              </p>
              <p className="text-green-700 text-sm mt-2 font-medium">
                Share this page to help reach 218 signatures.
              </p>
            </div>
          </div>
        </div>
      )}

      {result?.type === 'not_signed' && (() => {
        const districtKey = `${result.stateAbbr}${result.district}`;
        const targeted = targetedByDistrict.get(districtKey);
        const repName = targeted?.name || `the representative for ${result.stateAbbr}-${result.district}`;
        return (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="text-3xl text-red-600">!</div>
              <div>
                <h3 className="font-semibold text-red-800 text-lg">
                  {targeted ? `${targeted.name}` : `Your rep`} ({result.stateAbbr}-{result.district}) has NOT signed yet
                </h3>
                <p className="text-red-700 text-sm mt-1">
                  {targeted
                    ? `Call ${targeted.name} directly and urge them to sign. Use the script below.`
                    : 'Call the House Switchboard and ask to be connected to your representative. Use the script below.'}
                </p>
              </div>
            </div>
            <CallScript
              repName={repName}
              city={city}
              state={state}
              zip={zip}
              phone={targeted?.phone}
            />
          </div>
        );
      })()}
    </div>
  );
}
