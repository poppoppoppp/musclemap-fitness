import { useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import PostureScreeningFlow from '../features/posture-screening/PostureScreeningFlow';
import { createPostureScreeningRepository, type PostureScreeningContext } from '../repositories/postureScreeningRepository';

export default function PostureScreeningPage() {
  const location = useLocation();
  const [repository] = useState(createPostureScreeningRepository);
  const entryContext = useMemo(() => readEntryContext(location.search), [location.search]);
  return (
    <div className="workout-dark relative -mx-4 -mt-5 min-h-[calc(100dvh-5rem)] bg-[#080a08] px-4 pb-12 pt-6 text-white sm:-mx-6 sm:px-6">
      <main className="mx-auto max-w-[440px]">
        <Link to="/growth/posture" className="mb-5 inline-flex min-h-11 items-center rounded-xl px-1 text-sm font-bold text-zinc-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-300">← 返回体态改善</Link>
        <header>
          <p className="text-xs font-black tracking-[0.12em] text-lime-300">POSTURE SCREEN</p>
          <h1 className="mt-2 text-[2rem] font-black tracking-[-0.035em]">体态表现筛查</h1>
          <p className="mt-2 text-sm leading-6 text-zinc-300">用少量针对性问题和一个引导动作，形成可解释、可复测的表现倾向结果。</p>
        </header>
        <PostureScreeningFlow repository={repository} entryContext={entryContext} />
      </main>
    </div>
  );
}

function readEntryContext(search: string): PostureScreeningContext | undefined {
  const params = new URLSearchParams(search);
  const planId = cleanId(params.get('planId'));
  const baselineSessionId = cleanId(params.get('baselineSessionId'));
  return planId || baselineSessionId ? { ...(planId ? { planId } : {}), ...(baselineSessionId ? { baselineSessionId } : {}) } : undefined;
}

function cleanId(value: string | null): string | undefined {
  const cleaned = value?.trim();
  return cleaned ? cleaned.slice(0, 200) : undefined;
}
