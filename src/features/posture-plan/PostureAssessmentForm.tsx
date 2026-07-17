import { useEffect, useRef, useState } from 'react';
import type { PostureAssessmentDraft, PostureAssessmentInput, PostureEquipment, PostureGoal, PostureRegion, PostureRiskFlag } from '../../types/posturePlan';

interface Props {
  draft?: PostureAssessmentDraft | null;
  kind?: 'initial' | 'reassessment';
  planId?: string;
  onDraft: (draft: PostureAssessmentDraft) => void;
  onComplete: (input: PostureAssessmentInput) => void;
}

export default function PostureAssessmentForm({ draft, kind = 'initial', planId, onDraft, onComplete }: Props) {
  const titleRef = useRef<HTMLHeadingElement>(null);
  const [step, setStep] = useState(draft?.step ?? 1);
  const [goal, setGoal] = useState<PostureGoal>(draft?.goals?.[0] ?? 'comfort');
  const [region, setRegion] = useState<PostureRegion>(draft?.regions?.[0] ?? 'upper_posture');
  const [riskFlags, setRiskFlags] = useState<PostureRiskFlag[]>([...(draft?.riskFlags ?? [])]);
  const [equipment, setEquipment] = useState<PostureEquipment[]>([...(draft?.equipment ?? ['bodyweight'])]);
  const [sessionMinutes, setSessionMinutes] = useState(draft?.sessionMinutes ?? 20);
  const [weeklyFrequency, setWeeklyFrequency] = useState(draft?.weeklyFrequency ?? 3);
  const [discomfort, setDiscomfort] = useState(draft?.discomfort ?? 4);
  const [functionScore, setFunctionScore] = useState(draft?.functionScore ?? 6);

  useEffect(() => {
    titleRef.current?.focus();
  }, [step]);

  const next = () => {
    const nextStep = step + 1;
    onDraft({ step: nextStep, goals: [goal], regions: [region], riskFlags, equipment, sessionMinutes, weeklyFrequency, discomfort, functionScore });
    setStep(nextStep);
  };
  const toggleRisk = (flag: PostureRiskFlag) => setRiskFlags((values) => values.includes(flag) ? values.filter((item) => item !== flag) : [...values, flag]);
  const toggleEquipment = (item: PostureEquipment) => setEquipment((values) => values.includes(item) ? values.filter((value) => value !== item) : [...values, item]);
  const finish = () => onComplete({ kind, planId, goals: [goal], regions: [region], symptomDuration: '1-3m', discomfort, functionScore, riskFlags, equipment, sessionMinutes, weeklyFrequency });

  return (
    <section className="mt-7" aria-labelledby="assessment-title">
      <div className="flex items-center justify-between"><h2 ref={titleRef} tabIndex={-1} id="assessment-title" className="text-xl font-black outline-none">{kind === 'reassessment' ? '周期复测' : '非诊断式初筛'}</h2><span className="text-sm font-bold text-zinc-300">{step} / 4</span></div>
      {step === 1 ? <fieldset className="mt-5 space-y-4"><legend className="text-base font-black">目标与区域</legend>
        <div className="space-y-2"><p className="text-sm text-zinc-300">主要目标</p>{([['comfort', '舒适度'], ['mobility', '活动能力'], ['training', '训练表现'], ['appearance', '外观关注']] as const).map(([value, label]) => <Choice key={value} type="radio" name="goal" label={label} checked={goal === value} onChange={() => setGoal(value)} />)}</div>
        <div className="space-y-2"><p className="text-sm text-zinc-300">关注区域</p>{([['upper_posture', '上半身体态'], ['cervical_head', '颈部与头部'], ['pelvis_lumbopelvic', '骨盆与腰盆'], ['thoracic', '胸椎活动']] as const).map(([value, label]) => <Choice key={value} type="radio" name="region" label={label} checked={region === value} onChange={() => setRegion(value)} />)}</div>
        <Next label="继续安全检查" onClick={next} />
      </fieldset> : null}
      {step === 2 ? <fieldset className="mt-5 space-y-3"><legend className="text-base font-black">安全检查</legend><p className="text-sm leading-6 text-zinc-300">请选择当前存在的情况。没有时直接继续。</p>
        {([['numbness', '麻木'], ['radiating-pain', '放射痛'], ['dizziness', '眩晕'], ['chest-pain', '胸痛'], ['breathing-difficulty', '呼吸困难'], ['recent-trauma', '近期外伤']] as const).map(([value, label]) => <Choice key={value} type="checkbox" label={label} checked={riskFlags.includes(value)} onChange={() => toggleRisk(value)} />)}
        <Next label="继续训练条件" onClick={next} />
      </fieldset> : null}
      {step === 3 ? <fieldset className="mt-5 space-y-3"><legend className="text-base font-black">训练条件</legend>
        {([['wall', '墙面'], ['mat', '瑜伽垫'], ['resistance-band', '弹力带'], ['towel', '毛巾'], ['foam-roller', '泡沫轴'], ['dumbbell', '哑铃']] as const).map(([value, label]) => <Choice key={value} type="checkbox" label={label} checked={equipment.includes(value)} onChange={() => toggleEquipment(value)} />)}
        <label className="block text-sm text-zinc-200">单次时间（分钟）<input type="number" min="5" max="60" value={sessionMinutes} onChange={(event) => setSessionMinutes(Number(event.target.value))} className="mt-1 h-12 w-full rounded-xl border border-white/15 bg-black/25 px-3 text-white" /></label>
        <label className="block text-sm text-zinc-200">每周次数<input type="number" min="1" max="7" value={weeklyFrequency} onChange={(event) => setWeeklyFrequency(Number(event.target.value))} className="mt-1 h-12 w-full rounded-xl border border-white/15 bg-black/25 px-3 text-white" /></label>
        <Next label="继续基线记录" onClick={next} />
      </fieldset> : null}
      {step === 4 ? <fieldset className="mt-5 space-y-4"><legend className="text-base font-black">基线记录</legend>
        <label className="block text-sm text-zinc-200">当前不适度（0-10）<input type="number" min="0" max="10" value={discomfort} onChange={(event) => setDiscomfort(Number(event.target.value))} className="mt-1 h-12 w-full rounded-xl border border-white/15 bg-black/25 px-3 text-white" /></label>
        <label className="block text-sm text-zinc-200">当前功能评分（0-10）<input type="number" min="0" max="10" value={functionScore} onChange={(event) => setFunctionScore(Number(event.target.value))} className="mt-1 h-12 w-full rounded-xl border border-white/15 bg-black/25 px-3 text-white" /></label>
        <Next label={kind === 'reassessment' ? '保存复测结果' : '查看推荐'} onClick={finish} />
      </fieldset> : null}
    </section>
  );
}

function Choice({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) { return <label className="flex min-h-11 items-center gap-3 rounded-xl border border-white/10 px-3 text-sm font-semibold text-zinc-100"><input {...props} className="h-5 w-5 accent-lime-300" />{label}</label>; }
function Next({ label, onClick }: { label: string; onClick: () => void }) { return <button type="button" onClick={onClick} className="mt-3 min-h-12 w-full rounded-xl bg-lime-300 px-4 text-sm font-black text-[#10130d] focus:outline-none focus-visible:ring-2 focus-visible:ring-lime-100">{label}</button>; }
