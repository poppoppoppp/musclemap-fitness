import { Link } from 'react-router-dom';

interface ActiveWorkoutHeaderProps {
  onEndWorkout: () => void;
  onDiscardWorkout: () => void;
}

export default function ActiveWorkoutHeader({ onEndWorkout, onDiscardWorkout }: ActiveWorkoutHeaderProps) {
  return (
    <header className="flex min-h-14 items-center justify-between gap-2">
      <div className="min-w-0">
        <div className="flex items-center gap-2.5">
          <h1 className="text-2xl font-black tracking-[-0.035em] text-white min-[390px]:text-[1.75rem]">训练中</h1>
          <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full bg-lime-300 shadow-[0_0_8px_rgba(190,242,100,0.55)]" />
        </div>
        <p className="mt-0.5 text-sm font-semibold text-lime-300">进行中</p>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <Link
          to="/#music-player"
          className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-white/15 px-2.5 text-xs font-bold text-zinc-300 transition hover:border-lime-300/35 hover:text-lime-300 focus:outline-none focus:ring-2 focus:ring-lime-300/60"
          aria-label="打开训练音乐"
        >
          <span aria-hidden="true">♫</span><span>音乐</span>
        </Link>
        <span data-testid="end-active-workout-bottom" className="inline-flex">
          <button
            type="button"
            onClick={onEndWorkout}
            data-testid="end-active-workout"
            className="min-h-11 rounded-full border border-red-400/45 px-2.5 text-xs font-bold text-red-300 transition hover:border-red-300 hover:bg-red-400/[0.06] focus:outline-none focus:ring-2 focus:ring-red-300/50 min-[390px]:px-3 min-[390px]:text-sm"
          >
            结束训练
          </button>
        </span>
        <details className="relative">
          <summary aria-label="更多训练操作" className="flex h-11 w-8 cursor-pointer list-none items-center justify-center rounded-full text-lg font-black text-zinc-500 transition hover:text-white focus:outline-none focus:ring-2 focus:ring-white/30">•••</summary>
          <div className="absolute right-0 top-12 z-30 w-40 rounded-xl border border-white/10 bg-[#171a16] p-1.5 shadow-lg">
            <button type="button" onClick={onDiscardWorkout} data-testid="discard-active-workout" className="min-h-11 w-full rounded-lg px-3 text-left text-sm font-bold text-red-300 transition hover:bg-red-400/10 focus:outline-none focus:ring-2 focus:ring-red-300/40">放弃当前训练</button>
          </div>
        </details>
      </div>
    </header>
  );
}
