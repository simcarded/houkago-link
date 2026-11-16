import { useMemo, useState } from 'react';
import {
  CheckSquare,
  LocateFixed,
  Map as MapIcon,
  List,
  SlidersHorizontal,
  Sparkles,
  Scale,
} from 'lucide-react';
import type { AiRecommendationResult, Facility, RegionStat, SearchFilters } from '../types';
import { filterSpaces, haversineKm } from '../lib/disparity';
import { requestAiRecommend } from '../lib/api';
import { FacilityMap } from '../components/FacilityMap';
import { GlassCard } from '../components/LiquidUI';

interface ExplorePageProps {
  spaces: Facility[];
  regions: RegionStat[];
  filters: SearchFilters;
  onChangeFilters: (next: SearchFilters) => void;
  onResetFilters: () => void;
  onSelectSpace: (space: Facility) => void;
}

export function ExplorePage({
  spaces,
  regions,
  filters,
  onChangeFilters,
  onResetFilters,
  onSelectSpace,
}: ExplorePageProps) {
  const [mobileView, setMobileView] = useState<'list' | 'map'>('list');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedMapId, setSelectedMapId] = useState<string | null>(spaces[0]?.id || null);
  const [boundsBox, setBoundsBox] = useState<{
    north: number;
    south: number;
    east: number;
    west: number;
  } | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locError, setLocError] = useState('');
  const [aiQuery, setAiQuery] = useState('');
  const [aiResult, setAiResult] = useState<AiRecommendationResult | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [compareIds, setCompareIds] = useState<string[]>([]);

  const filteredSpaces = useMemo(() => {
    const base = filterSpaces(spaces, filters, userLocation);
    if (!boundsBox) return base;
    return base.filter(
      (s) =>
        s.lat <= boundsBox.north &&
        s.lat >= boundsBox.south &&
        s.lng <= boundsBox.east &&
        s.lng >= boundsBox.west,
    );
  }, [spaces, filters, userLocation, boundsBox]);

  const handleLocate = () => {
    setLocError('');
    if (!navigator.geolocation) {
      setLocError('お使いのブラウザは現在地取得に対応していません。');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      () => {
        setLocError('位置情報の許可が得られなかったため、名古屋駅付近を基準にします。');
        setUserLocation({ lat: 35.1709, lng: 136.8815 });
      },
      { timeout: 6000 },
    );
  };

  const handleAiSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiQuery.trim()) return;
    setAiLoading(true);
    const res = await requestAiRecommend(aiQuery);
    setAiResult(res);
    onChangeFilters({
      ...filters,
      query: res.criteria.regionHint || '',
      maxFee: res.criteria.maxFee,
      wifi: res.criteria.wifi,
      outlets: res.criteria.outlets,
      quiet: res.criteria.quiet,
      groupOk: res.criteria.groupOk,
      openEvening: res.criteria.openEvening,
    });
    setAiLoading(false);
  };

  const toggleCompare = (id: string) => {
    setCompareIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < 3 ? [...prev, id] : prev,
    );
  };

  const comparedSpaces = spaces.filter((s) => compareIds.includes(s.id));

  return (
    <div className="space-y-4">
      <GlassCard className="p-4 sm:p-5 space-y-3">
        <form onSubmit={handleAiSearch} className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Sparkles className="h-4 w-4 text-blue-600 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={aiQuery}
              onChange={(e) => setAiQuery(e.target.value)}
              placeholder="希望を自然に入力（例：静かでWi-Fiがある無料の学習場所 / 友達と3人で夕方まで）"
              className="w-full rounded-2xl border border-blue-200/80 bg-white/90 pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            type="submit"
            disabled={aiLoading}
            className="rounded-2xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {aiLoading ? '解析中...' : 'AI条件検索'}
          </button>
        </form>

        {aiResult && (
          <div className="rounded-2xl bg-blue-50/90 border border-blue-200/80 px-3.5 py-2 text-xs text-blue-900 flex flex-wrap items-center justify-between gap-2">
            <span>{aiResult.summary}</span>
            <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-medium text-slate-600">
              {aiResult.mode === 'workers-ai'
                ? 'Workers AI 稼働'
                : aiResult.mode === 'rule-fallback'
                  ? 'ルールベース代替（AI未実行）'
                  : 'オフライン代替（AI未実行）'}
            </span>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={filters.query}
              onChange={(e) => onChangeFilters({ ...filters, query: e.target.value })}
              placeholder="キーワード絞り込み"
              className="rounded-xl border border-slate-200 bg-white/90 px-3 py-1.5 text-xs w-44"
            />
            <select
              value={filters.regionId}
              onChange={(e) => onChangeFilters({ ...filters, regionId: e.target.value })}
              className="rounded-xl border border-slate-200 bg-white/90 px-2.5 py-1.5 text-xs"
            >
              <option value="">すべての地域</option>
              {regions.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setShowFilters((v) => !v)}
              className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white/90 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-white"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              詳細条件
            </button>
            <button
              type="button"
              onClick={handleLocate}
              className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white/90 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-white"
            >
              <LocateFixed className="h-3.5 w-3.5 text-blue-600" />
              現在地付近
            </button>
            {(boundsBox || filters.query || filters.regionId || filters.maxFee !== null) && (
              <button
                type="button"
                onClick={() => {
                  setBoundsBox(null);
                  setAiResult(null);
                  onResetFilters();
                }}
                className="text-xs text-blue-700 hover:underline px-1"
              >
                条件リセット
              </button>
            )}
          </div>

          <div className="lg:hidden flex rounded-xl bg-slate-100 p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setMobileView('list')}
              className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 font-medium ${
                mobileView === 'list' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600'
              }`}
            >
              <List className="h-3.5 w-3.5" /> 一覧 ({filteredSpaces.length})
            </button>
            <button
              type="button"
              onClick={() => setMobileView('map')}
              className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 font-medium ${
                mobileView === 'map' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600'
              }`}
            >
              <MapIcon className="h-3.5 w-3.5" /> マップ
            </button>
          </div>
        </div>

        {locError && <div className="text-[11px] text-amber-700">{locError}</div>}

        {showFilters && (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2 pt-2 border-t border-slate-200/70 text-xs">
            <select
              value={filters.maxFee ?? ''}
              onChange={(e) =>
                onChangeFilters({
                  ...filters,
                  maxFee: e.target.value === '' ? null : Number(e.target.value),
                })
              }
              className="rounded-xl border border-slate-200 bg-white px-2.5 py-1.5"
            >
              <option value="">料金指定なし</option>
              <option value="0">無料（0円）</option>
              <option value="100">100円以下</option>
            </select>
            <select
              value={filters.minSeats}
              onChange={(e) => onChangeFilters({ ...filters, minSeats: Number(e.target.value) })}
              className="rounded-xl border border-slate-200 bg-white px-2.5 py-1.5"
            >
              <option value="1">空席1以上</option>
              <option value="3">空席3以上</option>
              <option value="5">空席5以上</option>
            </select>
            {[
              ['wifi', 'Wi-Fiあり'],
              ['outlets', 'コンセントあり'],
              ['quiet', '静かな環境'],
              ['groupOk', 'グループ学習可'],
              ['barrierFree', 'バリアフリー'],
              ['openEvening', '20時以降まで'],
            ].map(([key, label]) => {
              const k = key as keyof SearchFilters;
              const checked = Boolean(filters[k]);
              return (
                <label
                  key={key}
                  className={`flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 cursor-pointer ${
                    checked ? 'bg-blue-50 border-blue-300 text-blue-800' : 'bg-white border-slate-200'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => onChangeFilters({ ...filters, [k]: e.target.checked })}
                  />
                  {label}
                </label>
              );
            })}
          </div>
        )}
      </GlassCard>

      {comparedSpaces.length >= 2 && (
        <GlassCard className="p-4 overflow-x-auto">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <Scale className="h-4 w-4 text-blue-600" /> 施設比較（最大3件）
            </div>
            <button
              type="button"
              onClick={() => setCompareIds([])}
              className="text-xs text-slate-500 hover:text-slate-900"
            >
              比較をクリア
            </button>
          </div>
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="py-1.5 pr-3">施設名</th>
                <th className="py-1.5 pr-3">料金</th>
                <th className="py-1.5 pr-3">営業時間</th>
                <th className="py-1.5 pr-3">空席</th>
                <th className="py-1.5">設備</th>
              </tr>
            </thead>
            <tbody>
              {comparedSpaces.map((s) => (
                <tr key={s.id} className="border-b border-slate-100">
                  <td className="py-1.5 pr-3 font-medium">{s.name}</td>
                  <td className="py-1.5 pr-3">{s.feeYen === 0 ? '無料' : `${s.feeYen}円`}</td>
                  <td className="py-1.5 pr-3">
                    {s.openTime}〜{s.closeTime}
                  </td>
                  <td className="py-1.5 pr-3">
                    {s.availableSeats}/{s.totalSeats}
                  </td>
                  <td className="py-1.5">
                    {[s.wifi && 'Wi-Fi', s.outlets && '電源', s.groupOk && 'グループ']
                      .filter(Boolean)
                      .join(' / ')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </GlassCard>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        <div
          className={`lg:col-span-5 space-y-3 ${mobileView === 'map' ? 'hidden lg:block' : 'block'}`}
        >
          <div className="text-xs text-slate-600 px-1">
            検索結果 {filteredSpaces.length}件（比較したい施設にチェックを入れられます）
          </div>
          {filteredSpaces.length === 0 ? (
            <GlassCard className="p-6 text-center text-sm text-slate-600">
              条件に一致する学習スペースがありません。条件を緩めて再検索してください。
            </GlassCard>
          ) : (
            <div className="space-y-3 lg:max-h-[620px] lg:overflow-y-auto pr-0.5">
              {filteredSpaces.map((s) => {
                const dist = userLocation ? haversineKm(userLocation.lat, userLocation.lng, s.lat, s.lng) : null;
                return (
                  <GlassCard
                    key={s.id}
                    interactive
                    onClick={() => {
                      setSelectedMapId(s.id);
                      onSelectSpace(s);
                    }}
                    className={`p-4 space-y-2 ${
                      selectedMapId === s.id ? 'ring-2 ring-blue-500/70' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-2">
                          <span>{s.regionName}</span>
                          {dist !== null && <span>現在地から約 {dist.toFixed(1)} km</span>}
                          {s.isSimulation && (
                            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700 font-medium">
                              シミュレーション追加
                            </span>
                          )}
                        </div>
                        <h3 className="font-bold text-sm text-slate-900 mt-0.5">{s.name}</h3>
                      </div>
                      <span className="shrink-0 rounded-xl bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">
                        {s.feeYen === 0 ? '無料' : `${s.feeYen}円`}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-600">
                      <span>
                        空席 <strong className="text-slate-900">{s.availableSeats}</strong>/{s.totalSeats}席 ・{' '}
                        {s.openTime}〜{s.closeTime}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleCompare(s.id);
                        }}
                        className={`inline-flex items-center gap-1 rounded-lg px-2 py-0.5 border text-[11px] ${
                          compareIds.includes(s.id)
                            ? 'bg-blue-600 border-blue-600 text-white'
                            : 'bg-white border-slate-200 text-slate-600'
                        }`}
                      >
                        <CheckSquare className="h-3 w-3" /> 比較
                      </button>
                    </div>
                  </GlassCard>
                );
              })}
            </div>
          )}
        </div>

        <div className={`lg:col-span-7 ${mobileView === 'list' ? 'hidden lg:block' : 'block'}`}>
          <FacilityMap
            spaces={filteredSpaces}
            selectedId={selectedMapId}
            onSelect={(sp) => {
              setSelectedMapId(sp.id);
              onSelectSpace(sp);
            }}
            onBoundsFilter={(b) => setBoundsBox(b)}
            userLocation={userLocation}
          />
        </div>
      </div>
    </div>
  );
}
