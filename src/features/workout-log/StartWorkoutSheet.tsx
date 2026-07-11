import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import DumbbellIcon from '../../components/icons/DumbbellIcon';
import type { GeneratedPlan, GeneratedWorkoutDay } from '../../types/workout';
import { getExerciseById } from '../../data/exercises';

interface StartWorkoutSheetProps {
  open: boolean;
  plan: GeneratedPlan | null;
  recentExerciseIds: string[];
  onClose: () => void;
  onStartFree: () => void;
  onStartPlanDay: (day: GeneratedWorkoutDay) => void;
  onStartRecentExercise: (exerciseId: string) => void;
}

export default function StartWorkoutSheet({ open, plan, recentExerciseIds, onClose, onStartFree, onStartPlanDay, onStartRecentExercise }: StartWorkoutSheetProps) {
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center" data-testid="start-workout-sheet">
      <button type="button" aria-label="关闭开始训练面板" className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={onClose} />
      <section role="dialog" aria-modal="true" aria-labelledby="start-workout-title" className="relative max-h-[82dvh] w-full max-w-[440px] overflow-y-auto rounded-t-[24px] border border-white/10 bg-[#111411] px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 text-white shadow-[0_-8px_32px_rgba(0,0,0,0.45)] sm:rounded-[24px] sm:mb-4 sm:p-5">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-zinc-700" aria-hidden="true" />
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="start-workout-title" className="text-xl font-black tracking-tight">开始训练</h2>
            <p className="mt-1 text-sm text-zinc-400">选择本次训练的来源</p>
          </div>
          <button type="button" onClick={onClose} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-xl text-zinc-400 transition hover:text-white focus:outline-none focus:ring-2 focus:ring-lime-300/60" aria-label="关闭">×</button>
        </div>

        <div className="mt-5 space-y-3">
          <button type="button" data-testid="start-active-workout" onClick={onStartFree} className="flex min-h-14 w-full items-center gap-3 rounded-2xl bg-lime-300 px-4 text-left text-black shadow-[0_6px_16px_rgba(163,230,53,0.16)] transition hover:bg-lime-200 active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-lime-200 focus:ring-offset-2 focus:ring-offset-[#111411]">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-black/10"><DumbbellIcon className="h-5 w-5" /></span>
            <span><strong className="block font-black">自由训练</strong><span className="mt-0.5 block text-xs font-semibold opacity-70">从空白训练开始记录</span></span>
          </button>

          <Link to="/three-muscle-selector" className="flex min-h-14 items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.045] px-4 transition hover:border-lime-300/30 hover:bg-lime-300/[0.06] focus:outline-none focus:ring-2 focus:ring-lime-300/60">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-lime-300/10 text-lime-300"><DumbbellIcon className="h-5 w-5" /></span>
            <span><strong className="block text-sm font-black text-zinc-100">从肌群选择</strong><span className="mt-0.5 block text-xs text-zinc-500">进入现有肌群选择器</span></span>
          </Link>
        </div>

        <div data-testid="latest-plan-start" className="mt-5 border-t border-white/10 pt-4">
          <h3 className="text-sm font-black text-zinc-200">从计划开始</h3>
          {plan && plan.days.length > 0 ? (
            <div className="mt-3 space-y-2">
              <p className="truncate text-xs font-semibold text-zinc-500">{plan.name}</p>
              {plan.days.map((day) => (
                <button key={day.id} type="button" data-testid={`start-plan-day-${day.id}`} onClick={() => onStartPlanDay(day)} className="flex min-h-12 w-full items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.035] px-4 text-left transition hover:border-lime-300/30 focus:outline-none focus:ring-2 focus:ring-lime-300/60">
                  <span className="min-w-0"><strong className="block truncate text-sm text-zinc-100">{day.name}</strong><span className="mt-0.5 block truncate text-xs text-zinc-500">{day.focus}</span></span>
                  <span className="shrink-0 text-xs font-bold text-lime-300">{day.items.length} 个动作</span>
                </button>
              ))}
            </div>
          ) : <p className="mt-2 text-sm text-zinc-500">暂无可用训练计划</p>}
        </div>

        {recentExerciseIds.length > 0 ? (
          <div className="mt-5 border-t border-white/10 pt-4">
            <h3 className="text-sm font-black text-zinc-200">最近使用动作</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {recentExerciseIds.map((exerciseId) => {
                const exercise = getExerciseById(exerciseId);
                return (
                  <button key={exerciseId} type="button" onClick={() => onStartRecentExercise(exerciseId)} className="min-h-11 rounded-xl border border-white/10 bg-white/[0.04] px-3 text-sm font-bold text-zinc-300 transition hover:border-lime-300/30 hover:text-lime-300 focus:outline-none focus:ring-2 focus:ring-lime-300/60">
                    {exercise?.name ?? exerciseId}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
