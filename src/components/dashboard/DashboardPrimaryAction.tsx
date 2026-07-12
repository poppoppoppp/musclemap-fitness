import { Link } from 'react-router-dom';
import PlayIcon from '../icons/PlayIcon';

interface DashboardPrimaryActionProps {
  activeElapsedLabel: string | null;
  activeSummary: string | null;
  isActive: boolean;
  onStartWorkout: () => void;
}

export default function DashboardPrimaryAction({ activeElapsedLabel, activeSummary, isActive, onStartWorkout }: DashboardPrimaryActionProps) {
  return (
    <section
      data-testid="dashboard-start-card"
      className="relative isolate min-h-[260px] overflow-hidden rounded-[28px] border border-lime-300/20 bg-[#11150f] px-6 py-7 shadow-[0_22px_70px_rgba(0,0,0,0.46)]"
    >
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_78%_42%,rgba(190,242,48,0.22),transparent_30%),linear-gradient(125deg,transparent_48%,rgba(190,242,48,0.08)_49%,transparent_50%)]" />
      <div aria-hidden="true" className="absolute -right-12 top-8 -z-10 h-56 w-56 rounded-full border border-lime-300/30 shadow-[0_0_80px_rgba(190,242,48,0.13)]" />
      <div aria-hidden="true" className="absolute right-7 top-16 -z-10 h-40 w-20 -rotate-12 rounded-[50%] border-l-2 border-r border-lime-300/25 border-white/5" />

      <span className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-lime-300/40 bg-black/40 text-lime-300">
        <PlayIcon className="h-5 w-5" />
      </span>
      <h2 className="mt-7 text-[2rem] font-black tracking-[-0.03em] text-white">{isActive ? '继续训练' : '开始训练'}</h2>
      <p className="mt-1 text-[15px] font-medium text-zinc-400">{isActive ? activeSummary ?? '训练正在进行中' : '选择计划或自由训练'}</p>

      <Link
        to="/workout-log"
        onClick={onStartWorkout}
        className="mt-7 flex min-h-14 w-full max-w-[220px] items-center justify-between rounded-full bg-lime-300 px-6 text-base font-black text-[#10130d] shadow-[0_10px_30px_rgba(190,242,48,0.22)] transition duration-200 hover:bg-lime-200 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-lime-200 focus:ring-offset-2 focus:ring-offset-[#11150f]"
      >
        <span>{isActive ? '继续训练' : '开始训练'}</span>
        {activeElapsedLabel ? (
          <span data-testid="dashboard-active-workout-timer" aria-label={`当前训练用时 ${activeElapsedLabel}`} className="tabular-nums">
            {activeElapsedLabel}
          </span>
        ) : (
          <span aria-hidden="true" className="flex h-8 w-8 items-center justify-center rounded-full bg-[#10130d] text-lime-300">→</span>
        )}
      </Link>
    </section>
  );
}
