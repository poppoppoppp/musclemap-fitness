import { useEffect, useRef } from 'react';
import { getGuidedPostureTest } from '../../data/posture/postureScreeningTests';
import type { PosturePrimaryConcern } from '../../data/posture/postureScreeningQuestions';
import type { FunctionalPostureObservation, PostureTestStopSymptom } from '../../utils/postureScreeningRules';

const stopChoices: { value: PostureTestStopSymptom; label: string }[] = [
  { value: 'dizziness', label: '观察中出现眩晕' },
  { value: 'numbness', label: '观察中出现麻木' },
  { value: 'radiating-pain', label: '观察中出现放射感' },
  { value: 'marked-pain-increase', label: '观察中疼痛明显加重' },
  { value: 'weakness', label: '观察中突然无力' },
];

const upperObservations: { value: FunctionalPostureObservation; label: string }[] = [
  { value: 'head-advances-during-reach', label: '上举时头部会向前移动' },
  { value: 'upper-quarter-control-limited', label: '上举时颈肩或上背控制明显吃力' },
  { value: 'arm-raise-asymmetry', label: '两侧上举节奏或舒适活动范围明显不同' },
  { value: 'trunk-side-shift-during-reach', label: '上举时躯干会向同一侧偏移' },
];

interface Props {
  concern: PosturePrimaryConcern;
  stopSymptoms: PostureTestStopSymptom[];
  observations: FunctionalPostureObservation[];
  onToggleStop: (symptom: PostureTestStopSymptom) => void;
  onToggleObservation: (observation: FunctionalPostureObservation) => void;
  onBack: () => void;
  onContinue: () => void;
}

export default function PostureMovementStep({ concern, stopSymptoms, observations, onToggleStop, onToggleObservation, onBack, onContinue }: Props) {
  const titleRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => { titleRef.current?.focus(); }, []);
  const test = getGuidedPostureTest(concern);
  const observationChoices = test.id === 'seated-thoracic-rotation-observation-v1'
    ? [{ value: 'thoracic-rotation-limited' as const, label: '左右旋转存在明显且可重复的活动差异' }]
    : upperObservations;

  return (
    <section className="mt-7" aria-labelledby="movement-title">
      <div className="flex items-start justify-between gap-4">
        <h2 ref={titleRef} tabIndex={-1} id="movement-title" className="text-xl font-black leading-7 outline-none">{test.title}</h2>
        <span className="shrink-0 rounded-full border border-white/10 px-2.5 py-1 text-xs font-bold text-zinc-300">约 {test.estimatedSeconds} 秒</span>
      </div>
      <ol className="mt-5 space-y-3 border-l border-lime-300/35 pl-5">
        {test.instructions.map((instruction, index) => <li key={instruction} className="relative text-sm leading-6 text-zinc-200"><span className="absolute -left-[1.55rem] top-1 flex h-4 w-4 items-center justify-center rounded-full bg-lime-300 text-[10px] font-black text-[#10130d]">{index + 1}</span>{instruction}</li>)}
      </ol>
      <p className="mt-5 rounded-xl border border-amber-300/30 bg-amber-300/[0.06] px-3 py-3 text-xs font-semibold leading-5 text-amber-100">出现眩晕、麻木或放射感、明显疼痛加重或突然无力时立即停止。</p>
      <fieldset className="mt-5 space-y-2.5">
        <legend className="text-sm font-black text-zinc-100">停止信号</legend>
        {stopChoices.map(({ value, label }) => <label key={value} className="flex min-h-12 items-center gap-3 rounded-xl border border-white/10 px-3 text-sm font-semibold text-zinc-100"><input type="checkbox" checked={stopSymptoms.includes(value)} onChange={() => onToggleStop(value)} className="h-5 w-5 accent-amber-300" />{label}</label>)}
      </fieldset>
      <fieldset className="mt-5 space-y-2.5">
        <legend className="text-sm font-black text-zinc-100">完成后记录观察</legend>
        <p className="text-xs leading-5 text-zinc-400">只勾选清楚、可重复出现的表现。</p>
        {observationChoices.map(({ value, label }) => <label key={value} className="flex min-h-12 items-start gap-3 rounded-xl border border-white/10 px-3 py-3 text-sm font-semibold leading-5 text-zinc-100"><input type="checkbox" checked={observations.includes(value)} onChange={() => onToggleObservation(value)} className="mt-0.5 h-5 w-5 shrink-0 accent-lime-300" />{label}</label>)}
      </fieldset>
      <div className="mt-5 grid grid-cols-[auto_1fr] gap-3">
        <button type="button" onClick={onBack} className="min-h-12 rounded-xl border border-white/15 px-4 text-sm font-bold text-zinc-200 outline-none focus-visible:ring-2 focus-visible:ring-lime-200">返回</button>
        <button type="button" onClick={onContinue} className="min-h-12 rounded-xl bg-lime-300 px-4 text-sm font-black text-[#10130d] outline-none focus-visible:ring-2 focus-visible:ring-lime-100">开始自动体态筛查</button>
      </div>
    </section>
  );
}
