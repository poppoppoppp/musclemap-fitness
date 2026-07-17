interface PosturePlanEmptyStateProps { onStart: () => void; }

export default function PosturePlanEmptyState({ onStart }: PosturePlanEmptyStateProps) {
  return (
    <section className="mt-8 border-y border-white/10 py-8">
      <h2 className="text-xl font-black text-white">从一次安全初筛开始</h2>
      <p className="mt-2 max-w-[42ch] text-sm leading-6 text-zinc-300">根据目标、可用时间和器械匹配训练方案。初筛不会进行医学诊断，出现风险信号时会停止推荐。</p>
      <button type="button" onClick={onStart} className="mt-6 min-h-12 w-full rounded-xl bg-lime-300 px-4 text-sm font-black text-[#10130d] focus:outline-none focus-visible:ring-2 focus-visible:ring-lime-100">开始初筛</button>
    </section>
  );
}
