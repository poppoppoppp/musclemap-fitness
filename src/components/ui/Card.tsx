import type { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
}

export default function Card({ children, className = '' }: CardProps) {
  return (
    <section
      className={`rounded-[24px] border border-white/[0.08] bg-[linear-gradient(180deg,#1f1f22_0%,#19191b_100%)] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] ${className}`}
    >
      {children}
    </section>
  );
}
