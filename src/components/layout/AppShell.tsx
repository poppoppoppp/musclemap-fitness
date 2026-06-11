import type { ReactNode } from 'react';
import BottomNav from './BottomNav';

interface AppShellProps {
  children: ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-base text-[#f5f5f7]">
      <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-4 pb-[calc(6.75rem+env(safe-area-inset-bottom))] pt-5 sm:px-6 lg:px-8">
        <main className="flex-1">{children}</main>
        <footer className="mt-8 border-t border-white/[0.08] pt-4 text-xs leading-5 text-[#86868b]">
          MuscleMap Fitness 使用本地浏览器数据保存训练记录。肌群示意仅用于训练教育参考。
        </footer>
      </div>
      <BottomNav />
    </div>
  );
}
