import type { ReactNode } from 'react';

interface NoticeProps {
  children: ReactNode;
  className?: string;
  tone?: 'info' | 'success' | 'warning' | 'danger' | 'neutral';
}

const tones = {
  info: 'border-app-accent/20 bg-app-accentSoft text-app-accent',
  success: 'border-app-success/20 bg-app-successSoft text-app-success',
  warning: 'border-app-warning/25 bg-app-warningSoft text-app-warning',
  danger: 'border-app-danger/20 bg-red-50 text-app-danger',
  neutral: 'border-app-line bg-app-surfaceMuted text-app-muted'
};

export default function Notice({ children, className = '', tone = 'neutral' }: NoticeProps) {
  return <div className={`rounded-2xl border px-4 py-3 text-sm leading-6 ${tones[tone]} ${className}`}>{children}</div>;
}
