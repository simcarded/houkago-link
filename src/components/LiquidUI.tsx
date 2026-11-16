import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import type { ProviderType } from '../types';

export function GlassCard({
  children,
  className = '',
  interactive = false,
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  interactive?: boolean;
  onClick?: () => void;
}) {
  return (
    <motion.div
      onClick={onClick}
      whileHover={interactive ? { y: -2, scale: 1.005 } : undefined}
      whileTap={interactive ? { scale: 0.99 } : undefined}
      transition={{ duration: 0.2 }}
      className={`liquid-glass rounded-3xl ${interactive ? 'cursor-pointer' : ''} ${className}`}
    >
      {children}
    </motion.div>
  );
}

export function AnimatedNumber({ value, suffix = '' }: { value: number; suffix?: string }) {
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    const start = display;
    const diff = value - start;
    if (diff === 0) return;
    const startTime = performance.now();
    const duration = 450;
    let raf = 0;

    const tick = (now: number) => {
      const progress = Math.min(1, (now - startTime) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(start + diff * eased));
      if (progress < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);

  return (
    <span className="tabular-nums">
      {display.toLocaleString()}
      {suffix}
    </span>
  );
}

export function FullPageSkeleton() {
  return (
    <div
      className="min-h-screen px-4 py-6 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6"
      aria-label="読み込み中"
    >
      <div className="liquid-glass rounded-2xl h-16 px-5 flex items-center justify-between">
        <div className="skeleton-shimmer h-6 w-36 rounded-lg" />
        <div className="hidden md:flex gap-3">
          <div className="skeleton-shimmer h-8 w-20 rounded-xl" />
          <div className="skeleton-shimmer h-8 w-20 rounded-xl" />
          <div className="skeleton-shimmer h-8 w-24 rounded-xl" />
        </div>
        <div className="skeleton-shimmer h-9 w-24 rounded-xl" />
      </div>

      <div className="liquid-glass rounded-3xl p-6 space-y-4">
        <div className="skeleton-shimmer h-7 w-64 rounded-lg" />
        <div className="skeleton-shimmer h-12 w-full rounded-2xl" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="skeleton-shimmer h-20 rounded-2xl" />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="liquid-glass rounded-3xl p-5 space-y-3">
            <div className="skeleton-shimmer h-36 w-full rounded-2xl" />
            <div className="skeleton-shimmer h-5 w-3/4 rounded-md" />
            <div className="skeleton-shimmer h-4 w-1/2 rounded-md" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function SectionSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {[0, 1].map((i) => (
        <div key={i} className="liquid-glass rounded-3xl p-5 space-y-3">
          <div className="skeleton-shimmer h-28 w-full rounded-2xl" />
          <div className="skeleton-shimmer h-5 w-2/3 rounded-md" />
          <div className="skeleton-shimmer h-4 w-1/3 rounded-md" />
        </div>
      ))}
    </div>
  );
}

export function ErrorRetryCard({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <GlassCard className="p-6 text-center space-y-3 border-amber-200/80">
      <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
        <AlertTriangle className="h-5 w-5" />
      </div>
      <p className="text-sm font-medium text-slate-800">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition"
      >
        <RotateCcw className="h-4 w-4" />
        再試行する
      </button>
    </GlassCard>
  );
}

export function SpaceIllustration({
  hue = 212,
  providerType,
  label,
}: {
  hue?: number;
  providerType: ProviderType;
  label: string;
}) {
  const tag =
    providerType === 'enterprise'
      ? '企業提供スペース'
      : providerType === 'municipality'
        ? '自治体施設'
        : '地域連携スペース';

  return (
    <div
      className="relative h-36 w-full overflow-hidden rounded-2xl border border-white/80"
      style={{
        background: `linear-gradient(135deg, hsla(${hue}, 82%, 95%, 1) 0%, hsla(${hue + 14}, 75%, 88%, 1) 100%)`,
      }}
    >
      <svg
        viewBox="0 0 320 140"
        className="h-full w-full opacity-90"
        role="img"
        aria-label={`${label}のイメージ図`}
      >
        <rect x="28" y="34" width="120" height="78" rx="10" fill="rgba(255,255,255,0.82)" />
        <rect x="164" y="24" width="128" height="88" rx="12" fill="rgba(255,255,255,0.68)" />
        <rect x="44" y="50" width="38" height="24" rx="4" fill={`hsla(${hue}, 70%, 62%, 0.35)`} />
        <rect x="92" y="50" width="38" height="24" rx="4" fill={`hsla(${hue}, 70%, 62%, 0.25)`} />
        <rect x="180" y="46" width="96" height="10" rx="5" fill={`hsla(${hue}, 75%, 52%, 0.35)`} />
        <rect x="180" y="66" width="66" height="8" rx="4" fill="rgba(148,163,184,0.35)" />
        <circle cx="258" cy="86" r="14" fill={`hsla(${hue}, 78%, 55%, 0.28)`} />
      </svg>
      <span className="absolute left-3 top-3 rounded-full bg-white/85 px-2.5 py-0.5 text-[11px] font-medium text-slate-700 backdrop-blur">
        {tag}
      </span>
    </div>
  );
}
