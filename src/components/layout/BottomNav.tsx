import { NavLink } from 'react-router-dom';
import HomeIcon from '../icons/HomeIcon';
import PlanIcon from '../icons/PlanIcon';
import UserIcon from '../icons/UserIcon';
import WorkoutIcon from '../icons/WorkoutIcon';

const navItems = [
  { to: '/', label: '首页', icon: HomeIcon },
  { to: '/plan-builder', label: '计划', icon: PlanIcon },
  { to: '/workout-log', label: '统计', icon: WorkoutIcon },
  { to: '/data-management', label: '我的', icon: UserIcon }
];

export default function BottomNav() {
  return (
    <nav className="pointer-events-none fixed inset-x-0 bottom-0 z-20 px-5 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
      <div className="pointer-events-auto mx-auto grid h-[76px] max-w-[430px] grid-cols-4 gap-1 rounded-[24px] border border-[#E5EAF2] bg-white p-2 shadow-[0_12px_32px_rgba(16,24,40,0.12)]">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                [
                  'flex min-h-[60px] flex-col items-center justify-center gap-1 rounded-2xl px-2 py-1 text-sm font-bold transition duration-200 active:scale-[0.98]',
                  isActive ? 'bg-[#EAF2FF] text-[#2478FF]' : 'text-[#667085] hover:bg-[#F6F8FC] hover:text-[#101828]'
                ].join(' ')
              }
            >
              <Icon className="h-6 w-6" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
