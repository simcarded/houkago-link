import { useMemo, useState } from 'react';
import { Building2, CheckCircle2, PlusCircle, RotateCcw, Sparkles } from 'lucide-react';
import type { Facility, ProviderType, RegionStat } from '../types';
import { SIMULATION_PRESETS } from '../data/demoData';
import { computeRegionMetrics } from '../lib/disparity';
import { AnimatedNumber, GlassCard } from '../components/LiquidUI';

interface SimulationPageProps {
  regions: RegionStat[];
  baseSpacesCount: number;
  baseTotalSeats: number;
  simulatedSpaces: Facility[];
  onAddSimulatedSpace: (space: Omit<Facility, 'id' | 'availableSeats'>) => void;
  onResetSimulation: () => void;
}

export function SimulationPage({
  regions,
  baseSpacesCount,
  baseTotalSeats,
  simulatedSpaces,
  onAddSimulatedSpace,
  onResetSimulation,
}: SimulationPageProps) {
  const [name, setName] = useState('東三河テクノロジー株式会社 第2会議室（シミュレーション）');
  const [providerType, setProviderType] = useState<ProviderType>('enterprise');
  const [providerName, setProviderName] = useState('東三河テクノロジー株式会社（架空）');
  const [regionId, setRegionId] = useState('chita');
  const [openTime, setOpenTime] = useState('16:30');
  const [closeTime, setCloseTime] = useState('21:00');
  const [totalSeats, setTotalSeats] = useState(24);
  const [feeYen, setFeeYen] = useState(0);
  const [wifi, setWifi] = useState(true);
  const [outlets, setOutlets] = useState(true);
  const [notes, setNotes] = useState('業務終了後の空き会議室を高校生に無償開放。');
  const [justAdded, setJustAdded] = useState(false);

  const selectedRegion = regions.find((r) => r.id === regionId) || regions[0];
  const addedSeatsTotal = simulatedSpaces.reduce((acc, s) => acc + s.totalSeats, 0);
  const metrics = useMemo(() => computeRegionMetrics(regions, simulatedSpaces), [regions, simulatedSpaces]);
  const targetMetric = metrics.find((m) => m.id === regionId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !selectedRegion) return;
    onAddSimulatedSpace({
      name: name.trim(),
      providerType,
      providerName: providerName.trim() || '協力団体（架空）',
      regionId: selectedRegion.id,
      regionName: selectedRegion.name,
      address: `愛知県${selectedRegion.name}エリア（シミュレーション所在地）`,
      lat: selectedRegion.lat + (Math.random() - 0.5) * 0.03,
      lng: selectedRegion.lng + (Math.random() - 0.5) * 0.03,
      feeYen,
      openTime,
      closeTime,
      totalSeats,
      wifi,
      outlets,
      quiet: true,
      soloOk: true,
      groupOk: true,
      barrierFree: true,
      rules: ['シミュレーション追加施設', '受付手順に従い利用'],
      notes,
      isPublished: true,
      isDemo: true,
      isSimulation: true,
      themeHue: 162,
    });
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 3000);
  };

  return (
    <div className="space-y-5">
      <GlassCard className="p-5 sm:p-6 space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700 mb-1.5">
              デモ専用シミュレーション（実在企業との契約を示すものではありません）
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
              企業・自治体の施設提供シミュレーション
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 mt-1">
              空き会議室や公共施設の未使用時間帯を登録すると、一般向けマップ検索と地域格差マップへ即座に反映されます。
            </p>
          </div>
          {simulatedSpaces.length > 0 && (
            <button
              type="button"
              onClick={onResetSimulation}
              className="inline-flex items-center gap-1.5 rounded-xl bg-white border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              <RotateCcw className="h-3.5 w-3.5" /> シミュレーション初期化
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
          <div className="liquid-glass-subtle rounded-2xl p-3.5">
            <div className="text-xs text-slate-500">提供前の施設数</div>
            <div className="text-xl font-bold text-slate-800 mt-0.5">{baseSpacesCount}件</div>
          </div>
          <div className="liquid-glass-subtle rounded-2xl p-3.5 border-emerald-200">
            <div className="text-xs text-emerald-700">提供後の施設数</div>
            <div className="text-xl font-bold text-emerald-700 mt-0.5">
              <AnimatedNumber value={baseSpacesCount + simulatedSpaces.length} suffix="件" />
            </div>
          </div>
          <div className="liquid-glass-subtle rounded-2xl p-3.5">
            <div className="text-xs text-slate-500">提供前の座席数</div>
            <div className="text-xl font-bold text-slate-800 mt-0.5">{baseTotalSeats}席</div>
          </div>
          <div className="liquid-glass-subtle rounded-2xl p-3.5 border-emerald-200">
            <div className="text-xs text-emerald-700">提供後の座席数</div>
            <div className="text-xl font-bold text-emerald-700 mt-0.5">
              <AnimatedNumber value={baseTotalSeats + addedSeatsTotal} suffix="席" />
            </div>
          </div>
        </div>
      </GlassCard>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <GlassCard className="lg:col-span-7 p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <Building2 className="h-4 w-4 text-blue-600" /> 空きスペース提供登録（デモ）
            </h2>
            <div className="flex flex-wrap gap-1.5">
              {SIMULATION_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => onAddSimulatedSpace(preset.space)}
                  className="inline-flex items-center gap-1 rounded-xl bg-blue-50 border border-blue-200 px-2.5 py-1 text-[11px] font-medium text-blue-700 hover:bg-blue-100"
                >
                  <Sparkles className="h-3 w-3" /> {preset.label}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="space-y-1">
                <span className="font-medium text-slate-700">施設名</span>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2"
                  required
                />
              </label>
              <label className="space-y-1">
                <span className="font-medium text-slate-700">提供者区分</span>
                <select
                  value={providerType}
                  onChange={(e) => setProviderType(e.target.value as ProviderType)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2"
                >
                  <option value="enterprise">企業（空き会議室・研修室）</option>
                  <option value="municipality">自治体（支所・公民館）</option>
                  <option value="community">地域団体・商店街</option>
                </select>
              </label>
              <label className="space-y-1">
                <span className="font-medium text-slate-700">提供団体名（架空）</span>
                <input
                  type="text"
                  value={providerName}
                  onChange={(e) => setProviderName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2"
                />
              </label>
              <label className="space-y-1">
                <span className="font-medium text-slate-700">所在地（対象地域）</span>
                <select
                  value={regionId}
                  onChange={(e) => setRegionId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2"
                >
                  {regions.map((r) => (
                    <option key={r.id} value={r.id}>
                      愛知県 {r.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <label className="space-y-1">
                <span className="font-medium text-slate-700">開始時間</span>
                <input
                  type="time"
                  value={openTime}
                  onChange={(e) => setOpenTime(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-2"
                />
              </label>
              <label className="space-y-1">
                <span className="font-medium text-slate-700">終了時間</span>
                <input
                  type="time"
                  value={closeTime}
                  onChange={(e) => setCloseTime(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-2"
                />
              </label>
              <label className="space-y-1">
                <span className="font-medium text-slate-700">提供座席数</span>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={totalSeats}
                  onChange={(e) => setTotalSeats(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-2"
                />
              </label>
              <label className="space-y-1">
                <span className="font-medium text-slate-700">利用料金（円）</span>
                <input
                  type="number"
                  min={0}
                  max={500}
                  step={50}
                  value={feeYen}
                  onChange={(e) => setFeeYen(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-2"
                />
              </label>
            </div>

            <div className="flex flex-wrap gap-4 pt-1">
              <label className="inline-flex items-center gap-1.5">
                <input type="checkbox" checked={wifi} onChange={(e) => setWifi(e.target.checked)} />
                Wi-Fi提供あり
              </label>
              <label className="inline-flex items-center gap-1.5">
                <input type="checkbox" checked={outlets} onChange={(e) => setOutlets(e.target.checked)} />
                コンセント利用可
              </label>
            </div>

            <label className="block space-y-1">
              <span className="font-medium text-slate-700">利用上の注意事項</span>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2"
              />
            </label>

            <div className="flex items-center justify-between pt-1">
              {justAdded ? (
                <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                  <CheckCircle2 className="h-4 w-4" /> マップと地域格差指標へ反映しました
                </span>
              ) : (
                <span className="text-slate-500">※本番DBには保存されずデモ環境内で動作します</span>
              )}
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-medium text-white hover:bg-blue-700"
              >
                <PlusCircle className="h-4 w-4" /> デモ用マップに追加する
              </button>
            </div>
          </form>
        </GlassCard>

        <div className="lg:col-span-5 space-y-4">
          {targetMetric && (
            <GlassCard className="p-5 space-y-2">
              <div className="text-sm font-bold text-slate-900">
                選択地域（{targetMetric.name}）の前後比較
              </div>
              <div className="grid grid-cols-2 gap-2.5 text-xs">
                <div className="liquid-glass-subtle rounded-2xl p-3">
                  <div className="text-slate-500">施設数変化</div>
                  <div className="text-base font-bold text-slate-900 mt-0.5">
                    {targetMetric.beforeFacilityCount} → {targetMetric.afterFacilityCount}件
                  </div>
                </div>
                <div className="liquid-glass-subtle rounded-2xl p-3">
                  <div className="text-slate-500">座席数変化</div>
                  <div className="text-base font-bold text-emerald-700 mt-0.5">
                    {targetMetric.beforeSeatCount} → {targetMetric.afterSeatCount}席
                  </div>
                </div>
              </div>
            </GlassCard>
          )}

          <GlassCard className="p-5 space-y-2.5 text-xs text-slate-700">
            <h3 className="text-sm font-bold text-slate-900">企業・自治体にとっての意義（構想整理）</h3>
            <ul className="list-disc list-inside space-y-1.5">
              <li>
                <strong>未利用時間の有効活用:</strong> 新設コストを抑え、平日の夕方以降の空き会議室や公共ロビーを活用できます。
              </li>
              <li>
                <strong>地域の学習環境への貢献:</strong> 中高生の通いやすい範囲に低料金の居場所を増やす仕組みを目指せます。
              </li>
              <li>
                <strong>地域との関係づくり:</strong> 次世代の学習支援を通じた地域社会との接点創出につながります。
              </li>
            </ul>
            <p className="text-[11px] text-slate-500 pt-1">
              ※実用化には施設の安全管理責任、入退室確認、緊急時連絡体制の整備が別途必要です。
            </p>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
