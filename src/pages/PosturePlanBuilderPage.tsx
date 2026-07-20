import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import PostureManualPlanBuilder from '../features/posture-plan/PostureManualPlanBuilder';
import { createPosturePlanRepository } from '../repositories/posturePlanRepository';
import { createPostureScreeningRepository } from '../repositories/postureScreeningRepository';
import { canCreatePosturePlanFromSession } from '../utils/postureGrowth';

export default function PosturePlanBuilderPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [screeningRepository] = useState(createPostureScreeningRepository);
  const [planRepository] = useState(createPosturePlanRepository);
  const sessionId = searchParams.get('sessionId')?.trim() ?? '';
  const [session] = useState(() => sessionId ? screeningRepository.getSession(sessionId) : null);
  const valid = Boolean(session && canCreatePosturePlanFromSession(session) && !planRepository.getActivePlan());

  useEffect(() => {
    if (!valid) navigate('/growth/posture', { replace: true, state: { postureNotice: '这次筛查当前无法用于创建计划，请查看最新状态。' } });
  }, [navigate, valid]);

  if (!session || !valid) return null;
  return (
    <div className="workout-dark relative -mx-4 -mt-5 min-h-[calc(100dvh-5rem)] bg-[#080a08] px-4 pb-12 pt-6 text-white sm:-mx-6 sm:px-6">
      <PostureManualPlanBuilder session={session} screeningRepository={screeningRepository} planRepository={planRepository} />
    </div>
  );
}
