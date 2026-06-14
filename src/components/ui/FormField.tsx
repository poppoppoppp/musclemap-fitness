import type { ReactNode } from 'react';

interface FormFieldProps {
  children: ReactNode;
  label: ReactNode;
  description?: ReactNode;
  error?: ReactNode;
  className?: string;
}

export default function FormField({ children, label, description, error, className = '' }: FormFieldProps) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-2 block text-sm font-medium text-app-muted">{label}</span>
      {children}
      {description ? <span className="mt-1 block text-xs leading-5 text-app-subtle">{description}</span> : null}
      {error ? <span className="mt-1 block text-xs leading-5 text-app-danger">{error}</span> : null}
    </label>
  );
}
