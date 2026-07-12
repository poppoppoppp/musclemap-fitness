import { useState } from 'react';

const tips = {
  weight: '建议固定时间，并在相似饮食和穿着状态下测量。',
  waist: '使用固定测量位置，建议以肚脐水平或项目统一标准为准。',
  arm: '第一版统一记录右臂屈臂围，每次保持相同姿势与位置。'
};

export default function MeasurementHelp({ metric }: { metric: keyof typeof tips }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative">
      <button type="button" aria-label="打开测量说明" title={`${metric === 'weight' ? '体重' : metric === 'waist' ? '腰围' : '臂围'}测量说明`} aria-expanded={open} onClick={() => setOpen((value) => !value)} className="ml-1 inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/15 text-xs font-bold text-zinc-400 focus:outline-none focus:ring-2 focus:ring-lime-300/60">i</button>
      {open ? <span role="note" className="absolute left-0 top-9 z-10 w-56 rounded-xl border border-white/12 bg-[#1a1e19] p-3 text-xs font-normal leading-5 text-zinc-300 shadow-lg">{tips[metric]}</span> : null}
    </span>
  );
}
