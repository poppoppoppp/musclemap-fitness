import type { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
}

export default function Card({ children, className = '' }: CardProps) {
  return <section className={`rounded-[18px] border border-white/10 bg-[#1d1d1f] p-5 shadow-none ${className}`}>{children}</section>;
}
