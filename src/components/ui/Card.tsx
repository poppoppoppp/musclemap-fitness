import type { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  variant?: 'default' | 'muted' | 'interactive' | 'dashed';
  padding?: 'sm' | 'md' | 'lg';
}

const variants = {
  default: 'border-app-line bg-app-surface',
  muted: 'border-app-line bg-app-surfaceMuted',
  interactive: 'border-app-line bg-app-surface transition duration-200 hover:border-app-accent/40 hover:bg-app-surfaceMuted active:scale-[0.99]',
  dashed: 'border-dashed border-app-line bg-app-surfaceMuted'
};

const paddings = {
  sm: 'p-3',
  md: 'p-5',
  lg: 'p-6'
};

export default function Card({ children, className = '', variant = 'default', padding = 'md' }: CardProps) {
  return (
    <section
      className={`rounded-2xl border ${variants[variant]} ${paddings[padding]} ${className}`}
    >
      {children}
    </section>
  );
}
