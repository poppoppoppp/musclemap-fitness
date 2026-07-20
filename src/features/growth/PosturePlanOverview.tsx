import { Link } from 'react-router-dom';
import type { PostureGrowthViewState } from '../../types/postureGrowth';
import { getPostureProtocolById } from '../../utils/postureProtocols';

type PlanState = Extract<PostureGrowthViewState, { status: 'active-plan' | 'paused-plan' | 'completed-plan' }>;

interface Props {
  state: PlanState;
  onComplete?: () => void;
  onPause?: () => void;
  onResume?: () => void;
  onStartToday?: () => void;
}

export default function PosturePlanOverview({ state, onComplete, onPause, onResume, onStartToday }: Props) {
  const protocol = getPostureProtocolById(state.plan.protocolId);
  const completed = state.status === 'completed-plan';
  const paused = state.status === 'paused-plan';
  return (
    <section data-testid={`posture-state-${state.status}`} className="space-y-5">
      <div className="overflow-hidden rounded-[24px] border border-lime-300/20 bg-[linear-gradient(135deg,rgba(190,242,48,0.11),rgba(255,255,255,0.025)_54%)] p-5">
        <div className="flex items-center justify-between gap-3"><p className="text-xs font-black tracking-[0.12em] text-lime-300">{completed ? '最近完成计划' : paused ? '计划已暂停' : '当前改善周期'}</p>{!completed ? <span className={`rounded-full px-2.5 py-1 text-[11px] font-black ${paused ? 'bg-amber-300/10 text-amber-200' : 'bg-lime-300/15 text-lime-200'}`}>{paused ? '暂停中' : '进行中'}</span> : null}</div>
        <h2 className="mt-4 text-2xl font-black leading-tight text-white">{protocol?.title ?? state.plan.protocolId}</h2>
        <p className="mt-2 text-sm leading-6 text-zinc-400">{protocol?.userFacingGoal ?? `每周 ${state.plan.weeklyFrequency} 次，共 ${state.plan.durationWeeks} 周`}</p>
        <div className="mt-5 grid grid-cols-3 gap-2"><Metric label="当前周" value={`${state.progress.weekIndex}/${state.plan.durationWeeks}`} /><Metric label="已完成" value={`${state.progress.completedSessions}/${state.progress.totalSessions}`} /><Metric label="漏练" value={String(state.progress.missedSessions)} /></div>
        {paused ? <p className="mt-4 rounded-xl border border-amber-300/15 bg-amber-300/[0.06] px-3 py-2 text-sm text-amber-100">暂停期间不会生成今日任务，也不计为漏练。</p> : null}
        {state.status === 'active-plan' && state.todayTask && onStartToday ? <button type="button" onClick={onStartToday} className="mt-5 min-h-12 w-full rounded-xl bg-lime-300 px-4 text-sm font-black text-[#10130d]">继续今日训练</button> : null}
      </div>
      {!completed ? (
        <section className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
          <h3 className="text-base font-black text-white">当前重点</h3>
          <div className="mt-3 flex flex-wrap gap-2">{(protocol?.targetIssues ?? []).map((item) => <span key={item} className="rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-xs font-bold text-zinc-300">{item}</span>)}</div>
          <div className="mt-5 grid grid-cols-2 gap-2">
            <button type="button" onClick={paused ? onResume : onPause} className="min-h-11 rounded-xl border border-white/15 px-3 text-sm font-bold text-white">{paused ? '继续计划' : '暂停计划'}</button>
            <Link to={`/growth/posture/screening?planId=${encodeURIComponent(state.plan.id)}`} className="flex min-h-11 items-center justify-center rounded-xl border border-lime-300/25 px-3 text-sm font-bold text-lime-200">开始复测</Link>
            <button type="button" onClick={onComplete} className="col-span-2 min-h-11 rounded-xl border border-red-300/20 px-3 text-sm font-bold text-red-200">结束当前计划</button>
          </div>
        </section>
      ) : (
        <div className="grid grid-cols-2 gap-2"><Link to="/growth/posture/history" className="flex min-h-12 items-center justify-center rounded-xl border border-white/15 px-3 text-sm font-bold text-zinc-100">查看历史记录</Link><Link to={`/growth/posture/screening?planId=${encodeURIComponent(state.plan.id)}`} className="flex min-h-12 items-center justify-center rounded-xl bg-lime-300 px-3 text-sm font-black text-[#10130d]">开始新周期筛查</Link></div>
      )}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-white/5 bg-black/20 px-2 py-3 text-center"><p className="text-lg font-black text-white">{value}</p><p className="mt-1 text-[11px] text-zinc-500">{label}</p></div>;
}
