import type { PosturePlan } from '../../types/posturePlan';
import type { PosturePlanProgress } from '../../utils/posturePlanRules';

interface Props {
  plan: PosturePlan;
  progress: PosturePlanProgress;
  onComplete: () => void;
  onPause: () => void;
  onReassess: () => void;
  onResume: () => void;
}

export default function PosturePlanDashboard({ plan, progress, onComplete, onPause, onReassess, onResume }: Props) {
  return (
    <section className="mt-8 border-y border-white/10 py-6">
      <p className="text-sm font-bold text-lime-300">{plan.status === 'paused' ? '已暂停的改善计划' : '进行中的改善计划'}</p>
      <h2 className="mt-2 text-xl font-black text-white">{plan.durationWeeks} 周训练周期</h2>
      <p className="mt-2 text-sm text-zinc-300">每周 {plan.weeklyFrequency} 次，计划开始于 {plan.startDate}</p>
      <div className="mt-5 grid grid-cols-3 gap-2" aria-label="计划进度">
        <Metric label="当前周" value={`${progress.weekIndex}/${plan.durationWeeks}`} />
        <Metric label="已完成" value={`${progress.completedSessions}/${progress.totalSessions}`} />
        <Metric label="漏练" value={String(progress.missedSessions)} />
      </div>
      {plan.status === 'paused' ? <p className="mt-4 rounded-xl border border-amber-300/20 bg-amber-300/[0.06] px-3 py-2 text-sm text-amber-100">暂停期间不会生成今日任务，也不会计为漏练。</p> : null}
      <div className="mt-5 grid grid-cols-2 gap-2">
        <button type="button" onClick={plan.status === 'paused' ? onResume : onPause} className="min-h-11 rounded-xl border border-white/15 px-3 text-sm font-bold text-white focus:outline-none focus:ring-2 focus:ring-white/30">{plan.status === 'paused' ? '继续计划' : '暂停计划'}</button>
        <button type="button" onClick={onReassess} className="min-h-11 rounded-xl border border-lime-300/30 px-3 text-sm font-bold text-lime-200 focus:outline-none focus:ring-2 focus:ring-lime-300/40">开始复测</button>
        <button type="button" onClick={onComplete} className="col-span-2 min-h-11 rounded-xl border border-red-300/25 px-3 text-sm font-bold text-red-200 focus:outline-none focus:ring-2 focus:ring-red-300/40">结束当前计划</button>
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-white/[0.04] px-2 py-3 text-center"><p className="text-lg font-black text-white">{value}</p><p className="mt-1 text-xs text-zinc-300">{label}</p></div>;
}
