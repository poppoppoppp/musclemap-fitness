import type { PosturePlan } from '../../types/posturePlan';

export default function PosturePlanDashboard({ plan }: { plan: PosturePlan }) {
  return (
    <section className="mt-8 border-y border-white/10 py-6">
      <p className="text-sm font-bold text-lime-300">进行中的改善计划</p>
      <h2 className="mt-2 text-xl font-black text-white">{plan.durationWeeks} 周训练周期</h2>
      <p className="mt-2 text-sm text-zinc-300">每周 {plan.weeklyFrequency} 次，计划开始于 {plan.startDate}</p>
    </section>
  );
}
