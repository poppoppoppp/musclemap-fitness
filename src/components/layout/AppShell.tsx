import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { MusicPlayerProvider } from '../../features/music/MusicPlayerContext';
import BottomNav from './BottomNav';

interface AppShellProps {
  children: ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const location = useLocation();
  const exerciseDetail = /^\/exercises\/[^/]+$/.test(location.pathname);
  const postureCaptureLab = location.pathname === '/growth/posture/capture-lab';
  const darkShell = exerciseDetail || location.pathname === '/' || location.pathname === '/music' || location.pathname.startsWith('/growth') || location.pathname === '/workout-log' || location.pathname.startsWith('/workout-history') || location.pathname === '/data-management' || location.pathname === '/plan-builder' || location.pathname.startsWith('/templates/');

  return (
    <MusicPlayerProvider>
      <div className={`min-h-screen ${darkShell ? 'bg-[#080a08]' : 'bg-[#F6F8FC]'} text-app-text`}>
        <div
          className={`mx-auto flex min-h-screen w-full flex-col ${postureCaptureLab ? 'max-w-none p-0' : `max-w-3xl px-4 sm:px-6 ${exerciseDetail ? 'pb-0 pt-5' : 'pb-[calc(6.75rem+env(safe-area-inset-bottom))] pt-5'}`}`}
          data-testid="app-shell-content"
          data-capture-route={postureCaptureLab ? 'true' : undefined}
        >
          <main className="flex-1">{children}</main>
        </div>
        {exerciseDetail || postureCaptureLab ? null : <BottomNav />}
      </div>
    </MusicPlayerProvider>
  );
}
