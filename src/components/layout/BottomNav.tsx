import { NavLink } from 'react-router-dom';

const navItems = [
  { to: '/', label: '首页' },
  { to: '/muscle-map', label: '肌群地图' },
  { to: '/exercises', label: '动作库' },
  { to: '/plan-builder', label: '计划' },
  { to: '/workout-log', label: '记录' }
];

export default function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-base/95 px-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-2 backdrop-blur">
      <div className="mx-auto grid max-w-3xl grid-cols-5 gap-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              [
                'rounded-md px-2 py-2 text-center text-xs font-medium transition',
                isActive ? 'bg-accent text-slate-950' : 'text-slate-300 hover:bg-slate-800'
              ].join(' ')
            }
          >
            {item.label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
