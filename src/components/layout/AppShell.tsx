import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { MusicPlayerProvider } from '../../features/music/MusicPlayerContext';
import BottomNav from './BottomNav';

interface AppShellProps {
  children: ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const location = useLocation();
  const darkShell = location.pathname === '/' || location.pathname === '/music' || location.pathname === '/growth' || location.pathname === '/workout-log' || location.pathname.startsWith('/workout-history') || location.pathname === '/data-management' || location.pathname === '/plan-builder' || location.pathname.startsWith('/templates/');

  return (
    <MusicPlayerProvider>
      <div className={`min-h-screen ${darkShell ? 'bg-[#080a08]' : 'bg-[#F6F8FC]'} text-app-text`}>
        <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-4 pb-[calc(6.75rem+env(safe-area-inset-bottom))] pt-5 sm:px-6">
          <main className="flex-1">{children}</main>
        </div>
        <BottomNav />
      </div>
    </MusicPlayerProvider>
  );
}
