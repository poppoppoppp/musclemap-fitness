import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPosturePlanRepository } from '../../repositories/posturePlanRepository';
import { createPostureScreeningRepository } from '../../repositories/postureScreeningRepository';
import { addPosturePlanTaskToActiveWorkout, readActiveWorkout, startPosturePlanWorkout, writeActiveWorkout } from '../../utils/activeWorkout';
import { derivePostureGrowthViewState } from '../../utils/postureGrowth';
import { readWorkoutLogs } from '../../utils/workoutHistory';
import PostureAnalysisSummary from './PostureAnalysisSummary';
import PostureEmptyState from './PostureEmptyState';
import PosturePlanOverview from './PosturePlanOverview';
import PostureTrendCard from './PostureTrendCard';

export default function PostureGrowthSection({ routeNotice = '' }: { routeNotice?: string }) {
  const navigate = useNavigate();
  const [planRepository] = useState(createPosturePlanRepository);
  const [screeningRepository] = useState(createPostureScreeningRepository);
  const [, setRevision] = useState(0);
  const [notice, setNotice] = useState(routeNotice);
  const sessions = screeningRepository.readSessions();
  const state = derivePostureGrowthViewState({
    sessions: sessions.ok ? sessions.value : [],
    plans: planRepository.listPlans(),
    logs: readWorkoutLogs(),
    feedback: planRepository.listFeedback(),
    now: new Date(),
  });

  const updatePlan = (operation: 'pause' | 'resume' | 'complete') => {
    if (state.status !== 'active-plan' && state.status !== 'paused-plan') return;
    if (operation === 'complete' && !window.confirm('结束后将停止生成今日任务，历史记录仍会保留。确定结束吗？')) return;
    const result = operation === 'pause' ? planRepository.pausePlan(state.plan.id) : operation === 'resume' ? planRepository.resumePlan(state.plan.id) : planRepository.completePlan(state.plan.id);
    if (!result.ok) { setNotice('计划状态更新失败，请重试。'); return; }
    setNotice(operation === 'pause' ? '计划已暂停。' : operation === 'resume' ? '计划已继续。' : '计划已结束，历史记录已保留。');
    setRevision((value) => value + 1);
  };

  const startToday = () => {
    if (state.status !== 'active-plan' || !state.todayTask) return;
    const existing = readActiveWorkout();
    const workout = existing ? addPosturePlanTaskToActiveWorkout(existing, state.plan, state.todayTask) : startPosturePlanWorkout(state.plan, state.todayTask);
    writeActiveWorkout(workout);
    navigate('/workout-log');
  };

  return (
    <div className="space-y-5">
      {notice ? <p role="status" className="rounded-xl border border-lime-300/15 bg-lime-300/[0.06] px-3 py-2 text-sm text-lime-100">{notice}</p> : null}
      {!sessions.ok ? <p role="alert" className="rounded-xl border border-red-300/20 bg-red-300/[0.06] px-3 py-2 text-sm text-red-100">筛查记录暂时无法读取，请先检查数据备份或浏览器存储。</p> : null}
      {state.status === 'empty' ? <PostureEmptyState /> : null}
      {state.status === 'assessed' ? <PostureAnalysisSummary session={state.session} creatable={state.creatable} /> : null}
      {state.status === 'active-plan' ? <PosturePlanOverview state={state} onPause={() => updatePlan('pause')} onComplete={() => updatePlan('complete')} onStartToday={startToday} /> : null}
      {state.status === 'paused-plan' ? <PosturePlanOverview state={state} onResume={() => updatePlan('resume')} onComplete={() => updatePlan('complete')} /> : null}
      {state.status === 'completed-plan' ? <PosturePlanOverview state={state} /> : null}
      {'trend' in state && state.trend ? <PostureTrendCard trend={state.trend} /> : null}
    </div>
  );
}
