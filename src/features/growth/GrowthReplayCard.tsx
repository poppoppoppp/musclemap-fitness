export default function GrowthReplayCard() {
  return (
    <section aria-label="成长回放即将上线" className="relative overflow-hidden rounded-[24px] border border-lime-300/20 bg-[#111611]/95 p-5">
      <div aria-hidden="true" className="absolute -left-8 top-1/2 h-28 w-28 -translate-y-1/2 rounded-full bg-lime-300/10 blur-2xl" />
      <div className="relative flex items-center gap-4">
        <span aria-hidden="true" className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-lime-300/60 bg-black/35 text-lime-300 shadow-[0_0_28px_rgba(163,230,53,0.16)]"><span className="ml-1 text-2xl">▶</span></span>
        <div className="min-w-0 flex-1"><h2 className="text-lg font-black tracking-[-0.02em] text-white">成长回放（即将上线）</h2><p className="mt-1 text-sm leading-6 text-zinc-400">一键生成变化视频，见证蜕变过程</p></div>
        <span aria-hidden="true" className="text-3xl font-light text-lime-300">›</span>
      </div>
    </section>
  );
}
