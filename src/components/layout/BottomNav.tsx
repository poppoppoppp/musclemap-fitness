import { NavLink } from 'react-router-dom';
import HomeIcon from '../icons/HomeIcon';
import PlanIcon from '../icons/PlanIcon';
import UserIcon from '../icons/UserIcon';
import WorkoutIcon from '../icons/WorkoutIcon';

const navItems = [
  { to: '/', label: '首页', icon: HomeIcon },
  { to: '/plan-builder', label: '计划', icon: PlanIcon },
  { to: '/workout-log', label: '训练', icon: WorkoutIcon },
  { to: '/data-management', label: '我的', icon: UserIcon }
];

export default function BottomNav() {
  return (
    <nav className="pointer-events-none fixed inset-x-0 bottom-0 z-20 px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
      <div className="pointer-events-auto mx-auto grid h-[68px] max-w-xl grid-cols-4 gap-1 rounded-2xl border border-app-line bg-app-surface/95 p-1.5 shadow-[0_8px_24px_rgba(17,24,39,0.1)] backdrop-blur-xl">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                [
                  'flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl px-2 py-1 text-xs font-semibold transition duration-200 active:scale-[0.98]',
                  isActive ? 'bg-app-accentSoft text-app-accent' : 'text-app-muted hover:bg-app-surfaceMuted hover:text-app-text'
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
