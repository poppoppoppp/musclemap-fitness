import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost';
}

const variants = {
  primary: 'bg-accent text-slate-950 hover:bg-cyan-300',
  secondary: 'bg-slate-800 text-white hover:bg-slate-700',
  ghost: 'bg-transparent text-slate-200 hover:bg-slate-800'
};

export default function Button({ children, className = '', variant = 'primary', ...props }: ButtonProps) {
  return (
    <button
      className={`rounded-md px-4 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-accent ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
