import CalendarIcon from '../../components/icons/CalendarIcon';
import type { GrowthTimeRange } from '../../types/growth';

interface TimeRangeSelectorProps {
  value: GrowthTimeRange;
  onChange: (value: GrowthTimeRange) => void;
}

const ranges: Array<{ id: GrowthTimeRange; label: string }> = [
  { id: '4w', label: '近4周' },
  { id: '3m', label: '近3个月' },
  { id: '6m', label: '近6个月' },
  { id: 'all', label: '全部' }
];

export default function TimeRangeSelector({ value, onChange }: TimeRangeSelectorProps) {
  return (
    <div className="flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.035] p-1">
      <div className="grid min-w-0 flex-1 grid-cols-4 gap-0.5">
        {ranges.map((range) => {
          const selected = range.id === value;
          return (
            <button key={range.id} type="button" aria-pressed={selected} onClick={() => onChange(range.id)} className={`min-h-10 rounded-full px-1 text-[0.72rem] font-bold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-lime-300/70 sm:text-xs ${selected ? 'bg-lime-300/95 text-black' : 'text-zinc-400 hover:bg-white/5 hover:text-white'}`}>
              {range.label}
            </button>
          );
        })}
      </div>
      <span aria-hidden="true" className="h-7 w-px bg-white/10" />
      <span aria-label="时间范围" className="flex h-10 w-10 shrink-0 items-center justify-center text-lime-300/70">
        <CalendarIcon className="h-[1.15rem] w-[1.15rem]" />
      </span>
    </div>
  );
}
