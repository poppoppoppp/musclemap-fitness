import type { ExerciseTroubleshootingItem } from '../../../types/exercise';

interface ExerciseTroubleshootingProps {
  items: ExerciseTroubleshootingItem[];
  onSelect: (item: ExerciseTroubleshootingItem) => void;
  onViewAll: () => void;
}

export default function ExerciseTroubleshooting({ items, onSelect, onViewAll }: ExerciseTroubleshootingProps) {
  return (
    <section data-testid="exercise-troubleshooting" data-exercise-section="troubleshooting" aria-labelledby="exercise-troubleshooting-title" className="rounded-2xl border border-white/10 bg-[#111511] p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 id="exercise-troubleshooting-title" className="text-lg font-bold text-zinc-100">感觉不对？</h2>
        <button type="button" aria-label="查看全部问题" onClick={onViewAll} className="min-h-11 shrink-0 rounded-lg px-2 text-sm font-semibold text-zinc-400 transition hover:text-lime-300 focus:outline-none focus:ring-2 focus:ring-lime-300/60">
          查看更多 <span aria-hidden="true">›</span>
        </button>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 sm:gap-3">
        {items.slice(0, 3).map((item) => (
          <button
            key={item.id}
            type="button"
            data-troubleshooting-card
            onClick={() => onSelect(item)}
            className="flex min-h-[92px] min-w-0 items-start gap-2 rounded-xl border border-white/[0.08] bg-black/20 p-2 text-left transition hover:border-lime-300/30 hover:bg-lime-300/[0.04] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-lime-300/55 sm:min-h-[100px] sm:p-3"
          >
            <IssueIcon />
            <span className="min-w-0 pt-0.5">
              <strong className="block truncate text-xs font-bold text-zinc-100 sm:text-sm">{item.title}</strong>
              <span className="mt-1 line-clamp-2 block text-[10px] leading-4 text-zinc-400 sm:text-xs sm:leading-[1.125rem]">{item.quickFix}</span>
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

function IssueIcon() {
  return (
    <span aria-hidden="true" className="relative grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-red-400/[0.08] text-zinc-500 sm:h-9 sm:w-9">
      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="5" r="2.5" />
        <path d="M12 8v6M8 11l4 3 4-3M9 21l3-7 3 7" />
      </svg>
      <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-red-400" />
    </span>
  );
}
