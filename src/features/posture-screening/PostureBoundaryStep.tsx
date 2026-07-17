import { useEffect, useRef } from 'react';

interface Props {
  age: string;
  boundaryAccepted: boolean;
  onAgeChange: (age: string) => void;
  onBoundaryChange: (accepted: boolean) => void;
  onContinue: () => void;
}

export default function PostureBoundaryStep({ age, boundaryAccepted, onAgeChange, onBoundaryChange, onContinue }: Props) {
  const titleRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => { titleRef.current?.focus(); }, []);
  const validAge = Number.isFinite(Number(age)) && Number(age) > 0;

  return (
    <section className="mt-7" aria-labelledby="boundary-title">
      <h2 ref={titleRef} tabIndex={-1} id="boundary-title" className="text-xl font-black outline-none">先确认适用边界</h2>
      <p className="mt-2 text-sm leading-6 text-zinc-300">当前流程面向已满 18 岁的成人，只描述可观察到的体态与功能表现。</p>
      <div className="mt-5 space-y-3">
        <label className="block text-sm font-semibold text-zinc-100">年龄
          <input type="number" inputMode="numeric" min="1" max="120" value={age} onChange={(event) => onAgeChange(event.target.value)} className="mt-2 h-12 w-full rounded-xl border border-white/15 bg-black/25 px-3 text-base text-white outline-none focus:border-lime-300 focus:ring-2 focus:ring-lime-300/20" />
        </label>
        <label className="flex min-h-12 items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3 text-sm font-semibold leading-5 text-zinc-100">
          <input type="checkbox" checked={boundaryAccepted} onChange={(event) => onBoundaryChange(event.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-lime-300" />
          我理解这是体态与功能表现筛查，不是医疗诊断
        </label>
      </div>
      <button type="button" disabled={!validAge || !boundaryAccepted} onClick={onContinue} className="mt-5 min-h-12 w-full rounded-xl bg-lime-300 px-4 text-sm font-black text-[#10130d] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-lime-100 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400">继续安全检查</button>
    </section>
  );
}
