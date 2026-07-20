import { Link } from 'react-router-dom';
import type { PostureScreeningSession } from '../../repositories/postureScreeningRepository';

export default function PostureAnalysisSummary({ session, creatable }: { session: PostureScreeningSession; creatable: boolean }) {
  const primaryFinding = session.result.findings.find(({ confidence }) => confidence === 'supported') ?? session.result.findings[0];
  const professionalReview = session.result.nextActions.some(({ kind }) => kind === 'professional-review');
  return (
    <section data-testid="posture-state-assessed" className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-black tracking-[0.12em] text-lime-300">最近筛查 · {formatDate(session.completedAt)}</p>
        <span className={`rounded-full px-2.5 py-1 text-[11px] font-black ${creatable ? 'bg-lime-300/15 text-lime-200' : 'bg-amber-300/10 text-amber-200'}`}>{creatable ? '可创建计划' : '结果受限'}</span>
      </div>
      <h2 className="mt-4 text-xl font-black leading-snug text-white">{primaryFinding?.label ?? '本次筛查未形成可支持的 finding'}</h2>
      <p className="mt-3 text-sm leading-6 text-zinc-400">{session.result.summary}</p>
      {!creatable ? <p className="mt-4 rounded-xl border border-amber-300/15 bg-amber-300/[0.06] px-3 py-2 text-sm leading-6 text-amber-100">当前结果不能用于创建训练计划。你仍可查看完整报告、复测，或按照报告建议寻求专业评估。</p> : null}
      <div className="mt-5 grid gap-2 sm:grid-cols-2">
        <Link to={`/growth/posture/results/${encodeURIComponent(session.id)}`} className="flex min-h-11 items-center justify-center rounded-xl border border-white/15 px-3 text-sm font-bold text-zinc-100">查看筛查报告</Link>
        {creatable ? <Link to={`/growth/posture/plan/new?sessionId=${encodeURIComponent(session.id)}`} className="flex min-h-11 items-center justify-center rounded-xl bg-lime-300 px-3 text-sm font-black text-[#10130d]">手动选择训练方案</Link> : <Link to="/growth/posture/screening" className="flex min-h-11 items-center justify-center rounded-xl border border-lime-300/25 px-3 text-sm font-bold text-lime-200">重新筛查</Link>}
        {!creatable ? <Link to={`/growth/posture/screening?baselineSessionId=${encodeURIComponent(session.id)}`} className="flex min-h-11 items-center justify-center rounded-xl border border-white/15 px-3 text-sm font-bold text-zinc-200">开始复测</Link> : null}
        {!creatable && professionalReview ? <Link to={`/growth/posture/results/${encodeURIComponent(session.id)}#professional-review`} className="flex min-h-11 items-center justify-center rounded-xl border border-amber-300/20 px-3 text-sm font-bold text-amber-100">查看专业评估建议</Link> : null}
      </div>
    </section>
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}` : '时间未知';
}
