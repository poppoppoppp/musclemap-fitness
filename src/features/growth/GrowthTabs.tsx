import type { GrowthSection } from '../../types/growth';

interface GrowthTabsProps {
  value: GrowthSection;
  onChange: (value: GrowthSection) => void;
}

const tabs: Array<{ id: GrowthSection; label: string }> = [
  { id: 'training', label: '训练成长' },
  { id: 'body', label: '身体变化' },
  { id: 'posture', label: '体态改善' },
];

export default function GrowthTabs({ value, onChange }: GrowthTabsProps) {
  return (
    <div role="tablist" aria-label="成长分类" className="grid grid-cols-3 rounded-full border border-lime-300/20 bg-black/30 p-1">
      {tabs.map((tab) => {
        const selected = tab.id === value;
        return (
          <button key={tab.id} type="button" role="tab" aria-selected={selected} onClick={() => onChange(tab.id)} className={`min-h-12 rounded-full px-2 text-sm font-black transition duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-lime-200 sm:px-4 ${selected ? 'bg-lime-300 text-[#10130d] shadow-[0_8px_24px_rgba(163,230,53,0.16)]' : 'text-zinc-400 hover:text-zinc-100'}`}>
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
