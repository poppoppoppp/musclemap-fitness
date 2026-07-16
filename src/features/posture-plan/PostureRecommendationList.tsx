import { useState } from 'react';
import type { PostureAssessment, PosturePlan, PostureWeekday } from '../../types/posturePlan';
import type { PostureProtocolRecommendation } from '../../utils/posturePlanRules';
import { PosturePlanRepository } from '../../repositories/posturePlanRepository';

export default function PostureRecommendationList({ assessment, recommendations, repository, onCreated }: { assessment: PostureAssessment; recommendations: PostureProtocolRecommendation[]; repository: PosturePlanRepository; onCreated: (plan: PosturePlan) => void }) {
  const [selectedId, setSelectedId] = useState(recommendations[0]?.protocol.id ?? '');
  const [durationWeeks, setDurationWeeks] = useState(3);
  const [weekdays, setWeekdays] = useState<PostureWeekday[]>(() => [1, 3, 5, 0, 2, 4, 6].slice(0, assessment.weeklyFrequency) as PostureWeekday[]);
  const [error, setError] = useState('');
  const selected = recommendations.find(({ protocol }) => protocol.id === selectedId);
  if (!recommendations.length) return <section className="mt-8"><h2 className="text-xl font-black">当前没有合适方案</h2><p className="mt-2 text-sm text-zinc-300">我们不会使用低质量内容替代推荐。</p></section>;
  const create = () => {
    if (!selected?.protocol.sourceUrl) return;
    if (weekdays.length !== assessment.weeklyFrequency) { setError(`请选择 ${assessment.weeklyFrequency} 个训练日`); return; }
    const result = repository.tryCreatePlan({ protocolId: selected.protocol.id, assessmentId: assessment.id, startDate: localDateKey(new Date()), durationWeeks, weeklyFrequency: assessment.weeklyFrequency, weekdays, recommendationReasons: selected.reasons, qualitySnapshot: { dataQuality: selected.protocol.dataQuality, completeness: selected.protocol.completeness, sourceUrl: selected.protocol.sourceUrl } });
    if (result.ok) onCreated(result.plan);
    else setError(result.error === 'active-plan-exists' ? '已有进行中的计划' : '计划保存失败，请重试');
  };
  const toggleDay = (day: PostureWeekday) => setWeekdays((values) => values.includes(day) ? values.filter((value) => value !== day) : [...values, day]);
  return <section className="mt-7"><h2 className="text-xl font-black">推荐方案</h2><div className="mt-4 space-y-3">{recommendations.map((item) => <label key={item.protocol.id} data-testid="posture-recommendation" className="flex gap-3 rounded-xl border border-white/12 p-4"><input type="radio" name="recommendation" checked={selectedId === item.protocol.id} onChange={() => setSelectedId(item.protocol.id)} className="mt-1 h-5 w-5 accent-lime-300" /><span><strong className="block text-white">{item.protocol.title}</strong><span className="mt-1 block text-sm leading-6 text-zinc-300">{item.reasons.join('，')}</span><span className="mt-1 block text-xs text-zinc-300">约 {item.estimatedMinutes} 分钟 · {item.protocol.dataQuality}</span></span></label>)}</div>
    <label className="mt-5 block text-sm font-bold text-zinc-200">计划周期<select aria-label="计划周期" value={durationWeeks} onChange={(event) => setDurationWeeks(Number(event.target.value))} className="mt-2 h-12 w-full rounded-xl border border-white/15 bg-[#111410] px-3 text-white"><option value="2">2 周</option><option value="3">3 周</option><option value="4">4 周</option></select></label>
    <fieldset className="mt-5"><legend className="text-sm font-bold text-zinc-200">训练日（选择 {assessment.weeklyFrequency} 天）</legend><div className="mt-2 flex flex-wrap gap-2">{([[1, '周一'], [2, '周二'], [3, '周三'], [4, '周四'], [5, '周五'], [6, '周六'], [0, '周日']] as const).map(([day, label]) => <label key={day} className="flex min-h-11 items-center gap-2 rounded-xl border border-white/12 px-3 text-sm"><input type="checkbox" checked={weekdays.includes(day)} onChange={() => toggleDay(day)} className="h-4 w-4 accent-lime-300" />{label}</label>)}</div></fieldset>
    {error ? <p role="alert" className="mt-3 text-sm font-semibold text-red-200">{error}</p> : null}<button type="button" onClick={create} className="mt-5 min-h-12 w-full rounded-xl bg-lime-300 px-4 text-sm font-black text-[#10130d]">创建改善计划</button></section>;
}
function localDateKey(date: Date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; }
