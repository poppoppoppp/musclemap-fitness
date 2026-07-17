import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import PostureAssessmentReport from '../features/posture-screening/PostureAssessmentReport';
import { createPostureScreeningRepository } from '../repositories/postureScreeningRepository';

export default function PostureScreeningResultPage() {
  const { sessionId = '' } = useParams();
  const [repository] = useState(createPostureScreeningRepository);
  const [session, setSession] = useState(() => repository.getSession(sessionId));
  return (
    <div className="workout-dark relative -mx-4 -mt-5 min-h-[calc(100dvh-5rem)] bg-[#080a08] px-4 pb-12 pt-6 text-white sm:-mx-6 sm:px-6">
      <main className="mx-auto max-w-[440px]">
        {session ? <PostureAssessmentReport session={session} repository={repository} onSessionChange={setSession} /> : <section className="mt-8"><h1 className="text-2xl font-black">未找到这次筛查记录</h1><p className="mt-3 text-sm leading-6 text-zinc-300">记录可能已被删除，或当前链接不完整。</p><Link to="/growth/posture" className="mt-6 flex min-h-12 items-center justify-center rounded-xl bg-lime-300 px-4 text-sm font-black text-[#10130d]">返回体态主页</Link></section>}
      </main>
    </div>
  );
}
