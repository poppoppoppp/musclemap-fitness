interface ExerciseKeyCuesProps {
  cues: string[];
}

export default function ExerciseKeyCues({ cues }: ExerciseKeyCuesProps) {
  return (
    <section data-testid="exercise-key-cues" data-exercise-section="cues" aria-labelledby="exercise-key-cues-title" className="rounded-2xl border border-white/10 bg-[#111511] p-4 sm:p-5">
      <h2 id="exercise-key-cues-title" className="text-lg font-bold text-zinc-100">关键提示</h2>
      <ul className="mt-3 grid grid-cols-3 divide-x divide-white/10 rounded-xl border border-white/[0.07] bg-black/15 py-2.5">
        {cues.slice(0, 3).map((cue, index) => (
          <li key={`${cue}-${index}`} className="flex min-w-0 items-center justify-center gap-1.5 px-1 text-center text-[11px] font-semibold text-zinc-200 sm:gap-2 sm:px-3 sm:text-sm">
            <CueIcon index={index} />
            <span className="truncate">{cue}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function CueIcon({ index }: { index: number }) {
  const paths = [
    <path key="down" d="M12 4v13m-5-5 5 5 5-5M5 20h14" />,
    <path key="pull" d="M5 7h11m-4-4 4 4-4 4M19 17H8m4 4-4-4 4-4" />,
    <path key="stable" d="M8 5a4 4 0 0 1 8 0M7 21v-7a5 5 0 0 1 10 0v7M4 21h16M6 11l-3 4m15-4 3 4" />
  ];
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-4 w-4 shrink-0 text-lime-300 sm:h-5 sm:w-5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      {paths[index] ?? paths[0]}
    </svg>
  );
}
