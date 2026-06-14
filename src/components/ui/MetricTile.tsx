import type { ReactNode } from 'react';

interface MetricTileProps {
  label: ReactNode;
  value: ReactNode;
  className?: string;
  testId?: string;
  tone?: 'neutral' | 'accent' | 'success' | 'warning';
}

const tones = {
  neutral: 'bg-app-surfaceMuted text-app-text',
  accent: 'bg-app-accentSoft text-app-accent',
  success: 'bg-app-successSoft text-app-success',
  warning: 'bg-app-warningSoft text-app-warning'
};

export default function MetricTile({ label, value, className = '', testId, tone = 'neutral' }: MetricTileProps) {
  return (
    <div className={`rounded-2xl border border-app-line p-4 ${tones[tone]} ${className}`}>
      <p className="text-sm font-medium text-app-muted">{label}</p>
      <p data-testid={testId} className="mt-2 break-words text-2xl font-semibold leading-tight">
        {value}
      </p>
    </div>
  );
}
