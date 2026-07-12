import { useEffect, useState } from 'react';

export default function WorkoutTimerCard({ startedAt }: { startedAt: string }) {
  const [nowMs, setNowMs] = useState(() => Date.now());
  const startedAtMs = new Date(startedAt).getTime();
  const hasValidStart = Number.isFinite(startedAtMs);

  useEffect(() => {
    if (!hasValidStart) return;
    const intervalId = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(intervalId);
  }, [hasValidStart]);

  const elapsedSeconds = hasValidStart ? Math.max(0, Math.floor((nowMs - startedAtMs) / 1000)) : 0;

  return (
    <section data-testid="active-workout-card" className="rounded-2xl border border-lime-300/40 bg-[radial-gradient(circle_at_50%_10%,rgba(190,242,100,0.08),transparent_62%),rgba(255,255,255,0.025)] px-4 py-5 text-center shadow-[0_0_14px_rgba(132,204,22,0.08)]">
      <span className="sr-only">进行中</span>
      <p className="text-sm font-semibold text-zinc-400">训练时长</p>
      <p data-testid="workout-duration" aria-label={`训练时长 ${formatElapsedSeconds(elapsedSeconds)}`} className="mt-1.5 font-mono text-[2.55rem] font-black leading-none tracking-[-0.04em] text-lime-300 tabular-nums min-[390px]:text-5xl">
        {formatElapsedSeconds(elapsedSeconds)}
      </p>
      <p data-testid="workout-start-time" className="mt-3 text-sm font-medium text-zinc-500">
        {hasValidStart ? `训练开始 ${formatStartTime(new Date(startedAtMs))}` : '训练开始时间未知'}
      </p>
    </section>
  );
}

export function formatElapsedSeconds(totalSeconds: number) {
  const safeSeconds = Number.isFinite(totalSeconds) ? Math.max(0, Math.floor(totalSeconds)) : 0;
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;
  return [hours, minutes, seconds].map((value) => String(value).padStart(2, '0')).join(':');
}

function formatStartTime(date: Date) {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}
