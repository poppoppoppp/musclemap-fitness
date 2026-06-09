import { NavLink } from 'react-router-dom';

const navItems = [
  { to: '/', label: '首页', icon: HomeIcon },
  { to: '/plan-builder', label: '计划', icon: OrbitIcon },
  { to: '/workout-log', label: '训练', icon: BarsIcon },
  { to: '/data-management', label: '我的', icon: UserIcon }
];

export default function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-white/10 bg-black/80 px-3 pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-2 backdrop-blur-2xl">
      <div className="mx-auto grid max-w-3xl grid-cols-4 gap-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                [
                  'flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl px-2 py-1 text-xs font-semibold transition duration-200',
                  isActive ? 'bg-white/[0.08] text-[#2997ff]' : 'text-[#86868b] hover:bg-white/[0.05] hover:text-[#f5f5f7]'
                ].join(' ')
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className="h-7 w-7" />
                  <span>{item.label}</span>
                </>
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}

function HomeIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M3 11.4 12 4l9 7.4v8.1a1.5 1.5 0 0 1-1.5 1.5H15v-6H9v6H4.5A1.5 1.5 0 0 1 3 19.5v-8.1Z" />
    </svg>
  );
}

function OrbitIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M19 5c2.3 2.3.5 7.9-4 12.4s-10.1 6.3-12.4 4 .5-7.9 4-12.4S16.7 2.7 19 5Z" stroke="currentColor" strokeWidth="2.2" />
      <path d="M5 5c-2.3 2.3-.5 7.9 4 12.4s10.1 6.3 12.4 4-.5-7.9-4-12.4S7.3 2.7 5 5Z" stroke="currentColor" strokeWidth="2.2" opacity=".7" />
      <circle cx="12" cy="12" r="2.3" fill="currentColor" />
    </svg>
  );
}

function BarsIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6 19V9M12 19V5M18 19v-7" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" />
    </svg>
  );
}

function UserIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 12a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9ZM4 21a8 8 0 0 1 16 0H4Z" />
    </svg>
  );
}
