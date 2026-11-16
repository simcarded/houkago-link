import { useState } from 'react';
import {
  ArrowRight,
  BarChart3,
  Building2,
  CalendarCheck,
  Heart,
  MapPin,
  Search,
  Sparkles,
} from 'lucide-react';
import type { Facility, Reservation } from '../types';
import type { AppRoute } from '../components/Navbar';
import { AnimatedNumber, GlassCard, SpaceIllustration } from '../components/LiquidUI';

interface HomePageProps {
  spaces: Facility[];
  favoriteIds: string[];
  reservations: Reservation[];
  onQuickSearch: (query: string) => void;
  onNavigate: (route: AppRoute) => void;
  onSelectSpace: (space: Facility) => void;
}

export function HomePage({
  spaces,
  favoriteIds,
  reservations,
  onQuickSearch,
  onNavigate,
  onSelectSpace,
}: HomePageProps) {
  const [query, setQuery] = useState('');

  const availableSpaces = spaces.filter((s) => s.availableSeats > 0);
  const favoriteSpaces = spaces.filter((s) => favoriteIds.includes(s.id));
  const activeReservations = reservations.filter((r) => r.status === 'confirmed');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onQuickSearch(query);
  };

  return (
    <div className="space-y-6">
      <GlassCard className="p-5 sm:p-7 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-200 px-2.5 py-0.5 text-[11px] font-medium text-blue-700 mb-2">
              地理授業プロトタイプ・愛知県モデル
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              放課後の学習スペースを探す
            </h1>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('/explore')}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition shadow-sm"
          >
            <MapPin className="h-4 w-4" />
            マップから探す
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="施設名・地域名・希望条件（例：栄 無料 Wi-Fi）"
              className="w-full rounded-2xl border border-slate-200/90 bg-white/90 pl-10 pr-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            type="submit"
            className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-medium text-white hover:bg-slate-800 transition"
          >
            検索する
          </button>
        </form>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="liquid-glass-subtle rounded-2xl p-3.5">
            <div className="text-xs text-slate-500">空席のある施設</div>
            <div className="text-2xl font-bold text-blue-700 mt-1">
              <AnimatedNumber value={availableSpaces.length} suffix="件" />
            </div>
          </div>
          <div className="liquid-glass-subtle rounded-2xl p-3.5">
            <div className="text-xs text-slate-500">利用可能な空席合計</div>
            <div className="text-2xl font-bold text-slate-900 mt-1">
              <AnimatedNumber
                value={availableSpaces.reduce((acc, s) => acc + s.availableSeats, 0)}
                suffix="席"
              />
            </div>
          </div>
          <div className="liquid-glass-subtle rounded-2xl p-3.5">
            <div className="text-xs text-slate-500 flex items-center gap-1">
              <Heart className="h-3.5 w-3.5 text-rose-500" /> お気に入り
            </div>
            <div className="text-2xl font-bold text-slate-900 mt-1">
              <AnimatedNumber value={favoriteSpaces.length} suffix="件" />
            </div>
          </div>
          <div className="liquid-glass-subtle rounded-2xl p-3.5">
            <div className="text-xs text-slate-500 flex items-center gap-1">
              <CalendarCheck className="h-3.5 w-3.5 text-emerald-600" /> 予約状況
            </div>
            <div className="text-2xl font-bold text-slate-900 mt-1">
              <AnimatedNumber value={activeReservations.length} suffix="件" />
            </div>
          </div>
        </div>
      </GlassCard>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <GlassCard interactive onClick={() => onNavigate('/disparity')} className="p-5 flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-blue-700">課題の可視化</div>
            <div className="text-base font-bold text-slate-900 mt-0.5">地域格差マップ</div>
            <div className="text-xs text-slate-600 mt-1">愛知県内の地域別施設数・座席数を比較</div>
          </div>
          <BarChart3 className="h-7 w-7 text-blue-600 shrink-0" />
        </GlassCard>

        <GlassCard interactive onClick={() => onNavigate('/simulation')} className="p-5 flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-emerald-700">解決策の実演</div>
            <div className="text-base font-bold text-slate-900 mt-0.5">企業・自治体の施設提供</div>
            <div className="text-xs text-slate-600 mt-1">空き会議室追加による変化をシミュレーション</div>
          </div>
          <Building2 className="h-7 w-7 text-emerald-600 shrink-0" />
        </GlassCard>

        <GlassCard interactive onClick={() => onNavigate('/explore')} className="p-5 flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-indigo-700">Workers AI 連携</div>
            <div className="text-base font-bold text-slate-900 mt-0.5">自然言語でスペース提案</div>
            <div className="text-xs text-slate-600 mt-1">「静かでWi-Fiがある無料施設」等</div>
          </div>
          <Sparkles className="h-7 w-7 text-indigo-600 shrink-0" />
        </GlassCard>
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">空席のある学習スペース（現在地・愛知県モデル）</h2>
          <button
            type="button"
            onClick={() => onNavigate('/explore')}
            className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:underline"
          >
            すべて見る <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {availableSpaces.slice(0, 6).map((space) => (
            <GlassCard
              key={space.id}
              interactive
              onClick={() => onSelectSpace(space)}
              className="p-4 space-y-3"
            >
              <SpaceIllustration hue={space.themeHue} providerType={space.providerType} label={space.name} />
              <div>
                <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                  <span>{space.regionName}</span>
                  <span className="font-bold text-blue-700">
                    {space.feeYen === 0 ? '無料' : `${space.feeYen}円`}
                  </span>
                </div>
                <h3 className="font-bold text-slate-900 mt-0.5 line-clamp-1">{space.name}</h3>
                <p className="text-xs text-slate-600 mt-1">
                  空席 {space.availableSeats}/{space.totalSeats}席 ・ {space.openTime}〜{space.closeTime}
                </p>
              </div>
            </GlassCard>
          ))}
        </div>
      </section>
    </div>
  );
}
