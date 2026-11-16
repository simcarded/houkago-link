import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  Play,
  RotateCcw,
  Timer,
} from 'lucide-react';
import type { Facility, RegionStat, Reservation, SearchFilters, UserSession } from '../types';
import { DisparityPage } from './DisparityPage';
import { HomePage } from './HomePage';
import { ExplorePage } from './ExplorePage';
import { SimulationPage } from './SimulationPage';
import { GlassCard, SpaceIllustration } from '../components/LiquidUI';

interface DemoPageProps {
  spaces: Facility[];
  regions: RegionStat[];
  simulatedSpaces: Facility[];
  favoriteIds: string[];
  reservations: Reservation[];
  filters: SearchFilters;
  onChangeFilters: (next: SearchFilters) => void;
  onResetFilters: () => void;
  onAddSimulatedSpace: (space: Omit<Facility, 'id' | 'availableSeats'>) => void;
  onResetAllDemo: () => void;
  onSelectSpace: (space: Facility) => void;
  session: UserSession;
}

const STEPS = [
  { id: 1, title: 'STEP 1：課題発見', subtitle: '愛知県内の地域格差マップで学習環境の偏りを確認' },
  { id: 2, title: 'STEP 2：理想の学習環境', subtitle: '低料金（0〜100円）・Wi-Fi・夕方以降も使える場所の例' },
  { id: 3, title: 'STEP 3：放課後Linkの提案', subtitle: '通常ホーム画面・マップ検索で既存資源を見える化' },
  { id: 4, title: 'STEP 4：具体的な仕組み', subtitle: '空席確認・予約実演 ＋ 企業・自治体の施設提供' },
  { id: 5, title: 'STEP 5：期待できる効果', subtitle: '施設提供前後の地域格差マップ変化を比較' },
];

export function DemoPage(props: DemoPageProps) {
  const [step, setStep] = useState(1);
  const [secondsLeft, setSecondsLeft] = useState(240);
  const [timerRunning, setTimerRunning] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [step4Tab, setStep4Tab] = useState<'book' | 'provide'>('book');

  useEffect(() => {
    if (!timerRunning) return;
    const id = setInterval(() => {
      setSecondsLeft((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(id);
  }, [timerRunning]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
      if (e.key === 'ArrowRight') setStep((s) => Math.min(5, s + 1));
      if (e.key === 'ArrowLeft') setStep((s) => Math.max(1, s - 1));
      if (e.key.toLowerCase() === 'r') handleReset();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      await document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const handleReset = () => {
    props.onResetAllDemo();
    setStep(1);
    setSecondsLeft(240);
    setTimerRunning(false);
  };

  const mins = Math.floor(secondsLeft / 60);
  const secs = String(secondsLeft % 60).padStart(2, '0');
  const currentStep = STEPS[step - 1];
  const baseSpaces = props.spaces.filter((s) => !s.isSimulation);

  return (
    <div className="space-y-4">
      <GlassCard className="p-4 flex flex-wrap items-center justify-between gap-3 border-blue-200/80">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-blue-600 px-2.5 py-0.5 text-[11px] font-bold text-white">
              4分間プレゼン専用モード
            </span>
            <span className="text-xs font-bold text-slate-900">{currentStep.title}</span>
          </div>
          <p className="text-xs text-slate-600">{currentStep.subtitle}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setTimerRunning((v) => !v)}
            className="inline-flex items-center gap-1 rounded-xl bg-white border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-800"
          >
            <Timer className="h-3.5 w-3.5 text-blue-600" />
            <span className="tabular-nums">
              {mins}:{secs}
            </span>
            <span className="text-[10px] text-slate-500">{timerRunning ? '停止' : '開始'}</span>
          </button>

          <button
            type="button"
            disabled={step === 1}
            onClick={() => setStep((s) => Math.max(1, s - 1))}
            className="inline-flex items-center gap-1 rounded-xl bg-white border border-slate-200 px-2.5 py-1.5 text-xs font-medium disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" /> 前へ
          </button>
          <button
            type="button"
            disabled={step === 5}
            onClick={() => setStep((s) => Math.min(5, s + 1))}
            className="inline-flex items-center gap-1 rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40"
          >
            次へ <ChevronRight className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={toggleFullscreen}
            title="全画面切替"
            className="rounded-xl bg-white border border-slate-200 p-1.5 text-slate-700"
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-1 rounded-xl bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-white"
          >
            <RotateCcw className="h-3.5 w-3.5" /> 初期化
          </button>
        </div>

        <div className="w-full grid grid-cols-5 gap-1.5 pt-1">
          {STEPS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setStep(s.id)}
              className={`h-2 rounded-full transition ${
                s.id <= step ? 'bg-blue-600' : 'bg-slate-200'
              }`}
              aria-label={s.title}
            />
          ))}
        </div>
      </GlassCard>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.22 }}
        >
          {step === 1 && <DisparityPage regions={props.regions} simulatedSpaces={[]} />}

          {step === 2 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {baseSpaces.slice(0, 3).map((s) => (
                <GlassCard key={s.id} className="p-5 space-y-3">
                  <SpaceIllustration hue={s.themeHue} providerType={s.providerType} label={s.name} />
                  <div className="text-xs text-blue-700 font-bold">
                    {s.feeYen === 0 ? '無料（0円）' : `${s.feeYen}円`} ・ {s.openTime}〜{s.closeTime}
                  </div>
                  <h3 className="text-base font-bold text-slate-900">{s.name}</h3>
                  <p className="text-xs text-slate-600">{s.notes}</p>
                  <button
                    type="button"
                    onClick={() => props.onSelectSpace(s)}
                    className="w-full rounded-xl bg-blue-600 py-2 text-xs font-medium text-white hover:bg-blue-700"
                  >
                    詳細・空席を確認
                  </button>
                </GlassCard>
              ))}
            </div>
          )}

          {step === 3 && (
            <HomePage
              spaces={props.spaces}
              favoriteIds={props.favoriteIds}
              reservations={props.reservations}
              onQuickSearch={() => setStep(4)}
              onNavigate={() => setStep(4)}
              onSelectSpace={props.onSelectSpace}
            />
          )}

          {step === 4 && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setStep4Tab('book')}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-medium ${
                    step4Tab === 'book'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white border border-slate-200 text-slate-700'
                  }`}
                >
                  <Play className="h-3.5 w-3.5" /> 4-A. 施設検索＆デモ予約実演
                </button>
                <button
                  type="button"
                  onClick={() => setStep4Tab('provide')}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-medium ${
                    step4Tab === 'provide'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-white border border-slate-200 text-slate-700'
                  }`}
                >
                  <Play className="h-3.5 w-3.5" /> 4-B. 企業・自治体による施設提供シミュレーション
                </button>
              </div>

              {step4Tab === 'book' ? (
                <ExplorePage
                  spaces={props.spaces}
                  regions={props.regions}
                  filters={props.filters}
                  onChangeFilters={props.onChangeFilters}
                  onResetFilters={props.onResetFilters}
                  onSelectSpace={props.onSelectSpace}
                />
              ) : (
                <SimulationPage
                  regions={props.regions}
                  baseSpacesCount={baseSpaces.length}
                  baseTotalSeats={baseSpaces.reduce((a, b) => a + b.totalSeats, 0)}
                  simulatedSpaces={props.simulatedSpaces}
                  onAddSimulatedSpace={props.onAddSimulatedSpace}
                  onResetSimulation={props.onResetAllDemo}
                />
              )}
            </div>
          )}

          {step === 5 && (
            <div className="space-y-4">
              <GlassCard className="p-5 bg-emerald-50/70 border-emerald-200">
                <div className="text-sm font-bold text-emerald-900">
                  新規建設だけでなく、地域の未利用スペース活用で学習場所の偏りを緩和
                </div>
                <p className="text-xs text-emerald-800 mt-1">
                  追加された施設数: +{props.simulatedSpaces.length}件 / 追加座席数: +
                  {props.simulatedSpaces.reduce((a, b) => a + b.totalSeats, 0)}席（下の地域格差マップに反映）
                </p>
              </GlassCard>
              <DisparityPage regions={props.regions} simulatedSpaces={props.simulatedSpaces} />
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
