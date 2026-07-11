import { useRef } from 'react';
import type { ActiveWorkoutSet } from '../../types/activeWorkout';

interface WorkoutSetTableProps {
  exerciseId: string;
  sets: ActiveWorkoutSet[];
  onSetChange: (exerciseId: string, setId: string, key: 'weight' | 'reps', value: string) => void;
  onDeleteSet: (exerciseId: string, setId: string) => void;
}

export default function WorkoutSetTable({ exerciseId, sets, onSetChange, onDeleteSet }: WorkoutSetTableProps) {
  const tableRef = useRef<HTMLDivElement | null>(null);

  const focusSet = (setId: string) => {
    tableRef.current?.querySelector<HTMLInputElement>(`input[data-set-id="${setId}"]`)?.focus();
  };

  return (
    <div ref={tableRef} className="mt-4 overflow-hidden rounded-xl border border-white/10 bg-black/20">
      <div className="grid grid-cols-[34px_minmax(0,1fr)_minmax(0,0.82fr)_38px] items-center gap-2 border-b border-white/10 px-2.5 py-2 text-center text-[11px] font-bold text-zinc-500 min-[390px]:gap-3 min-[390px]:px-3">
        <span>组数</span><span>重量（kg）</span><span>次数</span><span aria-hidden="true" />
      </div>
      <div className="divide-y divide-white/[0.07]">
        {sets.map((set) => {
          const completed = isDisplayableNumber(set.weight) || isDisplayableNumber(set.reps);
          return (
            <div key={set.id} data-testid="workout-set-row" className={`grid grid-cols-[34px_minmax(0,1fr)_minmax(0,0.82fr)_38px] items-center gap-2 px-2.5 py-2.5 min-[390px]:gap-3 min-[390px]:px-3 ${completed ? 'bg-lime-300/[0.025]' : ''}`}>
              <span className="text-center text-sm font-black text-zinc-400">{set.setIndex}</span>
              <label className="min-w-0">
                <span className="sr-only">第 {set.setIndex} 组重量</span>
                <input data-testid="set-weight-input" data-set-id={set.id} type="number" inputMode="decimal" min="0" step="0.5" value={set.weight ?? ''} onChange={(event) => onSetChange(exerciseId, set.id, 'weight', event.target.value)} className="h-12 w-full min-w-0 rounded-lg border border-white/10 bg-white/[0.035] px-2 text-center text-base font-bold !text-white outline-none transition focus:border-lime-300 focus:ring-2 focus:ring-lime-300/15" />
              </label>
              <label className="min-w-0">
                <span className="sr-only">第 {set.setIndex} 组次数</span>
                <input data-testid="set-reps-input" type="number" inputMode="numeric" min="0" step="1" value={set.reps ?? ''} onChange={(event) => onSetChange(exerciseId, set.id, 'reps', event.target.value)} className="h-12 w-full min-w-0 rounded-lg border border-white/10 bg-white/[0.035] px-2 text-center text-base font-bold !text-white outline-none transition focus:border-lime-300 focus:ring-2 focus:ring-lime-300/15" />
              </label>
              <details className="relative justify-self-end">
                <summary
                  data-testid="set-completion-toggle"
                  data-completed={completed ? 'true' : 'false'}
                  aria-label={completed ? `第 ${set.setIndex} 组已录入，打开组操作` : `第 ${set.setIndex} 组未录入，打开组操作`}
                  onClick={() => { if (!completed) window.setTimeout(() => focusSet(set.id), 0); }}
                  className={`flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-full border text-sm font-black focus:outline-none focus:ring-2 focus:ring-lime-300/50 ${completed ? 'border-lime-300/80 text-lime-300' : 'border-white/20 text-transparent'}`}
                >
                  {completed ? '✓' : '○'}
                </summary>
                <div className="absolute right-0 top-10 z-20 w-28 rounded-xl border border-white/10 bg-[#171a16] p-1.5 shadow-lg">
                  <button type="button" onClick={() => onDeleteSet(exerciseId, set.id)} data-testid="delete-set" className="min-h-10 w-full rounded-lg px-3 text-left text-sm font-bold text-red-300 hover:bg-red-400/10 focus:outline-none focus:ring-2 focus:ring-red-300/40">删除此组</button>
                </div>
              </details>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function isDisplayableNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}
