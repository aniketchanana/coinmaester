import Link from 'next/link';
import { Heart } from 'lucide-react';

import { Button } from '@repo/ui/button';

import type { SessionUser } from '../../lib/auth';
import { SPONSOR_MAILTO } from '../../lib/creator';
import { ThemeToggle } from '../theme-toggle';
import { UserNav } from '../user-nav';

type HomeHeaderProps = {
  user: SessionUser | null;
};

export function HomeHeader({ user }: HomeHeaderProps) {
  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-12 w-full max-w-5xl items-center justify-between gap-2 px-3 sm:h-14 sm:gap-4 sm:px-6">
        <Link
          href="/"
          className="shrink-0 text-base font-semibold tracking-tight transition-opacity hover:opacity-80 sm:text-lg"
        >
          Coinmaester
        </Link>
        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="hidden px-2 sm:inline-flex sm:px-3"
          >
            <a
              href={SPONSOR_MAILTO}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Heart className="size-4" />
              Sponsor
            </a>
          </Button>
          <div className="hidden sm:block">
            <ThemeToggle />
          </div>
          {user ? (
            <>
              <Button asChild size="sm">
                <Link href="/transactions">
                  <span className="sm:hidden">App</span>
                  <span className="hidden sm:inline">Open app</span>
                </Link>
              </Button>
              <UserNav name={user.name ?? undefined} email={user.email} />
            </>
          ) : (
            <Button asChild size="sm">
              <a href="/api/auth/google">
                <span className="sm:hidden">Sign in</span>
                <span className="hidden sm:inline">Sign in with Google</span>
              </a>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
