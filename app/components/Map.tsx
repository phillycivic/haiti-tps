'use client';

import { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, GeoJSON, Marker, Popup, ZoomControl, useMap } from 'react-leaflet';
import type { FeatureCollection, Feature, Geometry } from 'geojson';
import type { Layer, PathOptions, Map as LeafletMap } from 'leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { FIPS_TO_STATE } from './fips';

interface Signer {
  name: string;
  stateAbbr: string;
  district: string;
  stateDistrict: string;
  party: string;
  dateSigned: string;
}

interface SignerData {
  totalSignatures: number;
  needed: number;
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
}

function FlyToLocation({ lat, lng, zoom = 9 }: { lat: number; lng: number; zoom?: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo([lat, lng], zoom, { duration: 1.5 });
  }, [map, lat, lng, zoom]);
  return null;
}

const userIcon = L.divIcon({
  className: '',
  html: '<div style="width:14px;height:14px;background:#2563eb;border:3px solid white;border-radius:50%;box-shadow:0 0 6px rgba(0,0,0,0.4)"></div>',
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

export interface DistrictClickInfo {
  key: string;
  stateAbbr: string;
  district: string;
  signer?: Signer;
  targeted?: TargetedRep;
}

interface MapProps {
  signerData: SignerData;
  targetedReps: TargetedRep[];
  userLocation?: { lat: number; lng: number } | null;
  initialZoom?: number;
  selectedDistrictKey?: string | null;
  onDistrictClick?: (info: DistrictClickInfo) => void;
}

function OpenDistrictPopup({ districtKey, layersRef }: { districtKey: string; layersRef: React.RefObject<globalThis.Map<string, Layer>> }) {
  const map = useMap();
  useEffect(() => {
    // Small delay to let FlyToLocation start first and GeoJSON layers to bindPopup
    const timer = setTimeout(() => {
      const layer = layersRef.current?.get(districtKey);
      if (layer && 'openPopup' in layer) {
        const geoLayer = layer as L.Layer & { getBounds?: () => L.LatLngBounds; openPopup: () => void };
        geoLayer.openPopup();
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [districtKey, layersRef, map]);
  return null;
}

export default function DistrictMap({ signerData, targetedReps, userLocation, initialZoom, selectedDistrictKey, onDistrictClick }: MapProps) {
  const [geoData, setGeoData] = useState<FeatureCollection | null>(null);
  const layersRef = useRef<globalThis.Map<string, Layer>>(new globalThis.Map());

  useEffect(() => {
    fetch('/districts.geojson')
      .then((res) => res.json())
      .then((data) => setGeoData(data));
  }, []);

  const signedDistricts = new Set(
    signerData.signers.map((s) => s.stateDistrict)
  );

  const targetedByDistrict: globalThis.Map<string, TargetedRep> = new globalThis.Map(
    targetedReps.map((t): [string, TargetedRep] => [t.stateDistrict, t])
  );
  const targetedSet = new Set(targetedReps.map(t => t.stateDistrict));

  const signerByDistrict: globalThis.Map<string, Signer> = new globalThis.Map(
    signerData.signers.map((s): [string, Signer] => [s.stateDistrict, s])
  );

  const getDistrictKey = (props: DistrictProperties) => {
    const stateAbbr = FIPS_TO_STATE[props.STATEFP] || props.STATEFP;
    const district = props.CD118FP;
    return `${stateAbbr}${district}`;
  };

  const style = (feature: Feature<Geometry, DistrictProperties> | undefined): PathOptions => {
    if (!feature) return {};
    const key = getDistrictKey(feature.properties);
    const signed = signedDistricts.has(key);
    const targeted = targetedSet.has(key);
    let fillColor = '#d1d5db'; // grey — not targeted
    if (signed) fillColor = '#22c55e'; // green — signed
    else if (targeted) fillColor = '#facc15'; // yellow — targeted
    return {
      fillColor,
      weight: 0.5,
      opacity: 0.8,
      color: '#666',
      fillOpacity: 0.5,
    };
  };

  const onEachFeature = (feature: Feature<Geometry, DistrictProperties>, layer: Layer) => {
    const key = getDistrictKey(feature.properties);
    const signer = signerByDistrict.get(key);
    const stateAbbr = FIPS_TO_STATE[feature.properties.STATEFP] || feature.properties.STATEFP;
    const district = feature.properties.CD118FP;

    const targeted = targetedSet.has(key);
    let popupContent: string;
    if (signer) {
      popupContent = `
        <div style="min-width: 160px">
          <strong>${signer.name}</strong><br/>
          ${stateAbbr}-${district} (${signer.party})<br/>
          <span style="color: #16a34a; font-weight: 600">Signed ${signer.dateSigned}</span>
        </div>
      `;
    } else if (targeted) {
      const rep = targetedByDistrict.get(key);
      popupContent = `
        <div style="min-width: 180px">
          <strong>${rep?.name || stateAbbr + '-' + district}${rep?.party ? ' (' + rep.party + ')' : ''}</strong><br/>
          ${stateAbbr}-${district}${rep?.area ? ' &mdash; ' + rep.area : ''}<br/>
          <span style="color: #ca8a04; font-weight: 600">Not yet signed &mdash; call this rep!</span><br/>
          <a href="#district-callout" onclick="event.preventDefault();document.getElementById('district-callout')?.scrollIntoView({behavior:'smooth',block:'nearest'})" style="color: #2563eb; font-size: 0.85em; text-decoration: underline; cursor: pointer">&#x25BC; See below for call script</a>
        </div>
      `;
    } else {
      popupContent = `
        <div style="min-width: 160px">
          <strong>${stateAbbr}-${district}</strong><br/>
          <span style="color: #6b7280; font-weight: 600">Not yet signed</span><br/>
          <a href="#district-callout" onclick="event.preventDefault();document.getElementById('district-callout')?.scrollIntoView({behavior:'smooth',block:'nearest'})" style="color: #2563eb; font-size: 0.85em; text-decoration: underline; cursor: pointer">&#x25BC; See below for call script</a>
        </div>
      `;
    }
    layer.bindPopup(popupContent);
    layersRef.current.set(key, layer);

    layer.on('click', () => {
      onDistrictClick?.({
        key,
        stateAbbr,
        district,
        signer: signerByDistrict.get(key),
        targeted: targetedByDistrict.get(key),
      });
    });
  };

  if (!geoData) {
    return (
      <div className="w-full h-[300px] sm:h-[400px] md:h-[500px] bg-gray-100 rounded-lg flex items-center justify-center">
        <p className="text-gray-500">Loading map...</p>
      </div>
    );
  }

  return (
    <MapContainer
      center={[39, -98]}
      zoom={4}
      className="w-full h-[300px] sm:h-[400px] md:h-[500px] rounded-lg touch-manipulation"
      scrollWheelZoom={true}
      dragging={true}
      zoomControl={false}
    >
      <ZoomControl position="topright" />
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <GeoJSON
        data={geoData}
        style={style}
        onEachFeature={onEachFeature}
      />
      {userLocation && (
        <>
          <FlyToLocation lat={userLocation.lat} lng={userLocation.lng} zoom={initialZoom || 9} />
          <Marker position={[userLocation.lat, userLocation.lng]} icon={userIcon}>
            <Popup>Your location</Popup>
          </Marker>
        </>
      )}
      {selectedDistrictKey && (
        <OpenDistrictPopup districtKey={selectedDistrictKey} layersRef={layersRef} />
      )}
    </MapContainer>
  );
}
