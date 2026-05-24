import type { ReactNode } from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from './router';

interface ProvidersProps {
  children?: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  if (children) return <>{children}</>;
  return <RouterProvider router={router} />;
}
