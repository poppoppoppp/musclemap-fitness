import type { ReactNode } from 'react';

interface BadgeProps {
  children: ReactNode;
  className?: string;
  tone?: 'neutral' | 'accent' | 'success' | 'warning' | 'danger';
}

const tones = {
  neutral: 'bg-app-surfaceMuted text-app-muted',
  accent: 'bg-app-accentSoft text-app-accent',
  success: 'bg-app-successSoft text-app-success',
  warning: 'bg-app-warningSoft text-app-warning',
  danger: 'bg-red-50 text-app-danger'
};

export default function Badge({ children, className = '', tone = 'neutral' }: BadgeProps) {
  return (
    <span className={`inline-flex min-h-7 items-center rounded-full px-3 py-1 text-xs font-semibold ${tones[tone]} ${className}`}>
      {children}
    </span>
  );
}
