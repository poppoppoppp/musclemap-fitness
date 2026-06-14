import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
}

const variants = {
  primary: 'bg-app-accent text-white hover:bg-app-accentHover active:bg-app-accentActive disabled:bg-app-surfaceMuted disabled:text-app-subtle',
  secondary: 'border border-app-line bg-app-surface text-app-text hover:bg-app-surfaceMuted active:bg-app-surfaceMuted',
  ghost: 'bg-transparent text-app-muted hover:bg-app-surfaceMuted active:bg-app-surfaceMuted',
  danger: 'bg-app-danger text-white hover:bg-red-700 active:bg-red-800 disabled:bg-app-surfaceMuted disabled:text-app-subtle',
  success: 'bg-app-success text-white hover:bg-green-700 active:bg-green-800 disabled:bg-app-surfaceMuted disabled:text-app-subtle'
};

const sizes = {
  sm: 'min-h-9 px-3 py-1.5 text-xs',
  md: 'min-h-11 px-5 py-2 text-sm',
  lg: 'min-h-12 px-6 py-3 text-base'
};

export default function Button({ children, className = '', variant = 'primary', size = 'md', fullWidth = false, ...props }: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center rounded-xl font-semibold transition duration-200 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-app-accent/30 focus:ring-offset-2 focus:ring-offset-app-bg disabled:cursor-not-allowed ${sizes[size]} ${fullWidth ? 'w-full' : ''} ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
