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
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const [mapMode, setMapMode] = useState<'osm-vector' | 'gsi-raster' | 'offline-svg'>('osm-vector');

  const selected = spaces.find((s) => s.id === selectedId) || spaces[0] || null;

  useEffect(() => {
    if (!containerRef.current || mapMode === 'offline-svg') return;

    const style: maplibregl.StyleSpecification | string =
      mapMode === 'osm-vector'
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
        center: [136.9066, 35.16],
        zoom: 9.2,
        attributionControl: false,
      });
    } catch {
      setMapMode('offline-svg');
      return;
    }

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    map.addControl(
      new maplibregl.AttributionControl({
        compact: true,
        customAttribution:
          mapMode === 'osm-vector'
            ? '© OpenStreetMap contributors / OpenFreeMap'
            : '出典：国土地理院 地理院タイル',
      }),
      'bottom-right',
    );

    map.on('error', () => {
      setMapMode((prev) => (prev === 'osm-vector' ? 'gsi-raster' : 'offline-svg'));
    });

    mapRef.current = map;

    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, [mapMode]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || mapMode === 'offline-svg') return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    spaces.forEach((space) => {
      const el = document.createElement('button');
      el.type = 'button';
      const isSelected = space.id === selectedId;
      el.className = `rounded-full px-2.5 py-1 text-[11px] font-bold shadow-md border transition transform ${
        space.isSimulation
          ? 'bg-emerald-600 text-white border-white'
          : isSelected
            ? 'bg-blue-700 text-white border-white scale-110'
            : 'bg-white/95 text-slate-800 border-blue-200 hover:scale-105'
      }`;
      el.textContent = `${space.feeYen === 0 ? '無料' : `${space.feeYen}円`} · 空${space.availableSeats}`;
      el.title = space.name;
      el.onclick = () => onSelect(space);

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([space.lng, space.lat])
        .addTo(map);
      markersRef.current.push(marker);
    });

    if (userLocation) {
      const userEl = document.createElement('div');
      userEl.className = 'h-4 w-4 rounded-full bg-blue-600 ring-4 ring-blue-300/60 border-2 border-white';
      userEl.title = '現在地';
      const m = new maplibregl.Marker({ element: userEl })
        .setLngLat([userLocation.lng, userLocation.lat])
        .addTo(map);
      markersRef.current.push(m);
    }
  }, [spaces, selectedId, userLocation, mapMode, onSelect]);

  useEffect(() => {
    if (!mapRef.current || !selectedId || mapMode === 'offline-svg') return;
    const target = spaces.find((s) => s.id === selectedId);
    if (target) {
      mapRef.current.flyTo({ center: [target.lng, target.lat], zoom: 11.8, duration: 550 });
    }
  }, [selectedId, spaces, mapMode]);

  const handleSearchBounds = () => {
    if (!mapRef.current || !onBoundsFilter) return;
    const b = mapRef.current.getBounds();
    onBoundsFilter({
      north: b.getNorth(),
      south: b.getSouth(),
      east: b.getEast(),
      west: b.getWest(),
    });
  };

  return (
    <div className="liquid-glass rounded-3xl overflow-hidden flex flex-col">
      <div className="px-4 py-2.5 border-b border-slate-200/70 flex flex-wrap items-center justify-between gap-2 bg-white/60">
        <div className="flex items-center gap-2 text-xs font-medium text-slate-700">
          <MapPin className="h-4 w-4 text-blue-600" />
          <span>愛知県内 学習スペースマップ</span>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600">
            {mapMode === 'osm-vector'
              ? 'OpenStreetMap'
              : mapMode === 'gsi-raster'
                ? '地理院タイル'
                : 'オフライン簡易地図'}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {onBoundsFilter && mapMode !== 'offline-svg' && (
            <button
              type="button"
              onClick={handleSearchBounds}
              className="rounded-xl bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100 transition"
            >
              この範囲で検索
            </button>
          )}
          <button
            type="button"
            onClick={() =>
              setMapMode((m) => (m === 'osm-vector' ? 'gsi-raster' : m === 'gsi-raster' ? 'offline-svg' : 'osm-vector'))
            }
            className="rounded-xl bg-white/90 border border-slate-200 px-2.5 py-1 text-[11px] text-slate-600 hover:bg-white"
          >
            地図切替
          </button>
        </div>
      </div>

      <div className={`relative w-full ${heightClass}`}>
        {mapMode === 'offline-svg' ? (
          <div className="h-full w-full bg-gradient-to-br from-sky-50 to-blue-100/70 p-4 flex flex-col justify-between">
            <div className="text-xs text-slate-600">
              オフライン / タイル接続制限時の簡易マップ表示（クリックで施設を選択）
            </div>
            <svg viewBox="0 0 400 260" className="w-full h-full">
              <path
                d="M65,45 L175,30 L265,55 L345,145 L305,215 L205,205 L165,235 L125,220 L145,165 L70,130 Z"
                fill="rgba(255,255,255,0.75)"
                stroke="#93C5FD"
                strokeWidth="2"
              />
              {spaces.map((s) => {
                const x = ((s.lng - 136.65) / 0.9) * 340 + 30;
                const y = (1 - (s.lat - 34.65) / 0.78) * 210 + 25;
                const active = s.id === selectedId;
                return (
                  <g key={s.id} className="cursor-pointer" onClick={() => onSelect(s)}>
                    <circle
                      cx={x}
                      cy={y}
                      r={active ? 10 : 7}
                      fill={s.isSimulation ? '#059669' : active ? '#1D4ED8' : '#3B82F6'}
                      stroke="#FFFFFF"
                      strokeWidth="2"
                    />
                    <text x={x + 10} y={y + 4} fontSize="9" fill="#1E293B" fontWeight="600">
                      {s.name.slice(0, 8)}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        ) : (
          <div ref={containerRef} className="h-full w-full" />
        )}

        {selected && (
          <div className="absolute bottom-3 left-3 right-3 sm:right-auto sm:w-80 liquid-glass rounded-2xl p-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-xs font-bold text-slate-900 truncate">{selected.name}</div>
              <div className="text-[11px] text-slate-600">
                {selected.feeYen === 0 ? '無料' : `${selected.feeYen}円`} ・ 空席 {selected.availableSeats}/
                {selected.totalSeats} ・ {selected.openTime}〜{selected.closeTime}
              </div>
            </div>
            <a
              href={`https://www.openstreetmap.org/directions?to=${selected.lat},${selected.lng}`}
              target="_blank"
              rel="noreferrer"
              className="shrink-0 inline-flex items-center gap-1 rounded-xl bg-blue-600 px-2.5 py-1.5 text-[11px] font-medium text-white hover:bg-blue-700"
            >
              <Navigation className="h-3 w-3" />
              経路
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

