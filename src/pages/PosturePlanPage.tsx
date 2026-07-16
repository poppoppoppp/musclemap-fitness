import { useState } from 'react';
import PosturePlanDashboard from '../features/posture-plan/PosturePlanDashboard';
import PosturePlanEmptyState from '../features/posture-plan/PosturePlanEmptyState';
import { createPosturePlanRepository } from '../repositories/posturePlanRepository';

export default function PosturePlanPage() {
  const [screening, setScreening] = useState(false);
  const [activePlan] = useState(() => createPosturePlanRepository().getActivePlan());
  return (
    <div className="workout-dark relative -mx-4 -mt-5 min-h-[calc(100dvh-5rem)] bg-[#080a08] px-4 pb-10 pt-6 text-white sm:-mx-6 sm:px-6">
      <div className="mx-auto max-w-[440px]">
        <header>
          <h1 className="text-[2rem] font-black tracking-[-0.035em]">体态改善计划</h1>
          <p className="mt-2 text-sm leading-6 text-zinc-300">安排周期训练，记录执行反馈并在周期结束后复测。</p>
        </header>
        {screening ? <p role="status" className="mt-8 text-sm text-zinc-300">初筛表单将在下一步显示。</p> : activePlan ? <PosturePlanDashboard plan={activePlan} /> : <PosturePlanEmptyState onStart={() => setScreening(true)} />}
      </div>
    </div>
  );
}
