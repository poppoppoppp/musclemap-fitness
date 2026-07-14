import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import InteractiveMuscleMap2D, { interactive2DMuscleIds, type MuscleMapView } from '../muscle/InteractiveMuscleMap2D';
import { getMuscleById, muscles } from '../../data/muscles';
import type { Exercise } from '../../types/exercise';
import { exerciseCategories, filterExercises, getRelatedExercises, type ExerciseCategoryId } from '../../utils/exerciseFilters';
import PostureProtocolBrowser from './PostureProtocolBrowser';

type PickerMode = 'list' | 'muscle2d' | 'posture';

type ExercisePickerSheetProps = {
  open: boolean;
  existingExerciseIds: Set<string>;
  onAddExercise: (exerciseId: string) => boolean;
  onAddPostureProtocol: (protocolId: string, selectedExerciseIds?: string[]) => boolean;
  initialPostureProtocolId?: string | null;
  initialPostureCategoryId?: string | null;
  initialPostureScrollTop?: number;
  onClose: () => void;
};

const defaultMuscleId = 'latissimus-dorsi';
const transitionMs = 250;

export default function ExercisePickerSheet({ open, existingExerciseIds, onAddExercise, onAddPostureProtocol, initialPostureProtocolId, initialPostureCategoryId, initialPostureScrollTop, onClose }: ExercisePickerSheetProps) {
  const [mounted, setMounted] = useState(open);
  const [entered, setEntered] = useState(false);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<ExerciseCategoryId>('all');
  const [mode, setMode] = useState<PickerMode>('list');
  const [selectedMuscleId, setSelectedMuscleId] = useState(defaultMuscleId);
  const [muscleView, setMuscleView] = useState<MuscleMapView>('back');
  const [status, setStatus] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  const filteredExercises = useMemo(() => filterExercises(query, category), [query, category]);
  const relatedExercises = useMemo(() => getRelatedExercises(selectedMuscleId), [selectedMuscleId]);
  const selectedMuscle = getMuscleById(selectedMuscleId);
  const visibleMuscles = useMemo(() => {
    const bodyPart = getMuscleById(selectedMuscleId)?.bodyPart;
    return muscles.filter((muscle) => muscle.bodyPart === bodyPart && interactive2DMuscleIds.includes(muscle.id));
  }, [selectedMuscleId]);

  useEffect(() => {
    if (open) {
      restoreFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      setMounted(true);
      setQuery('');
      setCategory('all');
      setMode(initialPostureProtocolId ? 'posture' : 'list');
      setSelectedMuscleId(defaultMuscleId);
      setMuscleView('back');
      setStatus('');
      const frame = window.requestAnimationFrame(() => setEntered(true));
      return () => window.cancelAnimationFrame(frame);
    }

    setEntered(false);
    const timeout = window.setTimeout(() => {
      setMounted(false);
      restoreFocusRef.current?.focus();
    }, transitionMs);
    return () => window.clearTimeout(timeout);
  }, [initialPostureProtocolId, open]);

  useEffect(() => {
    if (!open) return;
    const root = document.getElementById('root');
    const inertRoot = root as (HTMLElement & { inert: boolean }) | null;
    const previousOverflow = document.body.style.overflow;
    if (inertRoot) inertRoot.inert = true;
    document.body.style.overflow = 'hidden';
    const timeout = window.setTimeout(() => searchRef.current?.focus(), 0);

    return () => {
      window.clearTimeout(timeout);
      if (inertRoot) inertRoot.inert = false;
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== 'Tab') return;
      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
      );
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose, open]);

  const handleSelectCategory = (categoryId: ExerciseCategoryId) => {
    setCategory(categoryId);
    setMode('list');
    setStatus('');
  };

  const handleSelectMuscle = (muscleId: string) => {
    if (!interactive2DMuscleIds.includes(muscleId)) return;
    setSelectedMuscleId(muscleId);
    const region = getMuscleById(muscleId);
    if (region?.bodyPart === '背部' || ['triceps-brachii', 'rear-deltoid', 'gluteus-maximus', 'hamstrings', 'calves'].includes(muscleId)) {
      setMuscleView('back');
    } else {
      setMuscleView('front');
    }
    setStatus('');
  };

  const handleAdd = (exercise: Exercise) => {
    if (existingExerciseIds.has(exercise.id)) {
      setStatus('该动作已在当前训练中');
      return;
    }
    if (!onAddExercise(exercise.id)) {
      setStatus('该动作已在当前训练中');
    }
  };

  if (!mounted) return null;

  return createPortal(
    <div
      data-testid="exercise-picker-backdrop"
      className={`workout-dark fixed inset-0 z-[70] flex w-full min-w-0 max-w-full items-end justify-center overflow-x-hidden bg-black/70 transition-opacity duration-[250ms] ease-out motion-reduce:transition-none ${entered ? 'opacity-100' : 'opacity-0'}`}
      style={{
        boxSizing: 'border-box',
        paddingInlineStart: 'max(clamp(8px, 2.5vw, 24px), env(safe-area-inset-left, 0px))',
        paddingInlineEnd: 'max(clamp(8px, 2.5vw, 24px), env(safe-area-inset-right, 0px))'
      }}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        data-testid="exercise-picker-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="exercise-picker-title"
        className={`flex w-full min-w-0 max-w-full flex-col overflow-hidden rounded-t-2xl border border-b-0 border-white/15 bg-[#111410] text-white transition-transform duration-[250ms] ease-out motion-reduce:transition-none ${entered ? 'translate-y-0' : 'translate-y-full'}`}
        style={{
          boxSizing: 'border-box',
          width: '100%',
          maxWidth: '680px',
          minWidth: 0,
          marginInline: 'auto',
          height: 'min(86dvh, calc(100dvh - max(12px, env(safe-area-inset-top, 0px))))',
          maxHeight: 'calc(100dvh - max(12px, env(safe-area-inset-top, 0px)))'
        }}
      >
        <div className="w-full min-w-0 max-w-full shrink-0 border-b border-white/10 px-4 pb-3 pt-2 sm:px-5">
          <div aria-hidden="true" className="mx-auto mb-2 h-1 w-11 rounded-full bg-white/25" />
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 id="exercise-picker-title" className="text-xl font-black tracking-tight">{mode === 'posture' ? '体态改善' : '添加动作'}</h2>
              <p className="mt-0.5 text-xs text-zinc-400">{mode === 'posture' ? '将有序动作模块加入当前训练' : '搜索、筛选或从身体图中精确查找'}</p>
            </div>
            <button type="button" aria-label="关闭动作选择器" onClick={onClose} className="grid min-h-11 min-w-11 place-items-center rounded-full text-xl text-zinc-400 transition hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-lime-300/60">×</button>
          </div>

          {mode === 'list' ? <><label className="relative mt-3 block w-full min-w-0 max-w-full">
            <span className="sr-only">搜索动作</span>
            <span aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">⌕</span>
            <input
              ref={searchRef}
              data-testid="exercise-picker-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="搜索动作 / 英文名 / 器械"
              className="min-h-12 w-full min-w-0 max-w-full rounded-xl border border-white/10 bg-white/[0.045] pl-9 pr-3 text-sm text-white outline-none transition placeholder:text-zinc-500 focus:border-lime-300/60 focus:ring-2 focus:ring-lime-300/15"
            />
          </label>

          <nav aria-label="动作肌群分类" className="mt-3 flex w-full min-w-0 max-w-full snap-x gap-1.5 overflow-x-auto overflow-y-hidden pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {exerciseCategories.map((item) => (
              <button
                key={item.id}
                type="button"
                data-testid={`exercise-category-${item.id}`}
                aria-pressed={category === item.id && mode === 'list'}
                onClick={() => handleSelectCategory(item.id)}
                className={`min-h-10 shrink-0 snap-start rounded-full px-4 text-sm font-bold transition focus:outline-none focus:ring-2 focus:ring-lime-300/60 ${category === item.id && mode === 'list' ? 'bg-lime-300 text-[#10130d]' : 'text-zinc-300 hover:bg-white/[0.07]'}`}
              >
                {item.label}
              </button>
            ))}
          </nav>

          <div className="mt-1 grid grid-cols-2 gap-2">
            <button
              type="button"
              data-testid="open-2d-muscle-picker"
              onClick={() => { setMode('muscle2d'); setStatus(''); }}
              className="min-h-11 rounded-xl border border-lime-300/30 px-3 text-xs font-black text-lime-300 transition hover:bg-lime-300/[0.07] focus:outline-none focus:ring-2 focus:ring-lime-300/60"
            >
              2D 找肌群
            </button>
            <button
              type="button"
              data-testid="open-posture-picker"
              onClick={() => { setMode('posture'); setStatus(''); }}
              className="min-h-11 rounded-xl border border-lime-300/30 px-3 text-xs font-black text-lime-300 transition hover:bg-lime-300/[0.07] focus:outline-none focus:ring-2 focus:ring-lime-300/60"
            >
              体态改善
            </button>
          </div>
          <p role={status ? 'status' : undefined} className="mt-1 truncate text-xs font-semibold text-amber-200">{status}</p></> : null}
        </div>

        <div className={`min-h-0 w-full min-w-0 max-w-full flex-1 ${mode === 'posture' ? 'flex flex-col overflow-hidden' : 'overflow-y-auto overflow-x-hidden px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 sm:px-5'}`}>
          {mode === 'list' ? (
            filteredExercises.length ? (
              <ExerciseList exercises={filteredExercises} existingExerciseIds={existingExerciseIds} onAdd={handleAdd} />
            ) : (
              <div data-testid="exercise-picker-empty" className="rounded-2xl border border-dashed border-white/12 px-4 py-10 text-center">
                <p className="font-bold text-zinc-300">没有找到匹配动作</p>
                <p className="mt-1 text-sm text-zinc-500">试试更短的关键词或切换肌群分类</p>
              </div>
            )
          ) : mode === 'muscle2d' ? (
            <div data-testid="exercise-picker-2d-mode" className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <button type="button" data-testid="exercise-picker-back-to-list" onClick={() => setMode('list')} className="min-h-10 rounded-full border border-white/12 px-3 text-xs font-bold text-zinc-300 hover:bg-white/[0.06] focus:outline-none focus:ring-2 focus:ring-lime-300/60">← 返回动作列表</button>
                <div className="flex rounded-full border border-white/12 bg-black/20 p-1">
                  {(['front', 'back'] as MuscleMapView[]).map((view) => (
                    <button key={view} type="button" data-testid={`exercise-picker-view-${view}`} aria-pressed={muscleView === view} onClick={() => setMuscleView(view)} className={`min-h-8 rounded-full px-3 text-xs font-bold ${muscleView === view ? 'bg-lime-300 text-[#10130d]' : 'text-zinc-400'}`}>{view === 'front' ? '正面' : '背面'}</button>
                  ))}
                </div>
              </div>

              <div className="grid w-full min-w-0 max-w-full gap-3 min-[520px]:grid-cols-[minmax(0,0.78fr)_minmax(0,1.22fr)]">
                <InteractiveMuscleMap2D variant="compact" view={muscleView} selectedMuscleId={selectedMuscleId} onSelectMuscle={handleSelectMuscle} />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-zinc-500">当前选择</p>
                  <p data-testid="exercise-picker-selected-muscle" className="mt-1 text-lg font-black text-white">{selectedMuscle?.nameZh ?? '请选择肌肉'}</p>
                  <p className="text-xs text-zinc-500">{selectedMuscle?.nameEn}</p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {visibleMuscles.map((muscle) => (
                      <button key={muscle.id} type="button" aria-pressed={muscle.id === selectedMuscleId} onClick={() => handleSelectMuscle(muscle.id)} className={`min-h-9 rounded-full border px-3 text-xs font-bold ${muscle.id === selectedMuscleId ? 'border-lime-300 bg-lime-300/10 text-lime-300' : 'border-white/12 text-zinc-400 hover:text-white'}`}>{muscle.nameZh}</button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <h3 className="mb-2 text-sm font-black text-zinc-300">相关动作</h3>
                {relatedExercises.length ? <ExerciseList exercises={relatedExercises.map((item) => item.exercise)} existingExerciseIds={existingExerciseIds} onAdd={handleAdd} /> : <p className="text-sm text-zinc-500">暂无相关动作</p>}
              </div>
            </div>
          ) : (
            <PostureProtocolBrowser
              initialProtocolId={initialPostureProtocolId}
              initialCategoryId={initialPostureCategoryId}
              initialScrollTop={initialPostureScrollTop}
              onBackToExercises={() => setMode('list')}
              onAddProtocol={onAddPostureProtocol}
            />
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

function ExerciseList({ exercises, existingExerciseIds, onAdd }: { exercises: Exercise[]; existingExerciseIds: Set<string>; onAdd: (exercise: Exercise) => void }) {
  return (
    <div className="w-full min-w-0 max-w-full space-y-2">
      {exercises.map((exercise) => {
        const primaryMuscles = exercise.primaryMuscles.map((muscleId) => getMuscleById(muscleId)?.nameZh).filter(Boolean).join('、');
        const added = existingExerciseIds.has(exercise.id);
        return (
          <article key={exercise.id} data-testid={`exercise-picker-result-${exercise.id}`} className="flex w-full min-w-0 max-w-full items-center gap-3 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.025] p-3">
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-sm font-black text-zinc-100">{exercise.name}</h3>
              <p className="truncate text-xs text-zinc-500">{exercise.nameEn}</p>
              <p className="mt-1 truncate text-[11px] text-zinc-400">{primaryMuscles || '未标注肌群'} · {exercise.equipment.join('、') || '无器械'}</p>
            </div>
            <button
              type="button"
              data-testid={`add-exercise-${exercise.id}`}
              disabled={added}
              onClick={() => onAdd(exercise)}
              className={`min-h-11 min-w-11 shrink-0 rounded-full px-3 text-sm font-black transition focus:outline-none focus:ring-2 focus:ring-lime-300/60 ${added ? 'cursor-not-allowed bg-white/[0.06] text-zinc-500' : 'bg-lime-300 text-[#10130d] hover:bg-lime-200 active:scale-95'}`}
            >
              {added ? '已添加' : '＋'}
            </button>
          </article>
        );
      })}
    </div>
  );
}
