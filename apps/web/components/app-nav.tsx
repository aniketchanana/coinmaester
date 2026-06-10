'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { cn } from '@repo/ui/lib/utils';

const NAV_ITEMS = [
  { href: '/transactions', label: 'Transactions' },
  { href: '/analytics', label: 'Analytics' },
  { href: '/email-sync', label: 'Email Sync Status' },
] as const;

type IndicatorStyle = {
  left: number;
  width: number;
  opacity: number;
};

export function AppNav() {
  const pathname = usePathname();
  const navRef = useRef<HTMLElement>(null);
  const [indicator, setIndicator] = useState<IndicatorStyle>({
    left: 0,
    width: 0,
    opacity: 0,
  });

  useEffect(() => {
    const activeLink = navRef.current?.querySelector(
      '[data-active="true"]',
    ) as HTMLElement | null;

    if (!activeLink || !navRef.current) {
      return;
    }

    const navRect = navRef.current.getBoundingClientRect();
    const linkRect = activeLink.getBoundingClientRect();

    setIndicator({
      left: linkRect.left - navRect.left,
      width: linkRect.width,
      opacity: 1,
    });
  }, [pathname]);

  return (
    <nav ref={navRef} className="relative flex items-center gap-1">
      <span
        aria-hidden
        className="pointer-events-none absolute bottom-0 top-0 rounded-md bg-muted transition-all duration-300 ease-out motion-reduce:transition-none"
        style={{
          left: indicator.left,
          width: indicator.width,
          opacity: indicator.opacity,
        }}
      />
      {NAV_ITEMS.map((item) => {
        const isActive =
          pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Link
            key={item.href}
            href={item.href}
            data-active={isActive}
            className={cn(
              'relative z-10 rounded-md px-3 py-2 text-sm font-medium transition-colors duration-200 motion-reduce:transition-none',
              isActive
                ? 'text-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
