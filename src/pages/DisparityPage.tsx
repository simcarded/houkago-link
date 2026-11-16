import { useMemo, useState } from 'react';
import { Info, MapPin, TrendingUp } from 'lucide-react';
import type { Facility, RegionStat } from '../types';
import { computeRegionMetrics } from '../lib/disparity';
import { AnimatedNumber, GlassCard } from '../components/LiquidUI';

interface DisparityPageProps {
  regions: RegionStat[];
  simulatedSpaces: Facility[];
}

export function DisparityPage({ regions, simulatedSpaces }: DisparityPageProps) {
  const metrics = useMemo(() => computeRegionMetrics(regions, simulatedSpaces), [regions, simulatedSpaces]);
  const [regionAId, setRegionAId] = useState(metrics[0]?.id || 'nagoya-center');
  const [regionBId, setRegionBId] = useState(metrics[6]?.id || 'chita');
  const [showMethod, setShowMethod] = useState(false);

  const regionA = metrics.find((m) => m.id === regionAId) || metrics[0];
  const regionB = metrics.find((m) => m.id === regionBId) || metrics[metrics.length - 1];
  const maxSeats = Math.max(...metrics.map((m) => m.afterSeatCount), 1);

  return (
    <div className="space-y-5">
      <GlassCard className="p-5 sm:p-6 space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-[11px] font-medium text-amber-800 mb-1.5">
              デモ用の仮想データ（愛知県内地域比較モデル）
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
              学習場所の地域格差マップ
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 mt-1">
              施設数だけでなく、人口比・公共交通アクセス・夜間利用可能性を含めて地域差を確認できます。
              {simulatedSpaces.length > 0 && (
                <span className="ml-1 font-medium text-emerald-700">
                  （施設提供シミュレーション +{simulatedSpaces.length}件を反映中）
                </span>
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowMethod((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-white/85 border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-white"
          >
            <Info className="h-4 w-4 text-blue-600" />
            データ出典・集計注記
          </button>
        </div>

        {showMethod && (
          <div className="rounded-2xl bg-slate-50/90 border border-slate-200 p-4 text-xs text-slate-700 space-y-1">
            <div>
              <strong>データ区分:</strong> 本比較値は地理プレゼンテーション用の
              <strong>仮想デモデータ</strong>であり、実在自治体の調査統計ではありません。
            </div>
            <div>
              <strong>比較指標:</strong> 施設数・総座席数・100円以下施設数・20時以降利用可能施設数・人口10万人あたり座席数・交通アクセス指数（100点満点）。
            </div>
            <div>
              <strong>注意:</strong> 単純な施設数の多少だけでなく、地域面積・鉄道網・自宅学習環境の違いを考慮する必要があります。
            </div>
          </div>
        )}
      </GlassCard>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <GlassCard className="lg:col-span-7 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <MapPin className="h-4 w-4 text-blue-600" /> 地域別 学習座席数と施設提供後の変化
            </h2>
            <span className="text-[11px] text-slate-500">青: 初期 / 緑: シミュレーション増加分</span>
          </div>

          <div className="space-y-3">
            {metrics.map((m) => {
              const basePct = (m.beforeSeatCount / maxSeats) * 100;
              const addPct = (m.addedSeatCount / maxSeats) * 100;
              return (
                <div key={m.id} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-800">{m.name}</span>
                    <span className="text-slate-600 tabular-nums">
                      {m.afterFacilityCount}施設 /{' '}
                      <strong className="text-slate-900">
                        <AnimatedNumber value={m.afterSeatCount} suffix="席" />
                      </strong>
                      {m.addedSeatCount > 0 && (
                        <span className="text-emerald-700 font-bold ml-1">(+{m.addedSeatCount})</span>
                      )}
                    </span>
                  </div>
                  <div className="h-3.5 w-full rounded-full bg-slate-100 overflow-hidden flex">
                    <div
                      className="h-full bg-blue-500 transition-all duration-500"
                      style={{ width: `${basePct}%` }}
                    />
                    {addPct > 0 && (
                      <div
                        className="h-full bg-emerald-500 transition-all duration-500"
                        style={{ width: `${addPct}%` }}
                      />
                    )}
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-500">
                    <span>人口10万人あたり: {m.seatsPer10kAfter}席</span>
                    <span>アクセス指数: {m.transitAccessScore}/100 ・ 低料金: {m.afterLowCostCount}件</span>
                  </div>
                </div>
              );
            })}
          </div>
        </GlassCard>

        <GlassCard className="lg:col-span-5 p-5 space-y-4">
          <div className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
            <TrendingUp className="h-4 w-4 text-blue-600" /> 2地域の直接比較
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <select
              value={regionAId}
              onChange={(e) => setRegionAId(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-2.5 py-2 font-medium"
            >
              {metrics.map((m) => (
                <option key={m.id} value={m.id}>
                  地域A: {m.name}
                </option>
              ))}
            </select>
            <select
              value={regionBId}
              onChange={(e) => setRegionBId(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-2.5 py-2 font-medium"
            >
              {metrics.map((m) => (
                <option key={m.id} value={m.id}>
                  地域B: {m.name}
                </option>
              ))}
            </select>
          </div>

          {regionA && regionB && (
            <div className="space-y-2.5 text-xs">
              {[
                ['学習施設数', `${regionA.afterFacilityCount}件`, `${regionB.afterFacilityCount}件`],
                ['総座席数', `${regionA.afterSeatCount}席`, `${regionB.afterSeatCount}席`],
                ['100円以下の施設', `${regionA.afterLowCostCount}件`, `${regionB.afterLowCostCount}件`],
                ['20時以降利用可', `${regionA.afterEveningCount}件`, `${regionB.afterEveningCount}件`],
                ['人口10万人あたり座席', `${regionA.seatsPer10kAfter}席`, `${regionB.seatsPer10kAfter}席`],
                ['交通アクセス指数', `${regionA.transitAccessScore}点`, `${regionB.transitAccessScore}点`],
              ].map(([label, aVal, bVal]) => (
                <div
                  key={label}
                  className="liquid-glass-subtle rounded-2xl px-3.5 py-2.5 grid grid-cols-3 items-center"
                >
                  <span className="text-slate-600">{label}</span>
                  <span className="font-bold text-blue-700 text-center">{aVal}</span>
                  <span className="font-bold text-slate-900 text-center">{bVal}</span>
                </div>
              ))}

              <div className="rounded-2xl bg-blue-50/70 border border-blue-200/70 p-3 space-y-1 text-slate-700">
                <div>
                  <strong>{regionA.name}:</strong> {regionA.summary}
                </div>
                <div>
                  <strong>{regionB.name}:</strong> {regionB.summary}
                </div>
              </div>
            </div>
          )}
        </GlassCard>
      </div>
    </div>
  );
}
