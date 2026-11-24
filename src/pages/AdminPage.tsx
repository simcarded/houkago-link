import { useEffect, useState } from 'react';
import { ShieldCheck, Plus } from 'lucide-react';
import type { Facility, RegionStat, Reservation, UserSession } from '../types';
import { GlassCard } from '../components/LiquidUI';
import { fetchSpaces } from '../lib/api';

interface AdminPageProps {
  session: UserSession;
  spaces: Facility[];
  regions: RegionStat[];
  onRefreshSpaces: () => Promise<void>;
}

export function AdminPage({ session, spaces, regions, onRefreshSpaces }: AdminPageProps) {
  const [adminSpaces, setAdminSpaces] = useState<Facility[]>(spaces);
  const [editing, setEditing] = useState<Facility | null>(null);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [providerName, setProviderName] = useState('');
  const [regionId, setRegionId] = useState(regions[0]?.id || 'nagoya-center');
  const [address, setAddress] = useState('');
  const [totalSeats, setTotalSeats] = useState(16);
  const feeYen = 0;
  const [adminReservations, setAdminReservations] = useState<Reservation[]>([]);
  const [statusMsg, setStatusMsg] = useState('');

  useEffect(() => {
    if (!session.user?.isAdmin) return;
    fetchSpaces(true).then((result) => setAdminSpaces(result.spaces));
    fetch('/api/reservations?scope=admin', { credentials: 'same-origin' })
      .then((r) => (r.ok ? r.json() : { reservations: [] }))
      .then((d: { reservations?: Reservation[] }) => setAdminReservations(d.reservations || []))
      .catch(() => {});
  }, [session.user?.isAdmin]);

  if (!session.user?.isAdmin) {
    return (
      <GlassCard className="p-6 text-center space-y-2">
        <ShieldCheck className="h-8 w-8 text-slate-400 mx-auto" />
        <h1 className="text-base font-bold text-slate-900">管理者権限が必要です</h1>
        <p className="text-xs text-slate-600">
          権限判定はCloudflare側の `ADMIN_GOOGLE_SUBS` によりサーバー側で厳格に制御されています。
        </p>
      </GlassCard>
    );
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg('');
    const region = regions.find((r) => r.id === regionId);
    const res = await fetch('/api/spaces', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({
        name,
        providerName,
        providerType: 'enterprise',
        regionId,
        regionName: region?.name || '名古屋市中心部',
        address,
        lat: region?.lat || 35.17,
        lng: region?.lng || 136.88,
        totalSeats,
        feeYen,
        wifi: true,
        outlets: true,
        quiet: true,
      }),
    });
    if (res.ok) {
      setName('');
      setProviderName('');
      setAddress('');
      setStatusMsg('施設をD1データベースへ登録しました。');
      await onRefreshSpaces();
      setAdminSpaces((await fetchSpaces(true)).spaces);
    } else {
      setStatusMsg('登録に失敗しました。');
    }
  };

  const togglePublish = async (space: Facility) => {
    const response = await fetch(`/api/spaces/${space.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ isPublished: !space.isPublished }),
    });
    if (!response.ok) { setStatusMsg('公開状態を変更できませんでした。'); return; }
    await onRefreshSpaces();
    setAdminSpaces((await fetchSpaces(true)).spaces);
  };

  const saveEdit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editing) return;
    setSaving(true); setStatusMsg('');
    try {
      const { name, providerName, address, notes, totalSeats, feeYen, openTime, closeTime, wifi, outlets, quiet, soloOk, groupOk, barrierFree } = editing;
      const response = await fetch(`/api/spaces/${editing.id}`, {
        method:'PATCH', headers:{'Content-Type':'application/json'}, credentials:'same-origin',
        body:JSON.stringify({ name, providerName, address, notes, totalSeats, feeYen, openTime, closeTime, wifi, outlets, quiet, soloOk, groupOk, barrierFree }),
      });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || '施設を更新できませんでした。');
      setEditing(null);
      setStatusMsg('施設情報を更新しました。');
      // The save has succeeded; a follow-up refresh failure must not report it as failed.
      try {
        await onRefreshSpaces();
        setAdminSpaces((await fetchSpaces(true)).spaces);
      } catch {
        setAdminSpaces((current) => current.map((space) =>
          space.id === editing.id ? { ...space, name, providerName, address, notes, totalSeats, feeYen, openTime, closeTime, wifi, outlets, quiet, soloOk, groupOk, barrierFree } : space,
        ));
      }
      setStatusMsg('施設情報を更新しました。');
    } catch (error) { setStatusMsg(error instanceof Error ? error.message : '施設を更新できませんでした。'); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-5">
      <GlassCard className="p-5 space-y-4">
        <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-blue-600" /> 管理者コンソール
        </h1>
        <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <input
            type="text"
            placeholder="施設名"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="rounded-xl border border-slate-200 bg-white px-3 py-2"
          />
          <input
            type="text"
            placeholder="提供団体名"
            value={providerName}
            onChange={(e) => setProviderName(e.target.value)}
            required
            className="rounded-xl border border-slate-200 bg-white px-3 py-2"
          />
          <input
            type="text"
            placeholder="所在地"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            required
            className="rounded-xl border border-slate-200 bg-white px-3 py-2"
          />
          <select
            value={regionId}
            onChange={(e) => setRegionId(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2"
          >
            {regions.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
          <input
            type="number"
            min={1}
            value={totalSeats}
            onChange={(e) => setTotalSeats(Number(e.target.value))}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2"
          />
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-1 rounded-xl bg-blue-600 px-4 py-2 text-white font-medium"
          >
            <Plus className="h-4 w-4" /> 施設を追加
          </button>
        </form>
        {statusMsg && <p role="status" className="text-xs text-slate-700">{statusMsg}</p>}
      </GlassCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <GlassCard className="p-5 space-y-2 text-xs">
          <h2 className="text-sm font-bold text-slate-900">登録施設一覧（公開切替）</h2>
          {adminSpaces.map((s) => (
            <div key={s.id} className="flex items-center justify-between border-b border-slate-100 py-2">
              <span>{s.name}</span>
              <div className="flex gap-2"><button type="button" onClick={() => { setStatusMsg(''); setEditing(s); }} className="rounded-lg border px-2.5 py-1 text-blue-700" aria-label={`${s.name}を編集`}>編集</button>
              <button
                type="button"
                onClick={() => togglePublish(s)}
                className={`rounded-lg px-2.5 py-1 font-medium ${
                  s.isPublished ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {s.isPublished ? '公開中' : '非公開'}
              </button>
              </div>
            </div>
          ))}
        </GlassCard>

        <GlassCard className="p-5 space-y-2 text-xs">
          <h2 className="text-sm font-bold text-slate-900">最新予約一覧 ({adminReservations.length})</h2>
          {adminReservations.slice(0, 10).map((r) => (
            <div key={r.id} className="border-b border-slate-100 py-1.5">
              {r.reserveDate} {r.startTime}〜{r.endTime} ・ {r.spaceName}（{r.status}）
            </div>
          ))}
        </GlassCard>
      </div>
      {editing && <GlassCard className="p-5 space-y-3 text-xs">
        <h2 className="text-sm font-bold">施設情報の編集</h2>
        <form onSubmit={saveEdit} className="grid gap-3 sm:grid-cols-2">
          <label>施設名<input required maxLength={80} value={editing.name} onChange={e => setEditing({...editing,name:e.target.value})} className="block w-full rounded border p-2" /></label>
          <label>提供団体名<input required maxLength={80} value={editing.providerName} onChange={e => setEditing({...editing,providerName:e.target.value})} className="block w-full rounded border p-2" /></label>
          <label>所在地<input required maxLength={120} value={editing.address} onChange={e => setEditing({...editing,address:e.target.value})} className="block w-full rounded border p-2" /></label>
          <label>備考<input maxLength={200} value={editing.notes} onChange={e => setEditing({...editing,notes:e.target.value})} className="block w-full rounded border p-2" /></label>
          <label>座席数<input required type="number" min={1} max={500} value={editing.totalSeats} onChange={e => setEditing({...editing,totalSeats:Number(e.target.value)})} className="block w-full rounded border p-2" /></label>
          <label>料金（円）<input required type="number" min={0} max={2000} value={editing.feeYen} onChange={e => setEditing({...editing,feeYen:Number(e.target.value)})} className="block w-full rounded border p-2" /></label>
          <label>開放開始<input required type="time" value={editing.openTime} onChange={e => setEditing({...editing,openTime:e.target.value})} className="block w-full rounded border p-2" /></label>
          <label>開放終了<input required type="time" value={editing.closeTime} onChange={e => setEditing({...editing,closeTime:e.target.value})} className="block w-full rounded border p-2" /></label>
          <fieldset className="sm:col-span-2 flex flex-wrap gap-3"><legend>設備・利用条件</legend>
            {([['wifi','Wi-Fi'],['outlets','コンセント'],['quiet','静かな環境'],['soloOk','個人学習'],['groupOk','グループ学習'],['barrierFree','バリアフリー']] as const).map(([key,label]) => <label key={key} className="flex gap-1"><input type="checkbox" checked={editing[key]} onChange={e => setEditing({...editing,[key]:e.target.checked})} />{label}</label>)}
          </fieldset>
          <div className="sm:col-span-2 flex gap-2"><button disabled={saving} className="rounded bg-blue-600 px-4 py-2 text-white">施設の変更を保存</button><button type="button" onClick={() => setEditing(null)} className="rounded border px-4 py-2">編集をやめる</button></div>
        </form>
      </GlassCard>}
    </div>
  );
}

