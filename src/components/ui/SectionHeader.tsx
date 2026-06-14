import type { ReactNode } from 'react';

interface SectionHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export default function SectionHeader({ title, description, action, className = '' }: SectionHeaderProps) {
  return (
    <div className={`flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between ${className}`}>
      <div className="min-w-0">
        <h2 className="break-words text-lg font-semibold text-app-text">{title}</h2>
        {description ? <p className="mt-1 text-sm leading-6 text-app-muted">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
