import { NavLink, useLocation } from 'react-router-dom';
import HomeIcon from '../icons/HomeIcon';
import UserIcon from '../icons/UserIcon';
import WorkoutIcon from '../icons/WorkoutIcon';
import DumbbellIcon from '../icons/DumbbellIcon';

const navItems = [
  { to: '/', label: '首页', icon: HomeIcon },
  { to: '/workout-log', label: '记录', icon: WorkoutIcon },
  { to: '/exercises', label: '动作库', icon: DumbbellIcon },
  { to: '/data-management', label: '我的', icon: UserIcon }
];

export default function BottomNav() {
  const location = useLocation();

  return (
    <nav className="pointer-events-none fixed inset-x-0 bottom-0 z-20 px-4 pb-[calc(0.65rem+env(safe-area-inset-bottom))]">
      <div className="pointer-events-auto mx-auto grid h-[72px] max-w-[430px] grid-cols-4 gap-1 rounded-[22px] border border-white/10 bg-[#111411]/95 p-2 shadow-[0_14px_40px_rgba(0,0,0,0.52)] backdrop-blur-xl">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => {
                const active = isActive
                  || (item.to === '/' && location.pathname === '/music')
                  || (item.to === '/workout-log' && location.pathname.startsWith('/workout-history'))
                  || (item.to === '/data-management' && (location.pathname === '/plan-builder' || location.pathname.startsWith('/templates/')));
                return [
                'flex min-h-14 flex-col items-center justify-center gap-1 rounded-[15px] px-2 py-1 text-xs font-bold transition duration-200 active:scale-[0.98] focus:outline-none focus:ring-2',
                active
                  ? 'bg-lime-300/10 text-lime-300 focus:ring-lime-300/70'
                  : 'text-zinc-500 hover:bg-white/5 hover:text-zinc-200 focus:ring-white/30'
                ].join(' ');
              }}
            >
              <Icon className="h-5 w-5" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
