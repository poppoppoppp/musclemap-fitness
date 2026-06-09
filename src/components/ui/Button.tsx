import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost';
}

const variants = {
  primary: 'bg-accent text-white hover:bg-[#147ce5] active:bg-[#006edb] disabled:bg-[#1d1d1f] disabled:text-[#86868b]',
  secondary: 'bg-[#2c2c2e] text-[#f5f5f7] hover:bg-[#3a3a3c] active:bg-[#48484a]',
  ghost: 'bg-transparent text-[#f5f5f7] hover:bg-white/[0.08] active:bg-white/[0.12]'
};

export default function Button({ children, className = '', variant = 'primary', ...props }: ButtonProps) {
  return (
    <button
      className={`rounded-full px-5 py-2 text-sm font-semibold transition duration-200 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-black disabled:cursor-not-allowed ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
