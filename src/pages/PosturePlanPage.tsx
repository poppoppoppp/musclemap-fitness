import { useState } from 'react';
import PosturePlanDashboard from '../features/posture-plan/PosturePlanDashboard';
import PosturePlanEmptyState from '../features/posture-plan/PosturePlanEmptyState';
import PostureAssessmentForm from '../features/posture-plan/PostureAssessmentForm';
import PostureRecommendationList from '../features/posture-plan/PostureRecommendationList';
import { createPosturePlanRepository } from '../repositories/posturePlanRepository';
import type { PostureAssessment, PostureAssessmentDraft, PostureAssessmentInput, PosturePlan } from '../types/posturePlan';
import { getPostureRecommendationResult, type PostureProtocolRecommendation } from '../utils/posturePlanRules';

export default function PosturePlanPage() {
  const [repository] = useState(createPosturePlanRepository);
  const [draft, setDraft] = useState<PostureAssessmentDraft | null>(() => repository.readAssessmentDraft());
  const [screening, setScreening] = useState(() => Boolean(repository.readAssessmentDraft()));
  const [activePlan, setActivePlan] = useState<PosturePlan | null>(() => repository.getActivePlan());
  const [assessment, setAssessment] = useState<PostureAssessment | null>(null);
  const [recommendations, setRecommendations] = useState<PostureProtocolRecommendation[] | null>(null);
  const [blocked, setBlocked] = useState(false);
  const completeAssessment = (input: PostureAssessmentInput) => {
    const saved = repository.saveAssessment(input);
    repository.clearAssessmentDraft();
    setDraft(null);
    setAssessment(saved);
    const result = getPostureRecommendationResult(saved);
    if (result.status === 'blocked') { setBlocked(true); setRecommendations(null); }
    else { setBlocked(false); setRecommendations(result.recommendations); }
  };
  return (
    <div className="workout-dark relative -mx-4 -mt-5 min-h-[calc(100dvh-5rem)] bg-[#080a08] px-4 pb-10 pt-6 text-white sm:-mx-6 sm:px-6">
      <div className="mx-auto max-w-[440px]">
        <header>
          <h1 className="text-[2rem] font-black tracking-[-0.035em]">体态改善计划</h1>
          <p className="mt-2 text-sm leading-6 text-zinc-300">安排周期训练，记录执行反馈并在周期结束后复测。</p>
        </header>
        {activePlan ? <PosturePlanDashboard plan={activePlan} /> : blocked ? <section className="mt-8"><h2 className="text-xl font-black">建议先进行专业评估</h2><p className="mt-2 text-sm leading-6 text-zinc-300">初筛发现需要优先确认的安全信号，本次不会自动推荐训练方案。</p></section> : assessment && recommendations ? <PostureRecommendationList assessment={assessment} recommendations={recommendations} repository={repository} onCreated={setActivePlan} /> : screening ? <PostureAssessmentForm draft={draft} onDraft={(value) => { repository.saveAssessmentDraft(value); setDraft(value); }} onComplete={completeAssessment} /> : <PosturePlanEmptyState onStart={() => setScreening(true)} />}
      </div>
    </div>
  );
}
