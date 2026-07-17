import { useState } from 'react';
import PostureScreeningFlow from '../features/posture-screening/PostureScreeningFlow';
import { createPostureScreeningRepository } from '../repositories/postureScreeningRepository';

export default function PostureScreeningPage() {
  const [repository] = useState(createPostureScreeningRepository);
  return (
    <div className="workout-dark relative -mx-4 -mt-5 min-h-[calc(100dvh-5rem)] bg-[#080a08] px-4 pb-12 pt-6 text-white sm:-mx-6 sm:px-6">
      <main className="mx-auto max-w-[440px]">
        <header>
          <p className="text-xs font-black tracking-[0.12em] text-lime-300">POSTURE SCREEN</p>
          <h1 className="mt-2 text-[2rem] font-black tracking-[-0.035em]">体态表现筛查</h1>
          <p className="mt-2 text-sm leading-6 text-zinc-300">用少量针对性问题和一个引导动作，形成可解释、可复测的表现倾向结果。</p>
        </header>
        <PostureScreeningFlow repository={repository} />
      </main>
    </div>
  );
}
