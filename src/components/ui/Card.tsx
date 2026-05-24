import type { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
}

export default function Card({ children, className = '' }: CardProps) {
  return <section className={`rounded-lg border border-line bg-panel p-4 shadow-lg shadow-black/20 ${className}`}>{children}</section>;
}
