'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { Toaster } from 'sonner';

import { TooltipProvider } from '@repo/ui/tooltip';

import { IncognitoProvider } from './incognito-provider';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5_000,
            retry: 1,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <IncognitoProvider>
        <TooltipProvider>{children}</TooltipProvider>
      </IncognitoProvider>
      <Toaster
        richColors
        closeButton
        position="top-right"
        toastOptions={{
          classNames: {
            toast:
              'animate-in slide-in-from-right-full fade-in-0 duration-300 motion-reduce:animate-none',
            closeButton: 'transition-opacity duration-200',
          },
        }}
      />
    </QueryClientProvider>
  );
}
