import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost';
}

const variants = {
  primary: 'bg-[#0a84ff] text-white hover:bg-[#2997ff] active:bg-[#0071e3] disabled:bg-[#1d1d1f] disabled:text-[#86868b]',
  secondary: 'border border-white/[0.08] bg-[#2c2c2e] text-[#f5f5f7] hover:bg-[#3a3a3c] active:bg-[#48484a]',
  ghost: 'bg-transparent text-[#f5f5f7] hover:bg-white/[0.08] active:bg-white/[0.12]'
};

export default function Button({ children, className = '', variant = 'primary', ...props }: ButtonProps) {
  return (
    <button
      className={`rounded-full px-5 py-2 text-sm font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] transition duration-200 active:scale-[0.985] focus:outline-none focus:ring-2 focus:ring-[#0a84ff] focus:ring-offset-2 focus:ring-offset-black disabled:cursor-not-allowed disabled:shadow-none ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
