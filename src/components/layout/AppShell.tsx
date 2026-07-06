import type { ReactNode } from 'react';
import BottomNav from './BottomNav';

interface AppShellProps {
  children: ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-[#F6F8FC] text-app-text">
      <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-4 pb-[calc(6.75rem+env(safe-area-inset-bottom))] pt-5 sm:px-6">
        <main className="flex-1">{children}</main>
      </div>
      <BottomNav />
    </div>
  );
}
