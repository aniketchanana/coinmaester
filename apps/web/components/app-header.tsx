'use client';

import Link from 'next/link';
import { Menu } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@repo/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@repo/ui/sheet';

import { AppNav } from './app-nav';
import { IncognitoToggle } from './incognito-toggle';
import { SyncStatus } from './sync-status';
import { ThemeToggle } from './theme-toggle';
import { UserNav } from './user-nav';

type AppHeaderProps = {
  name?: string;
  email?: string;
  image?: string;
};

export function AppHeader({ name = 'User', email, image }: AppHeaderProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-md transition-[background-color,box-shadow,border-color] duration-300">
      <div className="flex h-12 w-full items-center gap-2 px-2 sm:px-3 md:h-14 md:gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-2 md:gap-5">
          <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-9 shrink-0 md:hidden"
                aria-label="Open navigation"
              >
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[min(100%,18rem)] p-4">
              <SheetHeader className="mb-3 text-left">
                <SheetTitle>
                  <Link
                    href="/"
                    className="text-lg font-semibold tracking-tight"
                    onClick={() => setMobileNavOpen(false)}
                  >
                    Coinmaester
                  </Link>
                </SheetTitle>
              </SheetHeader>
              <AppNav
                orientation="vertical"
                onNavigate={() => setMobileNavOpen(false)}
              />
              <div className="mt-6 space-y-4 border-t pt-4">
                <SyncStatus statusVisibility="always" showButton={false} />
                <div className="flex items-center gap-1">
                  <ThemeToggle />
                  <IncognitoToggle />
                </div>
              </div>
            </SheetContent>
          </Sheet>

          <Link
            href="/"
            className="shrink-0 text-base font-semibold tracking-tight transition-opacity hover:opacity-80"
          >
            Coinmaester
          </Link>
          <AppNav className="hidden min-w-0 md:flex" />
        </div>

        <div className="flex shrink-0 items-center gap-1 md:gap-1.5">
          <SyncStatus statusVisibility="never" />
          <div className="hidden items-center gap-0.5 md:flex">
            <ThemeToggle />
            <IncognitoToggle />
          </div>
          <UserNav name={name} email={email} image={image} />
        </div>
      </div>
    </header>
  );
}
