import type { ReactNode } from 'react';
import BottomNav from './BottomNav';

interface AppShellProps {
  children: ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-base text-[#f5f5f7]">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-5 sm:px-6 lg:px-8">
        <main className="flex-1">{children}</main>
        <footer className="mt-8 border-t border-white/10 pt-4 text-xs leading-5 text-[#86868b]">
          3D anatomy model data: BodyParts3D, (c) The Database Center for Life Science, licensed under CC BY 4.0.
        </footer>
      </div>
      <BottomNav />
    </div>
  );
}
