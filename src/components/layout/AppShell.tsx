import type { ReactNode } from 'react';
import BottomNav from './BottomNav';

interface AppShellProps {
  children: ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-base text-slate-100">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-5 sm:px-6 lg:px-8">
        <main className="flex-1">{children}</main>
      </div>
      <BottomNav />
    </div>
  );
}
