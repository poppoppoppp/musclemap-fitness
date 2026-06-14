import type { ReactNode } from 'react';

interface PanelProps {
  children: ReactNode;
  className?: string;
}

export default function Panel({ children, className = '' }: PanelProps) {
  return <section className={`rounded-2xl border border-app-line bg-app-surface p-5 ${className}`}>{children}</section>;
}
