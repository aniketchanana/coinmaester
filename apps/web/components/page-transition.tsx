'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';

import { cn } from '@repo/ui/lib/utils';

const ROUTE_ORDER = ['/transactions', '/email-sync'] as const;

function getPageEnterClass(previousPath: string | null, currentPath: string) {
  if (!previousPath || previousPath === currentPath) {
    return 'animate-in fade-in-0 slide-in-from-bottom-2 duration-500 fill-mode-both';
  }

  const previousIndex = ROUTE_ORDER.indexOf(
    previousPath as (typeof ROUTE_ORDER)[number],
  );
  const currentIndex = ROUTE_ORDER.indexOf(
    currentPath as (typeof ROUTE_ORDER)[number],
  );

  if (previousIndex === -1 || currentIndex === -1) {
    return 'animate-in fade-in-0 slide-in-from-bottom-2 duration-500 fill-mode-both';
  }

  if (currentIndex > previousIndex) {
    return 'animate-in fade-in-0 slide-in-from-right-4 duration-400 fill-mode-both';
  }

  return 'animate-in fade-in-0 slide-in-from-left-4 duration-400 fill-mode-both';
}

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const previousPathRef = useRef<string | null>(null);
  const enterClass = getPageEnterClass(previousPathRef.current, pathname);

  useEffect(() => {
    previousPathRef.current = pathname;
  }, [pathname]);

  return (
    <div
      key={pathname}
      className={cn(enterClass, 'motion-reduce:animate-none')}
    >
      {children}
    </div>
  );
}
