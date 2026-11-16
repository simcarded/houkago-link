import { useState } from 'react';
import { Calendar, Heart, LogIn, LogOut, QrCode, Trash2 } from 'lucide-react';
import type { Facility, Reservation, UserSession } from '../types';
import { GlassCard } from '../components/LiquidUI';

interface MyPageProps {
  session: UserSession;
  spaces: Facility[];
  reservations: Reservation[];
  favoriteIds: string[];
  onCancelReservation: (id: string) => Promise<void>;
  onCheckInReservation: (id: string) => Promise<void>;
  onReschedule: (id: string, changes: { reserveDate: string; startTime: string; endTime: string; seatsCount: number }) => Promise<void>;
  onSelectSpace: (space: Facility) => void;
  onLogout: () => Promise<void>;
}

export function MyPage({
  session,
  spaces,
  reservations,
  favoriteIds,
  onCancelReservation,
  onCheckInReservation,
  onReschedule,
  onSelectSpace,
  onLogout,
}: MyPageProps) {
  const [qrTarget, setQrTarget] = useState<Reservation | null>(null);
  const [editing, setEditing] = useState<Reservation | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const favoriteSpaces = spaces.filter((s) => favoriteIds.includes(s.id));
  const upcoming = reservations.filter((r) => r.status !== 'cancelled');
  const history = reservations.filter((r) => r.status === 'cancelled');

  return (
    <div className="space-y-5">
      <GlassCard className="p-5 sm:p-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">マイページ</h1>
          <p className="text-xs text-slate-600 mt-0.5">
            {session.authenticated
              ? `Googleアカウント連携中（表示名: ${session.user?.displayName}）`
              : '未ログイン状態（ローカル保存のデモ予約・お気に入りを表示しています）'}
          </p>
        </div>

        {session.authenticated ? (
          <button
            type="button"
            onClick={onLogout}
            className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-medium text-white hover:bg-slate-800"
          >
            <LogOut className="h-4 w-4" /> ログアウト
          </button>
        ) : (
          <a
            href="/api/auth/login"
            className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-medium text-white hover:bg-blue-700"
          >
            <LogIn className="h-4 w-4" /> Googleでログイン
          </a>
        )}
      </GlassCard>

      {new URLSearchParams(window.location.search).has('auth_error') && (
        <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          Googleログインは現在利用できません。発表用のデモ予約はプレゼンモードで利用できます。
        </p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <GlassCard className="p-5 space-y-3">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
            <Calendar className="h-4 w-4 text-blue-600" /> 今後の予約・チェックイン
          </h2>
          {error && <p role="alert" className="text-xs text-rose-700">{error}</p>}
          {upcoming.length === 0 ? (
            <p className="text-xs text-slate-500">予約はありません。</p>
          ) : (
            <div className="space-y-2.5">
              {upcoming.map((r) => (
                <div
                  key={r.id}
                  className="liquid-glass-subtle rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-2 text-xs"
                >
                  <div>
                    <div className="font-bold text-slate-900">{r.spaceName}</div>
                    <div className="text-slate-600">
                      {r.reserveDate} {r.startTime}〜{r.endTime} ・ {r.seatsCount}席 ・{' '}
                      <span className="font-medium text-blue-700">
                        {r.status === 'checked_in' ? 'チェックイン済' : '予約確定'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={async () => {
                        setError('');
                        try { await onCheckInReservation(r.id); setQrTarget(r); }
                        catch { setError('チェックインを保存できませんでした。再試行してください。'); }
                      }}
                      disabled={r.status !== 'confirmed'}
                      className="inline-flex items-center gap-1 rounded-lg bg-blue-50 border border-blue-200 px-2.5 py-1 text-blue-700"
                    >
                      <QrCode className="h-3.5 w-3.5" /> QRデモ
                    </button>
                    {r.status === 'confirmed' && <button type="button" onClick={() => { setError(''); setEditing(r); }}
                      className="rounded-lg bg-white border border-slate-200 px-2.5 py-1 text-blue-700">変更</button>}
                    <button
                      type="button"
                      disabled={r.status !== 'confirmed'}
                      onClick={async () => { setError(''); try { await onCancelReservation(r.id); } catch { setError('予約を取り消せませんでした。再試行してください。'); } }}
                      className="inline-flex items-center gap-1 rounded-lg bg-rose-50 border border-rose-200 px-2.5 py-1 text-rose-700"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> 取消
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {editing && <form className="space-y-2 rounded-2xl border border-blue-200 bg-white p-3 text-xs" onSubmit={async (event) => {
            event.preventDefault(); setSaving(true); setError('');
            if (!editing.reserveDate || editing.startTime >= editing.endTime || !Number.isInteger(editing.seatsCount) || editing.seatsCount < 1 || editing.seatsCount > 4) {
              setError('日時と座席数を確認してください。'); setSaving(false); return;
            }
            try { await onReschedule(editing.id, { reserveDate: editing.reserveDate, startTime: editing.startTime, endTime: editing.endTime, seatsCount: editing.seatsCount }); setEditing(null); }
            catch (reason) { setError(reason instanceof Error ? reason.message : '予約を変更できませんでした。'); }
            finally { setSaving(false); }
          }}>
            <strong>予約日時・座席数の変更</strong>
            <div className="grid grid-cols-2 gap-2">
              <label>利用日<input required type="date" value={editing.reserveDate} onChange={(e) => setEditing({ ...editing, reserveDate: e.target.value })} className="block w-full rounded border p-1" /></label>
              <label>座席数<input required type="number" min="1" max="4" value={editing.seatsCount} onChange={(e) => setEditing({ ...editing, seatsCount: Number(e.target.value) })} className="block w-full rounded border p-1" /></label>
              <label>開始<input required type="time" value={editing.startTime} onChange={(e) => setEditing({ ...editing, startTime: e.target.value })} className="block w-full rounded border p-1" /></label>
              <label>終了<input required type="time" value={editing.endTime} onChange={(e) => setEditing({ ...editing, endTime: e.target.value })} className="block w-full rounded border p-1" /></label>
            </div>
            <div className="flex gap-2"><button disabled={saving} className="rounded bg-blue-600 px-3 py-1 text-white">変更を保存</button><button type="button" onClick={() => setEditing(null)} className="rounded border px-3 py-1">戻る</button></div>
          </form>}

          {qrTarget && (
            <div className="rounded-2xl bg-blue-50 border border-blue-200 p-3 text-xs text-blue-900">
              <strong>QRチェックイン（デモ）:</strong> 受付提示コード「{qrTarget.id}」を確認しました。
            </div>
          )}
        </GlassCard>

        <GlassCard className="p-5 space-y-3">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
            <Heart className="h-4 w-4 text-rose-500" /> お気に入り施設 ({favoriteSpaces.length})
          </h2>
          {favoriteSpaces.length === 0 ? (
            <p className="text-xs text-slate-500">お気に入り登録された施設はありません。</p>
          ) : (
            <div className="space-y-2">
              {favoriteSpaces.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => onSelectSpace(s)}
                  className="w-full text-left liquid-glass-subtle rounded-2xl p-3 hover:bg-white transition flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="font-bold text-slate-900">{s.name}</div>
                    <div className="text-slate-500">
                      {s.regionName} ・ {s.feeYen === 0 ? '無料' : `${s.feeYen}円`}
                    </div>
                  </div>
                  <span className="text-blue-700 font-medium">空席 {s.availableSeats}</span>
                </button>
              ))}
            </div>
          )}

          {history.length > 0 && (
            <div className="pt-2 border-t border-slate-200/70">
              <div className="text-xs font-medium text-slate-500 mb-1.5">キャンセル済み履歴</div>
              {history.slice(0, 3).map((h) => (
                <div key={h.id} className="text-[11px] text-slate-500">
                  {h.reserveDate} {h.spaceName}（取消）
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      </div>
    </div>
  );
}
