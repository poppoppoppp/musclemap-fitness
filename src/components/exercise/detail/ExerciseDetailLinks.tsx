export type ExerciseDetailSheetType = 'instructions' | 'muscles' | 'alternatives';

interface ExerciseDetailLinksProps {
  onOpen: (type: ExerciseDetailSheetType) => void;
}

const links: Array<{ type: ExerciseDetailSheetType; title: string; subtitle: string }> = [
  { type: 'instructions', title: '动作说明', subtitle: '步骤、呼吸方式与动作要点' },
  { type: 'muscles', title: '训练部位', subtitle: '主练与辅助肌群' },
  { type: 'alternatives', title: '替代动作', subtitle: '相似动作与替换建议' }
];

export default function ExerciseDetailLinks({ onOpen }: ExerciseDetailLinksProps) {
  return (
    <section data-testid="exercise-detail-links" data-exercise-section="links" aria-label="动作详细信息" className="overflow-hidden rounded-2xl border border-white/10 bg-[#111511]">
      {links.map((link, index) => (
        <button
          key={link.type}
          type="button"
          onClick={() => onOpen(link.type)}
          className={`flex min-h-[76px] w-full items-center gap-3 px-4 text-left transition hover:bg-white/[0.035] focus:outline-none focus:ring-2 focus:ring-inset focus:ring-lime-300/55 sm:px-5 ${index ? 'border-t border-white/10' : ''}`}
        >
          <DetailLinkIcon type={link.type} />
          <span className="min-w-0 flex-1">
            <strong className="block text-base font-bold text-zinc-100">{link.title}</strong>
            <span className="mt-0.5 block truncate text-sm text-zinc-400">{link.subtitle}</span>
          </span>
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-5 w-5 shrink-0 text-zinc-600" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
        </button>
      ))}
    </section>
  );
}

function DetailLinkIcon({ type }: { type: ExerciseDetailSheetType }) {
  const paths = {
    instructions: <><path d="M6 3h9l3 3v15H6z" /><path d="M14 3v4h4M9 11h6M9 15h6" /></>,
    muscles: <><circle cx="12" cy="5" r="2.5" /><path d="M9 9h6l2 5-2 7M9 9l-2 5 2 7M9 14h6" /></>,
    alternatives: <><path d="M4 7h12m-4-4 4 4-4 4M20 17H8m4 4-4-4 4-4" /></>
  };
  return (
    <span aria-hidden="true" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-lime-300/[0.08] text-lime-300">
      <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{paths[type]}</svg>
    </span>
  );
}
