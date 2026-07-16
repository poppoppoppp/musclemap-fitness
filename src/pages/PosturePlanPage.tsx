import { useState } from 'react';
import PosturePlanDashboard from '../features/posture-plan/PosturePlanDashboard';
import PosturePlanEmptyState from '../features/posture-plan/PosturePlanEmptyState';
import PostureAssessmentForm from '../features/posture-plan/PostureAssessmentForm';
import PostureRecommendationList from '../features/posture-plan/PostureRecommendationList';
import { createPosturePlanRepository } from '../repositories/posturePlanRepository';
import type { PostureAssessment, PostureAssessmentDraft, PostureAssessmentInput, PosturePlan } from '../types/posturePlan';
import { getPostureRecommendationResult, type PostureProtocolRecommendation } from '../utils/posturePlanRules';
import { getPosturePlanProgress } from '../utils/posturePlanRules';
import { readWorkoutLogs } from '../utils/workoutHistory';

export default function PosturePlanPage() {
  const [repository] = useState(createPosturePlanRepository);
  const [draft, setDraft] = useState<PostureAssessmentDraft | null>(() => repository.readAssessmentDraft());
  const [screening, setScreening] = useState(() => Boolean(repository.readAssessmentDraft()));
  const [activePlan, setActivePlan] = useState<PosturePlan | null>(() => repository.getActivePlan());
  const [assessment, setAssessment] = useState<PostureAssessment | null>(null);
  const [recommendations, setRecommendations] = useState<PostureProtocolRecommendation[] | null>(null);
  const [blocked, setBlocked] = useState(false);
  const [reassessing, setReassessing] = useState(false);
  const [notice, setNotice] = useState('');
  const completeAssessment = (input: PostureAssessmentInput) => {
    const saved = repository.saveAssessment(input);
    repository.clearAssessmentDraft();
    setDraft(null);
    setAssessment(saved);
    const result = getPostureRecommendationResult(saved);
    if (result.status === 'blocked') { setBlocked(true); setRecommendations(null); }
    else { setBlocked(false); setRecommendations(result.recommendations); }
  };
  const progress = activePlan ? getPosturePlanProgress(activePlan, readWorkoutLogs(), repository.listFeedback()) : null;
  const updatePlan = (operation: 'pause' | 'resume' | 'complete') => {
    if (!activePlan) return;
    const result = operation === 'pause' ? repository.pausePlan(activePlan.id) : operation === 'resume' ? repository.resumePlan(activePlan.id) : repository.completePlan(activePlan.id);
    if (!result.ok) { setNotice('计划状态更新失败，请重试。'); return; }
    setActivePlan(result.plan.status === 'completed' ? null : result.plan);
    setNotice(operation === 'pause' ? '计划已暂停。' : operation === 'resume' ? '计划已继续。' : '计划已结束并保留历史记录。');
  };
  const completeReassessment = (input: PostureAssessmentInput) => {
    if (!activePlan) return;
    const result = repository.saveReassessment(activePlan.id, input);
    if (!result.ok) { setNotice('复测保存失败，请重试。'); return; }
    setActivePlan(result.plan);
    setReassessing(false);
    setNotice(input.riskFlags.length ? '复测已保存；检测到安全信号，建议先进行专业评估。' : '复测已保存，可对照初筛结果查看变化。');
  };
  return (
    <div className="workout-dark relative -mx-4 -mt-5 min-h-[calc(100dvh-5rem)] bg-[#080a08] px-4 pb-10 pt-6 text-white sm:-mx-6 sm:px-6">
      <div className="mx-auto max-w-[440px]">
        <header>
          <h1 className="text-[2rem] font-black tracking-[-0.035em]">体态改善计划</h1>
          <p className="mt-2 text-sm leading-6 text-zinc-300">安排周期训练，记录执行反馈并在周期结束后复测。</p>
        </header>
        {notice ? <p role="status" className="mt-5 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-zinc-200">{notice}</p> : null}
        {activePlan && reassessing ? <PostureAssessmentForm kind="reassessment" planId={activePlan.id} onDraft={() => undefined} onComplete={completeReassessment} /> : activePlan && progress ? <PosturePlanDashboard plan={activePlan} progress={progress} onPause={() => updatePlan('pause')} onResume={() => updatePlan('resume')} onReassess={() => setReassessing(true)} onComplete={() => { if (window.confirm('结束后将停止生成今日任务，历史记录仍会保留。确定结束吗？')) updatePlan('complete'); }} /> : blocked ? <section className="mt-8"><h2 className="text-xl font-black">建议先进行专业评估</h2><p className="mt-2 text-sm leading-6 text-zinc-300">初筛发现需要优先确认的安全信号，本次不会自动推荐训练方案。</p></section> : assessment && recommendations ? <PostureRecommendationList assessment={assessment} recommendations={recommendations} repository={repository} onCreated={setActivePlan} /> : screening ? <PostureAssessmentForm draft={draft} onDraft={(value) => { repository.saveAssessmentDraft(value); setDraft(value); }} onComplete={completeAssessment} /> : <PosturePlanEmptyState onStart={() => setScreening(true)} />}
      </div>
    </div>
  );
}
