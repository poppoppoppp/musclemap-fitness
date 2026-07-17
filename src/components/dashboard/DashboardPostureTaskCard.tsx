import type { PosturePlan, PostureSessionFeedback } from '../../types/posturePlan';
import type { PosturePlanLogLike, PostureTodayTask } from '../../utils/posturePlanRules';
import { getPosturePlanProgress } from '../../utils/posturePlanRules';

interface DashboardPostureTaskCardProps {
  feedback: PostureSessionFeedback[];
  logs: PosturePlanLogLike[];
  onStart: () => void;
  plan: PosturePlan;
  task: PostureTodayTask;
}

export default function DashboardPostureTaskCard({ feedback, logs, onStart, plan, task }: DashboardPostureTaskCardProps) {
  const progress = getPosturePlanProgress(plan, logs, feedback);

  return (
    <section className="rounded-3xl border border-lime-300/20 bg-lime-300/[0.06] p-5">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-lime-300">体态改善计划 · 第 {task.weekIndex} 周</p>
      <h2 className="mt-2 text-xl font-black text-white">今日体态任务</h2>
      <p className="mt-2 text-sm leading-6 text-zinc-300">
        已完成 {progress.completedSessions}/{progress.totalSessions} 次。完成训练后记录感受，计划进度才会更新。
      </p>
      <button
        type="button"
        onClick={onStart}
        className="mt-4 min-h-12 w-full rounded-2xl bg-lime-300 px-4 text-sm font-black text-zinc-950 transition hover:bg-lime-200 focus:outline-none focus:ring-2 focus:ring-lime-300 focus:ring-offset-2 focus:ring-offset-[#080a08]"
      >
        开始体态任务
      </button>
    </section>
  );
}
