import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createActiveWorkoutFromPlanDay, readActiveWorkout, writeActiveWorkout } from '../utils/activeWorkout';
import { PLAN_STORAGE_KEY } from '../utils/planRules';
import { readStorage } from '../utils/storage';
import { countValidSets, formatDuration, readWorkoutLogs } from '../utils/workoutHistory';
import type { ActiveWorkout } from '../types/activeWorkout';
import type { GeneratedPlan, GeneratedWorkoutDay, WorkoutLog } from '../types/workout';

type DashboardMuscleArea = 'chest' | 'back' | 'shoulders' | 'legs' | 'arms' | 'core';

type DashboardMuscleShortcut = {
  area: DashboardMuscleArea;
  label: string;
  icon: string;
  color: string;
  position: string;
  side: 'left' | 'right';
  labelPoint: [number, number];
  bodyPoint: [number, number];
};

const muscleShortcuts: DashboardMuscleShortcut[] = [
  {
    area: 'chest',
    label: '胸',
    icon: 'pectoralis',
    color: 'from-orange-500 to-rose-500',
    position: 'left-4 top-[17%] sm:left-10',
    side: 'left',
    labelPoint: [31, 30],
    bodyPoint: [49, 31]
  },
  {
    area: 'arms',
    label: '手臂',
    icon: 'arm',
    color: 'from-violet-500 to-fuchsia-500',
    position: 'left-2 top-[43%] sm:left-12',
    side: 'left',
    labelPoint: [35, 51],
    bodyPoint: [42, 44]
  },
  {
    area: 'core',
    label: '核心',
    icon: 'core',
    color: 'from-emerald-400 to-cyan-400',
    position: 'left-5 bottom-[17%] sm:left-14',
    side: 'left',
    labelPoint: [36, 72],
    bodyPoint: [50, 47]
  },
  {
    area: 'back',
    label: '背',
    icon: 'back',
    color: 'from-sky-400 to-blue-600',
    position: 'right-1 top-[18%] sm:right-10',
    side: 'right',
    labelPoint: [68, 30],
    bodyPoint: [56, 29]
  },
  {
    area: 'shoulders',
    label: '肩',
    icon: 'shoulder',
    color: 'from-amber-400 to-orange-500',
    position: 'right-3 top-[43%] sm:right-14',
    side: 'right',
    labelPoint: [66, 51],
    bodyPoint: [61, 33]
  },
  {
    area: 'legs',
    label: '腿',
    icon: 'leg',
    color: 'from-cyan-400 to-blue-500',
    position: 'right-3 bottom-[17%] sm:right-14',
    side: 'right',
    labelPoint: [66, 72],
    bodyPoint: [55, 63]
  }
];

export default function Dashboard() {
  const navigate = useNavigate();
  const [activeWorkout, setActiveWorkout] = useState<ActiveWorkout | null>(null);
  const [recentPlan, setRecentPlan] = useState<GeneratedPlan | null>(null);
  const [latestWorkout, setLatestWorkout] = useState<WorkoutLog | null>(null);
  const [selectedArea, setSelectedArea] = useState<DashboardMuscleArea>('chest');

  useEffect(() => {
    setActiveWorkout(readActiveWorkout());

    const plan = readStorage<GeneratedPlan | null>(PLAN_STORAGE_KEY, null);
    setRecentPlan(isGeneratedPlan(plan) ? plan : null);

    setLatestWorkout(readWorkoutLogs()[0] ?? null);
  }, []);

  const activeSummary = useMemo(() => {
    if (!activeWorkout) return null;
    const validSetCount = activeWorkout.exercises.reduce(
      (count, exercise) =>
        count + exercise.sets.filter((set) => isDisplayableNumber(set.weight) || isDisplayableNumber(set.reps)).length,
      0
    );
    return `${activeWorkout.exercises.length} 个动作 · ${validSetCount} 个有效组`;
  }, [activeWorkout]);

  const nextPlanDay = recentPlan?.days[0] ?? null;
  const selectedShortcut = muscleShortcuts.find((item) => item.area === selectedArea) ?? muscleShortcuts[0];

  const handleStartPlanDay = () => {
    if (!recentPlan || !nextPlanDay) return;

    const existing = readActiveWorkout();
    if (existing) {
      navigate('/workout-log');
      return;
    }

    writeActiveWorkout(createActiveWorkoutFromPlanDay(recentPlan, nextPlanDay));
    navigate('/workout-log');
  };

  return (
    <div className="relative -mx-4 -mt-5 min-h-[calc(100vh-6rem)] overflow-hidden bg-[#050914] px-4 pb-8 pt-6 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(49,119,255,0.2),transparent_28%),radial-gradient(circle_at_86%_28%,rgba(159,82,255,0.18),transparent_30%),linear-gradient(180deg,rgba(5,9,20,0),#050914_82%)]" />
      <div className="relative mx-auto max-w-3xl space-y-6">
        <header>
          <div className="flex items-start justify-between gap-3">
            <p className="text-nowrap text-[1.85rem] font-black italic leading-none tracking-normal text-white sm:text-5xl">
              MuscleMap <span className="bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">Fitness</span>
            </p>
          <div className="mt-1 flex shrink-0 items-center gap-2 rounded-full bg-slate-800/80 px-4 py-3 text-lg font-bold text-white shadow-xl shadow-black/30">
            <span aria-hidden="true">🔥</span>
            <span>{latestWorkout ? countValidSets(latestWorkout) : activeWorkout?.exercises.length ?? 0}</span>
          </div>
          </div>
          <h1 className="mt-10 text-[2.15rem] font-black leading-tight tracking-normal text-white sm:text-6xl">今天点亮哪块肌肉？</h1>
        </header>

        <section
          aria-label="2D 选肌群"
          className="rounded-[28px] border border-white/[0.08] bg-[linear-gradient(180deg,#1f1f22_0%,#151517_100%)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
        >
          <div className="relative min-h-[330px] overflow-hidden rounded-[1.6rem] bg-[radial-gradient(circle_at_50%_48%,rgba(62,113,255,0.2),transparent_38%)] sm:min-h-[410px]">
            <div className="absolute inset-8 rounded-full border border-blue-300/10" />
            <div className="absolute inset-14 rounded-full border border-blue-300/10" />
            <div className="absolute inset-x-0 top-0 h-full bg-[radial-gradient(circle,rgba(89,131,255,0.18)_1px,transparent_1px)] [background-size:14px_14px] opacity-40" />
            <MuscleFigure />
            <SelectedMuscleLine shortcut={selectedShortcut} />
            {muscleShortcuts.map((item) => (
              <MuscleShortcut
                key={item.label}
                {...item}
                selected={selectedArea === item.area}
                onSelect={() => setSelectedArea(item.area)}
              />
            ))}
            <Link
              to={`/three-muscle-selector?area=${selectedArea}`}
              data-testid="dashboard-selected-muscle-link"
              className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full border border-white/10 bg-slate-950/80 px-4 py-2 text-sm font-semibold text-blue-100 backdrop-blur transition hover:border-blue-300/70 focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              2D 选肌群
            </Link>
          </div>
        </section>

        <Link
          to="/workout-log"
          className="flex min-h-16 items-center justify-center gap-4 rounded-[1.65rem] bg-gradient-to-r from-blue-500 to-violet-500 px-6 py-4 text-2xl font-black text-white shadow-[0_16px_40px_rgba(72,91,255,0.42)] transition hover:from-blue-400 hover:to-violet-400 focus:outline-none focus:ring-2 focus:ring-blue-300"
        >
          <DumbbellIcon className="h-8 w-8" />
          {activeWorkout ? '继续训练' : '开始记录'}
        </Link>
        {activeSummary ? <p className="-mt-3 text-center text-sm font-medium text-blue-100">{activeSummary}</p> : null}

        <section>
          <div className="mb-4 flex items-center gap-3">
            <CalendarIcon className="h-7 w-7 text-violet-400" />
            <h2 className="text-2xl font-black text-white">最近计划</h2>
          </div>
          <RecentPlanCard plan={recentPlan} day={nextPlanDay} onStartPlanDay={handleStartPlanDay} />
        </section>

        <section>
          <RecentWorkoutCard log={latestWorkout} />
        </section>
      </div>
    </div>
  );
}

function RecentPlanCard({
  plan,
  day,
  onStartPlanDay
}: {
  plan: GeneratedPlan | null;
  day: GeneratedWorkoutDay | null;
  onStartPlanDay: () => void;
}) {
  return (
    <div
      data-testid="dashboard-recent-plan"
      className="rounded-[1.7rem] border border-white/10 bg-slate-800/55 p-4 shadow-xl shadow-black/25 backdrop-blur"
    >
      <div className="grid gap-4 sm:grid-cols-[150px_minmax(0,1fr)] sm:items-center">
        <div className="hidden aspect-square overflow-hidden rounded-3xl border border-white/10 bg-[radial-gradient(circle_at_50%_20%,rgba(255,255,255,0.28),transparent_22%),linear-gradient(145deg,#172236,#050914)] sm:block">
          <div className="flex h-full items-end justify-center bg-[linear-gradient(180deg,transparent,rgba(0,0,0,0.38))] pb-4">
            <BackPoseIcon className="h-24 w-24 text-blue-200 drop-shadow-[0_0_18px_rgba(96,165,250,0.65)]" />
          </div>
        </div>
        <div className="min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="truncate text-2xl font-black text-white">{plan?.name ?? '暂无训练计划'}</h3>
              <p className="mt-3 text-base text-slate-300">
                {day ? (
                  <>
                    <span className="text-blue-400">•</span> 今天可执行：<span className="font-semibold text-blue-300">{day.name}</span>
                  </>
                ) : (
                  '生成计划后会显示可执行训练日'
                )}
              </p>
            </div>
            <ChevronIcon className="mt-2 h-7 w-7 shrink-0 text-slate-400" />
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <Link
              to="/plan-builder"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-base font-bold text-white transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-violet-400"
            >
              <DocumentIcon className="h-5 w-5" />
              去计划页
            </Link>
            <button
              type="button"
              disabled={!plan || !day}
              onClick={onStartPlanDay}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-violet-500 px-4 py-3 text-base font-bold text-white transition hover:from-blue-400 hover:to-violet-400 focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:cursor-not-allowed disabled:opacity-45"
            >
              <PlayIcon className="h-5 w-5" />
              从计划开始
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function RecentWorkoutCard({ log }: { log: WorkoutLog | null }) {
  const duration = formatDuration(log?.durationSeconds);

  return (
    <Link
      data-testid="dashboard-recent-workout"
      to={log ? `/workout-history/${log.id}` : '/workout-history'}
      className="block rounded-[1.7rem] border border-white/10 bg-slate-800/45 p-5 shadow-xl shadow-black/25 backdrop-blur transition hover:border-blue-300/50 focus:outline-none focus:ring-2 focus:ring-blue-400"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <ClockIcon className="h-8 w-8 text-violet-400" />
            <h2 className="text-2xl font-black text-white">最近一次训练</h2>
          </div>
          <div className="mt-6 flex items-center gap-4 text-lg text-slate-300">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-blue-300/25 bg-blue-500/15 text-blue-300">
              <DumbbellIcon className="h-6 w-6" />
            </span>
            <p className="min-w-0 truncate">
              {log ? `${log.date} · ${log.exercises.length} 个动作 · ${countValidSets(log)} 组${duration ? ` · ${duration}` : ''}` : '完成训练后会显示在这里'}
            </p>
          </div>
        </div>
        <ChevronIcon className="mt-2 h-7 w-7 shrink-0 text-slate-400" />
      </div>
    </Link>
  );
}

function MuscleShortcut({
  area,
  label,
  icon,
  color,
  position,
  side,
  selected,
  onSelect
}: {
  area: DashboardMuscleArea;
  label: string;
  icon: string;
  color: string;
  position: string;
  side: string;
  selected: boolean;
  onSelect: () => void;
}) {
  const iconNode = (
    <span className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-white/20 bg-gradient-to-br ${color} p-[2px] shadow-lg shadow-black/35 sm:h-16 sm:w-16`}>
      <span className="flex h-full w-full items-center justify-center rounded-full bg-slate-950/80 text-white">
        <MuscleGlyph name={icon} />
      </span>
    </span>
  );
  const labelNode = <span className="shrink-0 text-xl font-black text-white sm:text-2xl">{label}</span>;
  return (
    <Link
      to={`/three-muscle-selector?area=${area}`}
      data-testid={`dashboard-muscle-shortcut-${area}`}
      aria-label={`${label} 2D 选肌群`}
      aria-current={selected ? 'true' : undefined}
      onFocus={onSelect}
      onMouseEnter={onSelect}
      onPointerDown={onSelect}
      className={`absolute ${position} z-10 flex items-center gap-3 rounded-full transition hover:scale-105 active:scale-100 focus:outline-none focus:ring-2 focus:ring-blue-300 ${
        selected ? 'scale-105' : 'opacity-88'
      }`}
    >
      {side === 'right' ? (
        <>
          {labelNode}
          {iconNode}
        </>
      ) : (
        <>
          {iconNode}
          {labelNode}
        </>
      )}
    </Link>
  );
}

function SelectedMuscleLine({
  shortcut
}: {
  shortcut: DashboardMuscleShortcut;
}) {
  const [x1, y1] = shortcut.labelPoint;
  const [x2, y2] = shortcut.bodyPoint;

  return (
    <svg className="pointer-events-none absolute inset-0 z-[1] h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      <line
        data-testid="dashboard-selected-muscle-line"
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke="rgba(125, 211, 252, 0.78)"
        strokeWidth="0.45"
        strokeDasharray="1.4 1.4"
        strokeLinecap="round"
      />
      <circle cx={x2} cy={y2} r="0.9" fill="rgba(125, 211, 252, 0.95)" />
    </svg>
  );
}

function MuscleFigure() {
  return (
    <img
      src="/images/musclemap-figure.png"
      alt=""
      className="pointer-events-none absolute left-1/2 top-3 h-[318px] w-[202px] -translate-x-1/2 object-contain drop-shadow-[0_0_26px_rgba(125,211,252,0.28)] sm:h-[410px] sm:w-[260px]"
    />
  );
}

function MuscleGlyph({ name }: { name: string }) {
  if (name === 'arm') {
    return (
      <svg className="h-8 w-8" viewBox="0 0 32 32" fill="none" aria-hidden="true">
        <path d="M8 21c5-1 8-5 10-11 3 1 5 4 4 8 3-1 5 1 5 4 0 4-4 6-9 6H9c-4 0-5-5-1-7Z" fill="currentColor" />
      </svg>
    );
  }
  if (name === 'leg') {
    return (
      <svg className="h-8 w-8" viewBox="0 0 32 32" fill="none" aria-hidden="true">
        <path d="M14 4h7l-3 11 5 7c2 3 0 6-4 6h-9c-2 0-2-3 0-4l6-3-5-8Z" fill="currentColor" />
      </svg>
    );
  }
  if (name === 'core') {
    return (
      <svg className="h-8 w-8" viewBox="0 0 32 32" fill="none" aria-hidden="true">
        <path d="M10 5h5v6h-5ZM17 5h5v6h-5ZM10 13h5v6h-5ZM17 13h5v6h-5ZM10 21h5v6h-5ZM17 21h5v6h-5Z" fill="currentColor" />
      </svg>
    );
  }
  if (name === 'back') {
    return (
      <svg className="h-8 w-8" viewBox="0 0 32 32" fill="none" aria-hidden="true">
        <path d="M16 5c6 2 9 7 9 15l-6-5-3 11-3-11-6 5c0-8 3-13 9-15Z" fill="currentColor" />
      </svg>
    );
  }
  if (name === 'shoulder') {
    return (
      <svg className="h-8 w-8" viewBox="0 0 32 32" fill="none" aria-hidden="true">
        <path d="M9 12c5-7 13-6 16 0-2 8-8 12-16 12 3-4 3-8 0-12Z" fill="currentColor" />
      </svg>
    );
  }
  return (
    <svg className="h-8 w-8" viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path d="M6 12c5-6 15-6 20 0l-3 10H9Z" fill="currentColor" />
    </svg>
  );
}

function DumbbellIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 8v8M8 6v12M16 6v12M19 8v8M8 12h8" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
    </svg>
  );
}

function CalendarIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M7 3v4M17 3v4M4 8h16M5 5h14a1 1 0 0 1 1 1v14H4V6a1 1 0 0 1 1-1Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function ClockIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 7v5l3 2" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

function DocumentIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M7 4h7l4 4v12H7V4ZM14 4v5h4M10 13h5M10 17h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PlayIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M8 5.75v12.5c0 .75.82 1.22 1.47.84l10-6.25a1 1 0 0 0 0-1.68l-10-6.25A.97.97 0 0 0 8 5.75Z" />
    </svg>
  );
}

function ChevronIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="m9 5 7 7-7 7" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function BackPoseIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 120 120" fill="none" aria-hidden="true">
      <path d="M60 18c9 0 16 7 16 16v6H44v-6c0-9 7-16 16-16Z" fill="currentColor" opacity=".28" />
      <path d="M30 46c18-11 42-11 60 0l-7 22-23-9-23 9-7-22Z" fill="currentColor" opacity=".85" />
      <path d="M37 68 22 95M83 68l15 27M49 64l-8 32M71 64l8 32" stroke="currentColor" strokeWidth="8" strokeLinecap="round" />
      <path d="M60 42v58" stroke="#07111f" strokeWidth="4" strokeLinecap="round" opacity=".5" />
    </svg>
  );
}

function isGeneratedPlan(value: unknown): value is GeneratedPlan {
  if (!value || typeof value !== 'object') return false;
  const plan = value as GeneratedPlan;
  return typeof plan.id === 'string' && typeof plan.name === 'string' && Array.isArray(plan.days);
}

function isDisplayableNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}
