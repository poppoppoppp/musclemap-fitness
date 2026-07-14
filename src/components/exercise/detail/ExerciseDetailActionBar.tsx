interface ExerciseDetailActionBarProps {
  primaryLabel: string;
  status: string;
  onRecord: () => void;
  onPrimary: () => void;
}

export default function ExerciseDetailActionBar({ primaryLabel, status, onRecord, onPrimary }: ExerciseDetailActionBarProps) {
  return (
    <div data-testid="exercise-detail-action-bar" className="fixed inset-x-0 bottom-0 z-30 bg-[linear-gradient(to_bottom,transparent_0%,#080a08_22%)] px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-7 md:static md:bg-none md:px-6 md:pb-8 md:pt-2">
      <div className="mx-auto max-w-3xl">
        <p role={status ? 'status' : undefined} aria-live="polite" aria-hidden={status ? undefined : true} className={`mb-2 min-h-5 text-center text-xs font-semibold text-lime-300 ${status ? 'opacity-100' : 'opacity-0'}`}>{status || '状态'}</p>
        <div className="grid grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)] gap-3">
          <button type="button" data-testid="exercise-record-action" onClick={onRecord} className="inline-flex min-h-14 min-w-0 items-center justify-center gap-2 rounded-xl border border-lime-300/70 bg-[#0d110d] px-3 text-sm font-bold text-lime-300 transition hover:bg-lime-300/[0.07] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-lime-300/60">
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-5 w-5 shrink-0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m4 17-.5 3.5L7 20l11-11-3-3zM13.5 7.5l3 3M4 20h16" /></svg>
            <span className="truncate">记录一次</span>
          </button>
          <button type="button" data-testid="exercise-primary-action" onClick={onPrimary} className="inline-flex min-h-14 min-w-0 items-center justify-center gap-2 rounded-xl bg-lime-300 px-3 text-sm font-black text-[#0a0d09] transition hover:bg-lime-200 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-lime-100 focus:ring-offset-2 focus:ring-offset-[#080a08]">
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-5 w-5 shrink-0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="4" width="16" height="16" rx="3" /><path d="M12 8v8M8 12h8" /></svg>
            <span className="truncate">{primaryLabel}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
