import { useState } from 'react';
import { Link } from 'react-router-dom';
import PostureScreeningHistoryList from '../features/posture-screening/PostureScreeningHistoryList';
import { createPostureScreeningRepository } from '../repositories/postureScreeningRepository';

export default function PostureScreeningHistoryPage() {
  const [repository] = useState(createPostureScreeningRepository);
  const [readResult] = useState(() => repository.readSessions());
  return (
    <div className="workout-dark relative -mx-4 -mt-5 min-h-[calc(100dvh-5rem)] bg-[#080a08] px-4 pb-12 pt-6 text-white sm:-mx-6 sm:px-6">
      <main className="mx-auto max-w-[440px]">
        <Link to="/growth/posture" className="mb-5 inline-flex min-h-11 items-center rounded-xl px-1 text-sm font-bold text-zinc-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-300">← 返回体态改善</Link>
        <header className="flex items-start justify-between gap-4"><div><h1 className="text-[2rem] font-black tracking-[-0.035em]">体态筛查历史</h1><p className="mt-2 text-sm leading-6 text-zinc-300">重看当时的结果快照，并在方法一致时比较复测数值。</p></div><Link to="/growth/posture/screening" className="flex min-h-11 shrink-0 items-center rounded-xl border border-lime-300/40 px-3 text-xs font-black text-lime-300">开始筛查</Link></header>
        {!readResult.ok ? <p role="alert" className="mt-5 rounded-xl border border-red-300/25 bg-red-300/[0.06] px-3 py-3 text-sm text-red-100">历史数据异常，暂时无法读取。</p> : null}
        <PostureScreeningHistoryList initialSessions={readResult.value} repository={repository} />
      </main>
    </div>
  );
}
