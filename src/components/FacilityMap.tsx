import { useEffect, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { ExternalLink, MapPin, Navigation } from 'lucide-react';
import type { Facility } from '../types';

interface FacilityMapProps {
  spaces: Facility[];
  selectedId: string | null;
  onSelect: (space: Facility) => void;
  onBoundsFilter?: (bounds: { north: number; south: number; east: number; west: number }) => void;
  userLocation?: { lat: number; lng: number } | null;
  heightClass?: string;
}

const AICHI_BOUNDS: [[number, number], [number, number]] = [
  [136.62, 34.55],
  [137.86, 35.45],
];
const SOURCE_ID = 'houkago-facilities';
const POINT_LAYER = 'houkago-facility-points';
const CLUSTER_LAYER = 'houkago-facility-clusters';
const CLUSTER_COUNT_LAYER = 'houkago-facility-cluster-count';

function featureCollection(spaces: Facility[], selectedId: string | null) {
  return {
    type: 'FeatureCollection' as const,
    features: spaces.map((space) => ({
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [space.lng, space.lat] },
      properties: { id: space.id, name: space.name, isDemo: space.isDemo, selected: space.id === selectedId },
    })),
  };
}

export function FacilityMap({
  spaces,
  selectedId,
  onSelect,
  onBoundsFilter,
  userLocation,
  heightClass = 'h-[420px] lg:h-[620px]',
}: FacilityMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const spacesRef = useRef(spaces);
  const onSelectRef = useRef(onSelect);
  const selectedIdRef = useRef(selectedId);
  const userLocationRef = useRef(userLocation);
  const [mapMode, setMapMode] = useState<'osm-vector' | 'gsi-raster'>('osm-vector');
  const [mapError, setMapError] = useState(false);
  const selected = spaces.find((space) => space.id === selectedId) || spaces[0] || null;

  spacesRef.current = spaces;
  onSelectRef.current = onSelect;
  selectedIdRef.current = selectedId;
  userLocationRef.current = userLocation;

  useEffect(() => {
    if (!containerRef.current) return;
    setMapError(false);

    const style: maplibregl.StyleSpecification | string = mapMode === 'osm-vector'
      ? 'https://tiles.openfreemap.org/styles/liberty'
      : {
          version: 8,
          sources: {
            gsi: {
              type: 'raster',
              tiles: ['https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png'],
              tileSize: 256,
              attribution: '地理院タイル',
            },
          },
          layers: [{ id: 'gsi-layer', type: 'raster', source: 'gsi' }],
        };

    let map: maplibregl.Map;
    try {
      map = new maplibregl.Map({
        container: containerRef.current,
        style,
        center: [136.98, 35.02],
        zoom: 7.5,
        attributionControl: false,
        maxBounds: [[136.15, 34.1], [138.2, 35.95]],
      });
    } catch {
      setMapError(true);
      return;
    }

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    map.addControl(
      new maplibregl.AttributionControl({
        compact: true,
        customAttribution: mapMode === 'osm-vector'
          ? '© OpenStreetMap contributors / OpenFreeMap'
          : '出典：国土地理院 地理院タイル',
      }),
      'bottom-right',
    );

    map.once('load', () => {
      map.addSource(SOURCE_ID, {
        type: 'geojson',
        data: featureCollection(spacesRef.current, selectedIdRef.current),
        cluster: true,
        clusterRadius: 42,
        clusterMaxZoom: 14,
      });
      map.addSource('houkago-user-location', {
        type: 'geojson',
        data: userLocationRef.current
          ? { type: 'Feature', geometry: { type: 'Point', coordinates: [userLocationRef.current.lng, userLocationRef.current.lat] }, properties: {} }
          : { type: 'FeatureCollection', features: [] },
      });
      map.addLayer({
        id: 'houkago-user-location-dot',
        type: 'circle',
        source: 'houkago-user-location',
        paint: { 'circle-radius': 7, 'circle-color': '#2563eb', 'circle-stroke-color': '#ffffff', 'circle-stroke-width': 3 },
      });
      map.addLayer({
        id: CLUSTER_LAYER,
        type: 'circle',
        source: SOURCE_ID,
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': ['step', ['get', 'point_count'], '#2563eb', 10, '#1d4ed8', 30, '#1e40af'],
          'circle-radius': ['step', ['get', 'point_count'], 18, 10, 22, 30, 27],
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
        },
      });
      map.addLayer({
        id: CLUSTER_COUNT_LAYER,
        type: 'symbol',
        source: SOURCE_ID,
        filter: ['has', 'point_count'],
        layout: { 'text-field': ['get', 'point_count_abbreviated'], 'text-font': ['Open Sans Bold'], 'text-size': 12 },
        paint: { 'text-color': '#ffffff' },
      });
      map.addLayer({
        id: POINT_LAYER,
        type: 'circle',
        source: SOURCE_ID,
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-color': ['case', ['==', ['get', 'isDemo'], true], '#d97706', ['==', ['get', 'selected'], true], '#1d4ed8', '#0ea5e9'],
          'circle-radius': ['case', ['==', ['get', 'selected'], true], 9, 7],
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
        },
      });
      map.addLayer({
        id: 'houkago-facility-labels',
        type: 'symbol',
        source: SOURCE_ID,
        minzoom: 11,
        filter: ['!', ['has', 'point_count']],
        layout: {
          'text-field': ['get', 'name'],
          'text-font': ['Open Sans Semibold'],
          'text-size': 11,
          'text-offset': [0, 1.35],
          'text-anchor': 'top',
          'text-max-width': 12,
        },
        paint: {
          'text-color': '#0f172a',
          'text-halo-color': '#ffffff',
          'text-halo-width': 1.5,
        },
      });

      map.on('click', CLUSTER_LAYER, (event) => {
        const feature = map.queryRenderedFeatures(event.point, { layers: [CLUSTER_LAYER] })[0];
        const clusterId = feature?.properties?.cluster_id;
        const source = map.getSource(SOURCE_ID) as maplibregl.GeoJSONSource;
        if (typeof clusterId === 'number') {
          source.getClusterExpansionZoom(clusterId).then((zoom) => {
            const coordinates = (feature.geometry as GeoJSON.Point).coordinates as [number, number];
            map.easeTo({ center: coordinates, zoom });
          }).catch(() => setMapError(true));
        }
      });
      map.on('click', POINT_LAYER, (event) => {
        const feature = map.queryRenderedFeatures(event.point, { layers: [POINT_LAYER] })[0];
        const id = feature?.properties?.id;
        const space = spacesRef.current.find((item) => item.id === id);
        if (space) onSelectRef.current(space);
      });
      map.on('mouseenter', CLUSTER_LAYER, () => { map.getCanvas().style.cursor = 'pointer'; });
      map.on('mouseleave', CLUSTER_LAYER, () => { map.getCanvas().style.cursor = ''; });
      map.on('mouseenter', POINT_LAYER, () => { map.getCanvas().style.cursor = 'pointer'; });
      map.on('mouseleave', POINT_LAYER, () => { map.getCanvas().style.cursor = ''; });
      map.fitBounds(AICHI_BOUNDS, { padding: 30, maxZoom: 8, duration: 0 });
      setMapError(false);
    });
    map.on('error', () => {
      if (!map.isStyleLoaded()) setMapError(true);
    });

    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [mapMode]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded() || !map.getSource(SOURCE_ID)) return;
    const source = map.getSource(SOURCE_ID) as maplibregl.GeoJSONSource;
    source.setData(featureCollection(spaces, selectedId));
  }, [spaces, selectedId, mapMode]);

  useEffect(() => {
    const source = mapRef.current?.getSource('houkago-user-location') as maplibregl.GeoJSONSource | undefined;
    if (!source) return;
    source.setData(userLocation
      ? { type: 'Feature', geometry: { type: 'Point', coordinates: [userLocation.lng, userLocation.lat] }, properties: {} }
      : { type: 'FeatureCollection', features: [] });
  }, [userLocation, mapMode]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (userLocation) {
      map.easeTo({ center: [userLocation.lng, userLocation.lat], zoom: 11, duration: 500 });
    } else if (selectedId && selected) {
      map.easeTo({ center: [selected.lng, selected.lat], zoom: 11, duration: 500 });
    }
  }, [selected, selectedId, userLocation]);

  const handleSearchBounds = () => {
    const map = mapRef.current;
    if (!map || !onBoundsFilter) return;
    const bounds = map.getBounds();
    onBoundsFilter({ north: bounds.getNorth(), south: bounds.getSouth(), east: bounds.getEast(), west: bounds.getWest() });
  };

  return (
    <div className="liquid-glass rounded-3xl overflow-hidden flex flex-col">
      <div className="px-4 py-2.5 border-b border-slate-200/70 flex flex-wrap items-center justify-between gap-2 bg-white/60">
        <div className="flex items-center gap-2 text-xs font-medium text-slate-700">
          <MapPin className="h-4 w-4 text-blue-600" />
          <span>愛知県内 学習スペースマップ</span>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600">
            {mapMode === 'osm-vector' ? 'OpenStreetMap' : '地理院タイル'}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {onBoundsFilter && (
            <button type="button" onClick={handleSearchBounds} className="rounded-xl bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100 transition">
              この範囲で検索
            </button>
          )}
          <button
            type="button"
            onClick={() => setMapMode((mode) => mode === 'osm-vector' ? 'gsi-raster' : 'osm-vector')}
            className="rounded-xl bg-white/90 border border-slate-200 px-2.5 py-1 text-[11px] text-slate-600 hover:bg-white"
          >
            地図を切り替え
          </button>
        </div>
      </div>

      <div className={`relative w-full ${heightClass}`}>
        <div ref={containerRef} className="h-full w-full" />
        {mapError && (
          <div role="status" className="absolute inset-x-4 top-4 rounded-xl bg-white/95 p-3 text-xs text-slate-700 shadow">
            地図を読み込めません。通信を確認するか「地図を切り替え」をお試しください。
          </div>
        )}

        {selected && (
          <div data-testid="selected-facility-route" className="absolute bottom-3 left-3 right-3 sm:right-auto sm:w-80 liquid-glass rounded-2xl p-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-xs font-bold text-slate-900 truncate">{selected.name}</div>
              <div className="text-[11px] text-slate-600">
                {selected.isDemo
                  ? 'サンプル地点・予約や経路案内には使用できません'
                  : `${selected.feeYen === 0 ? '無料' : `${selected.feeYen}円`} ・ 空席 ${selected.availableSeats}/${selected.totalSeats} ・ ${selected.openTime}〜${selected.closeTime}`}
              </div>
            </div>
            {selected.isDemo ? (
              <span className="shrink-0 rounded-lg bg-amber-100 px-2 py-1 text-[10px] font-semibold text-amber-900">サンプル</span>
            ) : (
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${selected.lat},${selected.lng}&travelmode=walking`}
                target="_blank"
                rel="noreferrer"
                className="shrink-0 inline-flex items-center gap-1 rounded-xl bg-blue-600 px-2.5 py-1.5 text-[11px] font-medium text-white hover:bg-blue-700"
              >
                <Navigation className="h-3 w-3" /> 経路 <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
