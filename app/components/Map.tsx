'use client';

import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, GeoJSON, Marker, Popup, ZoomControl, useMap } from 'react-leaflet';
import type { FeatureCollection, Feature, Geometry } from 'geojson';
import type { Layer, PathOptions } from 'leaflet';
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
  targeted?: boolean;
}

function FlyToLocation({ lat, lng, zoom = 9 }: { lat: number; lng: number; zoom?: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], zoom, { animate: true, duration: 0.5 });
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

function FitOverlayBounds({ geojson }: { geojson: GeoJSON.GeoJsonObject }) {
  const map = useMap();
  useEffect(() => {
    const layer = L.geoJSON(geojson);
    const bounds = layer.getBounds();
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 13, duration: 1.5 });
    }
  }, [map, geojson]);
  return null;
}

interface MapProps {
  signerData: SignerData;
  allReps: TargetedRep[];
  userLocation?: { lat: number; lng: number } | null;
  flyToLocation?: { lat: number; lng: number } | null;
  initialZoom?: number;
  selectedDistrictKey?: string | null;
  onDistrictClick?: (info: DistrictClickInfo) => void;
  searchOverlay?: GeoJSON.GeoJsonObject | null;
  compact?: boolean;
  repCount?: number;
}


export default function DistrictMap({ signerData, allReps, userLocation, flyToLocation, initialZoom, selectedDistrictKey, onDistrictClick, searchOverlay, compact, repCount }: MapProps) {
  const [geoData, setGeoData] = useState<FeatureCollection | null>(null);
  const layersRef = useRef<globalThis.Map<string, L.Path>>(new globalThis.Map());
  const prevSelectedKeyRef = useRef<string | null>(null);

  useEffect(() => {
    fetch('/districts.geojson')
      .then((res) => res.json())
      .then((data) => setGeoData(data));
  }, []);

  useEffect(() => {
    const prev = prevSelectedKeyRef.current;
    if (prev && prev !== selectedDistrictKey) {
      const prevLayer = layersRef.current.get(prev);
      if (prevLayer) prevLayer.setStyle({ weight: 2, color: '#4b5563', opacity: 1, dashArray: '2 8' });
    }
    if (selectedDistrictKey) {
      const layer = layersRef.current.get(selectedDistrictKey);
      if (layer) layer.setStyle({ weight: 3, color: '#1d4ed8' });
    }
    prevSelectedKeyRef.current = selectedDistrictKey ?? null;
  }, [selectedDistrictKey]);

  const signedDistricts = new Set(
    signerData.signers.map((s) => s.stateDistrict)
  );

  const repByDistrict: globalThis.Map<string, TargetedRep> = new globalThis.Map(
    allReps.map((r): [string, TargetedRep] => [r.stateDistrict, r])
  );
  const targetedSet = new Set(allReps.filter(r => r.targeted).map(r => r.stateDistrict));

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
      weight: 2,
      opacity: 1,
      color: '#4b5563',
      dashArray: '2 8',
      fillOpacity: 0.25,
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
    } else {
      const rep = repByDistrict.get(key);
      const statusColor = targeted ? '#ca8a04' : '#6b7280';
      const statusText = targeted ? 'Most likely to sign &mdash; call this rep!' : 'Not yet signed';
      popupContent = `
        <div style="min-width: 180px">
          <strong>${rep?.name || stateAbbr + '-' + district}${rep?.party ? ' (' + rep.party + ')' : ''}</strong><br/>
          ${stateAbbr}-${district}${rep?.area ? ' &mdash; ' + rep.area : ''}<br/>
          <span style="color: ${statusColor}; font-weight: 600">${statusText}</span><br/>
          <a href="#district-callout" onclick="event.preventDefault();document.getElementById('district-callout')?.scrollIntoView({behavior:'smooth',block:'nearest'})" style="color: #2563eb; font-size: 0.85em; text-decoration: underline; cursor: pointer">&#x25BC; See below for call script</a>
        </div>
      `;
    }
    layer.bindPopup(popupContent, { autoPan: false });
    layersRef.current.set(key, layer as L.Path);

    layer.on('click', () => {
      onDistrictClick?.({
        key,
        stateAbbr,
        district,
        signer: signerByDistrict.get(key),
        targeted: repByDistrict.get(key),
      });
    });
  };

  const dynamicHeight = compact && repCount !== undefined
    ? Math.max(200, Math.min(repCount * 120, 380))
    : undefined;

  const heightClass = compact ? 'h-[280px] sm:h-[350px]' : 'h-[300px] sm:h-[400px] md:h-[500px]';
  const heightStyle = dynamicHeight ? { height: `${dynamicHeight}px` } : undefined;

  if (!geoData) {
    return (
      <div
        className={`w-full bg-gray-100 rounded-lg flex items-center justify-center ${dynamicHeight ? '' : heightClass}`}
        style={heightStyle}
      >
        <p className="text-gray-500">Loading map...</p>
      </div>
    );
  }

  return (
    <MapContainer
      center={[39, -98]}
      zoom={4}
      className={`w-full rounded-lg touch-manipulation ${dynamicHeight ? '' : heightClass}`}
      style={heightStyle}
      scrollWheelZoom={true}
      dragging={true}
      zoomControl={false}
    >
      <ZoomControl position="topright" />
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {searchOverlay && (
        <>
          <GeoJSON
            key={JSON.stringify(searchOverlay).slice(0, 100)}
            data={searchOverlay as FeatureCollection}
            style={() => ({
              fillColor: '#3b82f6',
              fillOpacity: 0.15,
              color: '#2563eb',
              weight: 4,
              interactive: false,
            })}
            interactive={false}
          />
          <FitOverlayBounds geojson={searchOverlay} />
        </>
      )}
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
      {flyToLocation && !userLocation && !searchOverlay && (
        <FlyToLocation lat={flyToLocation.lat} lng={flyToLocation.lng} zoom={initialZoom || 9} />
      )}

    </MapContainer>
  );
}
