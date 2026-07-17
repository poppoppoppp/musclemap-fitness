import { useEffect, useRef } from 'react';
import { getPostureFollowUpQuestions, type PosturePrimaryConcern } from '../../data/posture/postureScreeningQuestions';
import type { SubjectivePostureObservation } from '../../utils/postureScreeningRules';

const concerns: { value: PosturePrimaryConcern; label: string; note: string }[] = [
  { value: 'neck-upper-quarter', label: '头颈与上段', note: '头位、久坐或抬臂时的上段表现' },
  { value: 'thoracic-trunk', label: '胸廓与躯干', note: '转身活动或站立时的躯干表现' },
  { value: 'shoulder-asymmetry', label: '肩部左右差异', note: '肩高或双臂上举时的侧差' },
  { value: 'unsure', label: '暂不确定', note: '从几类常见表现中继续辨别' },
];

const followUpObservation: Record<string, SubjectivePostureObservation> = {
  'neck-head-position-follow-up-v1': 'head-position-concern',
  'neck-upper-quarter-load-follow-up-v1': 'neck-upper-quarter-impact',
  'thoracic-rotation-follow-up-v1': 'thoracic-stiffness-or-rotation-concern',
  'trunk-side-shift-follow-up-v1': 'trunk-side-shift-concern',
  'shoulder-height-follow-up-v1': 'shoulder-height-concern',
  'shoulder-reach-follow-up-v1': 'overhead-asymmetry-concern',
};

const unsureOptions: { value: SubjectivePostureObservation; label: string }[] = [
  { value: 'head-position-concern', label: '头部相对肩部经常明显前移' },
  { value: 'thoracic-stiffness-or-rotation-concern', label: '向一侧转身经常明显受限' },
  { value: 'shoulder-height-concern', label: '同一侧肩峰反复显得更高或更低' },
  { value: 'trunk-side-shift-concern', label: '站立或抬臂时躯干经常向同一侧偏移' },
];

interface Props {
  concern: PosturePrimaryConcern;
  functionalImpact: number;
  observations: SubjectivePostureObservation[];
  onConcernChange: (concern: PosturePrimaryConcern) => void;
  onImpactChange: (value: number) => void;
  onToggleObservation: (observation: SubjectivePostureObservation) => void;
  onBack: () => void;
  onContinue: () => void;
}

export default function PostureConcernStep({ concern, functionalImpact, observations, onConcernChange, onImpactChange, onToggleObservation, onBack, onContinue }: Props) {
  const titleRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => { titleRef.current?.focus(); }, []);
  const followUps = concern === 'unsure'
    ? unsureOptions
    : getPostureFollowUpQuestions(concern).flatMap((question) => {
        const value = followUpObservation[question.id];
        return value ? [{ value, label: question.prompt }] : [];
      });

  return (
    <section className="mt-7" aria-labelledby="concern-title">
      <h2 ref={titleRef} tabIndex={-1} id="concern-title" className="text-xl font-black outline-none">选择最想了解的表现</h2>
      <p className="mt-2 text-sm leading-6 text-zinc-300">关注区域只用于缩短问题，不会被直接当作结论。</p>
      <fieldset className="mt-5 space-y-2.5">
        <legend className="sr-only">主要关注表现</legend>
        {concerns.map(({ value, label, note }) => (
          <label key={value} className={`flex min-h-14 items-center gap-3 rounded-xl border px-3 py-2.5 ${concern === value ? 'border-lime-300/70 bg-lime-300/[0.08]' : 'border-white/10 bg-white/[0.03]'}`}>
            <input type="radio" name="primary-concern" checked={concern === value} onChange={() => onConcernChange(value)} className="h-5 w-5 shrink-0 accent-lime-300" />
            <span><span className="block text-sm font-black text-zinc-100">{label}</span><span className="mt-0.5 block text-xs leading-5 text-zinc-400">{note}</span></span>
          </label>
        ))}
      </fieldset>
      <label className="mt-5 block text-sm font-semibold text-zinc-100">日常活动影响（0–10）：<output className="text-lime-300">{functionalImpact}</output>
        <input type="range" min="0" max="10" step="1" value={functionalImpact} onChange={(event) => onImpactChange(Number(event.target.value))} className="mt-3 h-11 w-full accent-lime-300" />
      </label>
      <fieldset className="mt-5 space-y-2.5">
        <legend className="text-sm font-black text-zinc-100">哪些描述经常出现？</legend>
        <p className="text-xs leading-5 text-zinc-400">只选反复出现的表现；不确定可以不选。</p>
        {followUps.map(({ value, label }) => (
          <label key={value} className="flex min-h-12 items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3 text-sm font-semibold leading-5 text-zinc-100">
            <input type="checkbox" checked={observations.includes(value)} onChange={() => onToggleObservation(value)} className="mt-0.5 h-5 w-5 shrink-0 accent-lime-300" />{label}
          </label>
        ))}
      </fieldset>
      <div className="mt-5 grid grid-cols-[auto_1fr] gap-3">
        <button type="button" onClick={onBack} className="min-h-12 rounded-xl border border-white/15 px-4 text-sm font-bold text-zinc-200 outline-none focus-visible:ring-2 focus-visible:ring-lime-200">返回</button>
        <button type="button" onClick={onContinue} className="min-h-12 rounded-xl bg-lime-300 px-4 text-sm font-black text-[#10130d] outline-none focus-visible:ring-2 focus-visible:ring-lime-100">继续引导观察</button>
      </div>
    </section>
  );
}
