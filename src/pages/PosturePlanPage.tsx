import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PosturePlanDashboard from '../features/posture-plan/PosturePlanDashboard';
import PosturePlanEmptyState from '../features/posture-plan/PosturePlanEmptyState';
import { createPosturePlanRepository } from '../repositories/posturePlanRepository';
import type { PosturePlan } from '../types/posturePlan';
import { getPosturePlanProgress } from '../utils/posturePlanRules';
import { readWorkoutLogs } from '../utils/workoutHistory';

export default function PosturePlanPage() {
  const navigate = useNavigate();
  const [repository] = useState(createPosturePlanRepository);
  const [activePlan, setActivePlan] = useState<PosturePlan | null>(() => repository.getActivePlan());
  const [notice, setNotice] = useState('');
  const progress = activePlan ? getPosturePlanProgress(activePlan, readWorkoutLogs(), repository.listFeedback()) : null;

  const updatePlan = (operation: 'pause' | 'resume' | 'complete') => {
    if (!activePlan) return;
    const result = operation === 'pause' ? repository.pausePlan(activePlan.id) : operation === 'resume' ? repository.resumePlan(activePlan.id) : repository.completePlan(activePlan.id);
    if (!result.ok) { setNotice('计划状态更新失败，请重试。'); return; }
    setActivePlan(result.plan.status === 'completed' ? null : result.plan);
    setNotice(operation === 'pause' ? '计划已暂停。' : operation === 'resume' ? '计划已继续。' : '计划已结束并保留历史记录。');
  };

  return (
    <div className="workout-dark relative -mx-4 -mt-5 min-h-[calc(100dvh-5rem)] bg-[#080a08] px-4 pb-10 pt-6 text-white sm:-mx-6 sm:px-6">
      <div className="mx-auto max-w-[440px]">
        <header>
          <h1 className="text-[2rem] font-black tracking-[-0.035em]">体态改善计划</h1>
          <p className="mt-2 text-sm leading-6 text-zinc-300">安排周期训练，记录执行反馈并在周期结束后复测。</p>
        </header>
        {notice ? <p role="status" className="mt-5 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-zinc-200">{notice}</p> : null}
        {activePlan && progress ? (
          <PosturePlanDashboard
            plan={activePlan}
            progress={progress}
            onPause={() => updatePlan('pause')}
            onResume={() => updatePlan('resume')}
            onReassess={() => navigate(`/growth/posture/screening?planId=${encodeURIComponent(activePlan.id)}`)}
            onComplete={() => { if (window.confirm('结束后将停止生成今日任务，历史记录仍会保留。确定结束吗？')) updatePlan('complete'); }}
          />
        ) : <PosturePlanEmptyState />}
      </div>
    </div>
  );
}
