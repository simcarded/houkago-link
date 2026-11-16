import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Accessibility,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  Heart,
  MapPin,
  Plug,
  QrCode,
  Users,
  VolumeX,
  Wifi,
  X,
} from 'lucide-react';
import type { Facility, Reservation, UserSession } from '../types';
import { SpaceIllustration } from './LiquidUI';
import { todayInJapan } from '../lib/date';

interface SpaceDetailModalProps {
  space: Facility | null;
  onClose: () => void;
  isFavorite: boolean;
  onToggleFavorite: (spaceId: string) => Promise<void>;
  session: UserSession;
  onCreateReservation: (payload: {
    space: Facility;
    reserveDate: string;
    startTime: string;
    endTime: string;
    seatsCount: number;
    demoOverride?: boolean;
  }) => Promise<{ ok: boolean; error?: string; reservation?: Reservation }>;
  allowDemoBooking?: boolean;
  demoOnly?: boolean;
}

export function SpaceDetailModal({
  space,
  onClose,
  isFavorite,
  onToggleFavorite,
  session,
  onCreateReservation,
  allowDemoBooking = false,
  demoOnly = false,
}: SpaceDetailModalProps) {
  const [reserveDate, setReserveDate] = useState(todayInJapan);
  const [startTime, setStartTime] = useState('16:30');
  const [endTime, setEndTime] = useState('18:30');
  const [seatsCount, setSeatsCount] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [favoriteError, setFavoriteError] = useState('');
  const [savingFavorite, setSavingFavorite] = useState(false);
  const [bookingMode, setBookingMode] = useState<'demo' | 'saved' | null>(null);
  const [completed, setCompleted] = useState<Reservation | null>(null);

  useEffect(() => {
    setCompleted(null);
    setError('');
    setFavoriteError('');
    setBookingMode(null);
    setSubmitting(false);
  }, [space?.id]);

  if (!space) return null;

  const handleBook = async (demoOverride = false) => {
    setError('');
    if (!reserveDate || !startTime || !endTime || startTime >= endTime) {
      setError('終了時間は開始時間より後に設定してください。');
      return;
    }
    setSubmitting(true);
    let res;
    try {
      res = await onCreateReservation({ space, reserveDate, startTime, endTime, seatsCount, demoOverride });
    } catch {
      setSubmitting(false);
      setError('通信に失敗しました。予約状況を確認してから再試行してください。');
      return;
    }
    setSubmitting(false);
    if (!res.ok) {
      setError(res.error || '予約に失敗しました。');
      return;
    }
    if (res.reservation) setCompleted(res.reservation);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-slate-900/35 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: 18, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.98 }}
          transition={{ duration: 0.22 }}
          onClick={(e) => e.stopPropagation()}
          className="liquid-glass w-full max-w-2xl rounded-3xl p-5 sm:p-6 space-y-5 max-h-[90vh] overflow-y-auto"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="rounded-full bg-blue-50 border border-blue-200 px-2.5 py-0.5 text-[11px] font-medium text-blue-700">
                  {space.regionName}
                </span>
                {space.isSimulation ? (
                  <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700">
                    シミュレーション追加施設
                  </span>
                ) : (
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] text-slate-600">
                    デモ用仮想施設
                  </span>
                )}
              </div>
              <h2 className="text-xl font-bold text-slate-900">{space.name}</h2>
              <p className="text-xs text-slate-600 mt-0.5">提供元（架空）: {space.providerName}</p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={savingFavorite}
                onClick={async () => {
                  setFavoriteError('');
                  setSavingFavorite(true);
                  try { await onToggleFavorite(space.id); }
                  catch { setFavoriteError('お気に入りを保存できませんでした。再試行してください。'); }
                  finally { setSavingFavorite(false); }
                }}
                aria-label="お気に入り切替"
                aria-pressed={isFavorite}
                className={`rounded-xl p-2 border transition ${
                  isFavorite
                    ? 'bg-rose-50 border-rose-200 text-rose-600'
                    : 'bg-white/80 border-slate-200 text-slate-500 hover:text-rose-500'
                }`}
              >
                <Heart className={`h-4 w-4 ${isFavorite ? 'fill-current' : ''}`} />
              </button>
              <button
                type="button"
                onClick={onClose}
                aria-label="閉じる"
                className="rounded-xl p-2 bg-white/80 border border-slate-200 text-slate-600 hover:bg-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {favoriteError && <p role="alert" className="text-xs text-rose-700">{favoriteError}</p>}

          <SpaceIllustration hue={space.themeHue} providerType={space.providerType} label={space.name} />

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
            <div className="liquid-glass-subtle rounded-2xl p-3">
              <div className="text-slate-500">利用料金</div>
              <div className="text-base font-bold text-slate-900 mt-0.5">
                {space.feeYen === 0 ? '無料（0円）' : `${space.feeYen}円`}
              </div>
            </div>
            <div className="liquid-glass-subtle rounded-2xl p-3">
              <div className="text-slate-500">現在の空席 / 総座席</div>
              <div className="text-base font-bold text-blue-700 mt-0.5">
                {space.availableSeats} / {space.totalSeats}席
              </div>
            </div>
            <div className="liquid-glass-subtle rounded-2xl p-3">
              <div className="text-slate-500">開放時間</div>
              <div className="text-sm font-bold text-slate-900 mt-0.5">
                {space.openTime}〜{space.closeTime}
              </div>
            </div>
            <div className="liquid-glass-subtle rounded-2xl p-3">
              <div className="text-slate-500">混雑目安</div>
              <div className="text-sm font-bold text-slate-900 mt-0.5">17時台 やや混雑</div>
              <div className="text-[10px] text-slate-500">※デモ参考値</div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 text-xs">
            {space.wifi && (
              <span className="inline-flex items-center gap-1 rounded-xl bg-white/80 border border-slate-200 px-2.5 py-1">
                <Wifi className="h-3.5 w-3.5 text-blue-600" /> Wi-Fi
              </span>
            )}
            {space.outlets && (
              <span className="inline-flex items-center gap-1 rounded-xl bg-white/80 border border-slate-200 px-2.5 py-1">
                <Plug className="h-3.5 w-3.5 text-blue-600" /> コンセント
              </span>
            )}
            {space.quiet && (
              <span className="inline-flex items-center gap-1 rounded-xl bg-white/80 border border-slate-200 px-2.5 py-1">
                <VolumeX className="h-3.5 w-3.5 text-blue-600" /> 静かな環境
              </span>
            )}
            {space.groupOk && (
              <span className="inline-flex items-center gap-1 rounded-xl bg-white/80 border border-slate-200 px-2.5 py-1">
                <Users className="h-3.5 w-3.5 text-blue-600" /> グループ学習可
              </span>
            )}
            {space.barrierFree && (
              <span className="inline-flex items-center gap-1 rounded-xl bg-white/80 border border-slate-200 px-2.5 py-1">
                <Accessibility className="h-3.5 w-3.5 text-blue-600" /> バリアフリー
              </span>
            )}
          </div>

          <div className="liquid-glass-subtle rounded-2xl p-4 space-y-2 text-xs text-slate-700">
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1 font-medium text-slate-900">
                <MapPin className="h-3.5 w-3.5 text-blue-600" />
                {space.address}
              </span>
              <a
                href={`https://www.openstreetmap.org/directions?to=${space.lat},${space.lng}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-blue-700 hover:underline shrink-0"
              >
                経路を開く <ExternalLink className="h-3 w-3" />
              </a>
            </div>
            <p>{space.notes}</p>
            <div className="pt-1">
              <div className="font-medium text-slate-900 mb-1">利用ルール</div>
              <ul className="list-disc list-inside space-y-0.5 text-slate-600">
                {space.rules.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </div>
          </div>

          {completed ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 space-y-3"
            >
              <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
                <CheckCircle2 className="h-5 w-5" />
                予約を登録しました（プロトタイプ）
              </div>
              <div className="text-xs text-emerald-900 space-y-1">
                <div>予約ID: {completed.id}</div>
                <div>
                  日時: {completed.reserveDate} {completed.startTime}〜{completed.endTime}（{completed.seatsCount}席）
                </div>
                <div className="flex items-center gap-2 pt-1 text-[11px] text-emerald-800">
                  <QrCode className="h-4 w-4 shrink-0" />
                  <span>デモ用QRチェックイン受付コード発行済み（マイページから確認できます）</span>
                </div>
              </div>
              <p className="text-[11px] text-slate-600">
                ※本画面は構想を表現するプロトタイプであり、実在施設への入室権限を付与するものではありません。
              </p>
            </motion.div>
          ) : bookingMode ? (
            <div className="rounded-2xl bg-blue-50 border border-blue-200 p-4 space-y-3" aria-labelledby="booking-confirmation">
              <h3 id="booking-confirmation" className="text-sm font-bold text-slate-900">予約内容の確認{bookingMode === 'demo' ? '（発表用デモ）' : ''}</h3>
              <p className="text-sm text-slate-800">{space.name}<br />{reserveDate} {startTime}〜{endTime} ・ {seatsCount}席</p>
              <p className="text-xs text-slate-600">選択日時の空席は確定時に確認します。</p>
              {error && <p role="alert" className="text-xs text-rose-700">{error}</p>}
              <div className="flex flex-wrap gap-2">
                <button type="button" disabled={submitting} onClick={() => { setBookingMode(null); setError(''); }} className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs">内容を修正</button>
                <button type="button" disabled={submitting} onClick={() => handleBook(bookingMode === 'demo')} className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-medium text-white disabled:opacity-50">{submitting ? '予約処理中...' : 'この内容で確定'}</button>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl bg-white/80 border border-slate-200/80 p-4 space-y-3">
              <div className="text-sm font-bold text-slate-900">利用日時の予約</div>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 text-xs">
                <label className="space-y-1">
                  <span className="text-slate-600 flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" /> 利用日
                  </span>
                  <input
                    type="date"
                    value={reserveDate}
                    onChange={(e) => setReserveDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-2"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-slate-600 flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" /> 開始
                  </span>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-2"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-slate-600 flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" /> 終了
                  </span>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-2"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-slate-600">座席数</span>
                  <select
                    value={seatsCount}
                    onChange={(e) => setSeatsCount(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-2"
                  >
                    {[1, 2, 3, 4].map((n) => (
                      <option key={n} value={n}>
                        {n}席
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {error && <p className="text-xs text-rose-600 font-medium">{error}</p>}

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <span className="text-[11px] text-slate-500">
                  ※選択日時の空席は予約時に確認します。実用化時は安全管理・入退室確認が必要です。
                </span>
                <div className="flex flex-wrap gap-2">
                  {allowDemoBooking && (
                    <button
                      type="button"
                      disabled={submitting || space.availableSeats < seatsCount}
                      onClick={() => { setError(''); setBookingMode('demo'); }}
                      className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                      デモ予約の内容を確認（発表用）
                    </button>
                  )}
                  {!demoOnly && (session.authenticated ? (
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => { setError(''); setBookingMode('saved'); }}
                      className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                      予約内容を確認
                    </button>
                  ) : (
                    <div className="flex flex-wrap items-center gap-2">
                      <a href="/mypage" className="text-xs text-blue-700 underline">データの扱い</a>
                      <a
                        href="/api/auth/login"
                        className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-medium text-white hover:bg-blue-700"
                      >
                        Googleでログインして予約保存
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
