import { Link } from 'react-router-dom';
import type { GeneratedPlan, GeneratedWorkoutDay } from '../../types/workout';
import CalendarIcon from '../icons/CalendarIcon';
import ChevronIcon from '../icons/ChevronIcon';

interface DashboardRecentPlanCardProps {
  day: GeneratedWorkoutDay | null;
  onStartPlanDay: () => void;
  plan: GeneratedPlan | null;
}

export default function DashboardRecentPlanCard({ day }: DashboardRecentPlanCardProps) {
  return (
    <Link
      data-testid="dashboard-recent-plan"
      to="/plan-builder"
      className="flex min-h-[86px] items-center gap-4 rounded-[22px] bg-white px-4 py-4 shadow-[0_10px_26px_rgba(16,24,40,0.06)] transition active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-[#2478FF]/25"
    >
      <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#EAF2FF] text-[#2478FF]">
        <CalendarIcon className="h-8 w-8" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-lg font-black leading-6 text-[#101828]">最近计划</span>
        <span className="mt-1 block whitespace-nowrap text-[12px] font-medium sm:text-base" style={{ color: '#667085' }}>
          {day ? `${day.name} · 今天可执行` : 'Push Day · 今天可执行'}
        </span>
      </span>
      <ChevronIcon className="h-7 w-7 shrink-0 text-[#667085]" />
    </Link>
  );
}
