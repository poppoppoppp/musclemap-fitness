import { useEffect, useRef } from 'react';
import type { PostureSafetyFlag } from '../../utils/postureScreeningRules';

const safetyChoices: { value: PostureSafetyFlag; label: string }[] = [
  { value: 'acute-trauma', label: '近期急性创伤' },
  { value: 'progressive-neurological-symptoms', label: '进行性麻木或无力' },
  { value: 'chest-pain-or-fainting', label: '胸痛、晕厥或接近晕厥' },
  { value: 'severe-unexplained-symptoms', label: '严重或无法解释的症状' },
];

interface Props {
  flags: PostureSafetyFlag[];
  onToggle: (flag: PostureSafetyFlag) => void;
  onBack: () => void;
  onContinue: () => void;
}

export default function PostureSafetyStep({ flags, onToggle, onBack, onContinue }: Props) {
  const titleRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => { titleRef.current?.focus(); }, []);
  return (
    <section className="mt-7" aria-labelledby="safety-title">
      <h2 ref={titleRef} tabIndex={-1} id="safety-title" className="text-xl font-black outline-none">开始前安全检查</h2>
      <p className="mt-2 text-sm leading-6 text-zinc-300">如有以下任一情况，本次自测会停止并建议先寻求专业评估。均无时可直接继续。</p>
      <fieldset className="mt-5 space-y-2.5">
        <legend className="sr-only">当前安全信号</legend>
        {safetyChoices.map(({ value, label }) => (
          <label key={value} className="flex min-h-12 items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 text-sm font-semibold text-zinc-100">
            <input type="checkbox" checked={flags.includes(value)} onChange={() => onToggle(value)} className="h-5 w-5 accent-lime-300" />{label}
          </label>
        ))}
      </fieldset>
      <div className="mt-5 grid grid-cols-[auto_1fr] gap-3">
        <button type="button" onClick={onBack} className="min-h-12 rounded-xl border border-white/15 px-4 text-sm font-bold text-zinc-200 outline-none focus-visible:ring-2 focus-visible:ring-lime-200">返回</button>
        <button type="button" onClick={onContinue} className="min-h-12 rounded-xl bg-lime-300 px-4 text-sm font-black text-[#10130d] outline-none focus-visible:ring-2 focus-visible:ring-lime-100">继续选择关注表现</button>
      </div>
    </section>
  );
}
