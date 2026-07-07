import { useRef, useState, type UIEvent } from 'react';
import { Link } from 'react-router-dom';
import type { WorkoutLog } from '../../types/workout';
import type { DashboardWorkoutSummary } from '../../utils/dashboard';
import ChevronIcon from '../icons/ChevronIcon';
import DumbbellIcon from '../icons/DumbbellIcon';

interface DashboardRecentWorkoutCardProps {
  workouts: Array<{ log: WorkoutLog; summary: DashboardWorkoutSummary }>;
}

export default function DashboardRecentWorkoutCard({ workouts }: DashboardRecentWorkoutCardProps) {
  const carouselRef = useRef<HTMLDivElement>(null);
  const slideRefs = useRef<Array<HTMLAnchorElement | null>>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const handleScroll = (event: UIEvent<HTMLDivElement>) => {
    const container = event.currentTarget;
    let closestIndex = 0;
    let closestDistance = Number.POSITIVE_INFINITY;

    slideRefs.current.forEach((slide, index) => {
      if (!slide) return;
      const distance = Math.abs(slide.offsetLeft - container.scrollLeft - container.offsetLeft);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestIndex = index;
      }
    });

    setSelectedIndex(closestIndex);
  };

  const selectSlide = (index: number) => {
    setSelectedIndex(index);
    const container = carouselRef.current;
    const slide = slideRefs.current[index];
    if (!container || !slide) return;
    container.scrollTo({ left: slide.offsetLeft - container.offsetLeft, behavior: 'smooth' });
  };

  return (
    <section aria-labelledby="recent-workout-title">
      <div className="mb-3 flex items-center justify-between">
        <h2 id="recent-workout-title" className="text-lg font-extrabold text-white">最近一次训练</h2>
        <Link to="/workout-history" className="min-h-11 py-3 text-sm font-semibold text-zinc-400 hover:text-white">查看全部</Link>
      </div>
      {workouts.length === 0 ? (
        <Link data-testid="dashboard-recent-workout" to="/workout-history" className="group flex min-h-[126px] items-center gap-4 rounded-[22px] border border-white/10 bg-white/[0.055] p-4 transition duration-200 hover:border-white/20 hover:bg-white/[0.075] focus:outline-none focus:ring-2 focus:ring-lime-300/70">
          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[18px] bg-lime-300/10 text-lime-300"><DumbbellIcon className="h-8 w-8" /></span>
          <span className="min-w-0 flex-1 text-sm leading-6 text-zinc-400">还没有训练记录，完成一次训练后会显示在这里</span>
          <ChevronIcon className="h-5 w-5 shrink-0 text-zinc-600 transition group-hover:text-zinc-300" />
        </Link>
      ) : (
        <div data-testid="dashboard-recent-workout">
          <div ref={carouselRef} onScroll={handleScroll} className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {workouts.map(({ log, summary }, index) => (
              <Link
                key={log.id}
                ref={(element) => { slideRefs.current[index] = element; }}
                data-testid="dashboard-recent-workout-slide"
                data-selected={selectedIndex === index ? 'true' : 'false'}
                aria-label={`查看 ${summary.date} 的训练详情`}
                to={`/workout-history/${log.id}`}
                className={`group flex min-h-[126px] basis-[calc(100%-1.5rem)] shrink-0 snap-start items-center gap-4 rounded-[22px] border p-4 transition duration-200 active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-lime-300/70 ${selectedIndex === index ? 'border-lime-300/35 bg-white/[0.075]' : 'border-white/10 bg-white/[0.045]'}`}
              >
                <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[18px] bg-lime-300/10 text-lime-300"><DumbbellIcon className="h-8 w-8" /></span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-base font-bold text-zinc-100">{summary.title}</span>
                  <span className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs font-medium text-zinc-400">
                    <span>{summary.date}</span>
                    {summary.duration ? <span>{summary.duration}</span> : null}
                    {summary.calories ? <span>{summary.calories} kcal</span> : null}
                    <span>{summary.setCount} 组</span>
                  </span>
                  <span className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-lime-300">已完成 <span aria-hidden="true">✓</span></span>
                </span>
                <ChevronIcon className="h-5 w-5 shrink-0 text-zinc-600 transition group-hover:text-zinc-300" />
              </Link>
            ))}
          </div>
          {workouts.length > 1 ? (
            <div className="mt-3 flex items-center justify-center gap-2" aria-label="训练记录分页">
              {workouts.map(({ log }, index) => (
                <button key={log.id} type="button" aria-label={`查看第 ${index + 1} 次训练`} aria-current={selectedIndex === index ? 'true' : undefined} onClick={() => selectSlide(index)} className={`h-2 rounded-full transition-[width,background-color] duration-200 focus:outline-none focus:ring-2 focus:ring-lime-300/70 ${selectedIndex === index ? 'w-5 bg-lime-300' : 'w-2 bg-zinc-600 hover:bg-zinc-400'}`} />
              ))}
              <span data-testid="dashboard-workout-position" className="ml-1 text-[11px] font-semibold tabular-nums text-zinc-500">{selectedIndex + 1}/{workouts.length}</span>
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}
