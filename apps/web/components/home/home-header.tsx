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
      <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link
          href="/"
          className="text-lg font-semibold tracking-tight transition-opacity hover:opacity-80"
        >
          Coinmaester
        </Link>
        <div className="flex shrink-0 items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <a
              href={SPONSOR_MAILTO}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Heart className="size-4" />
              Sponsor
            </a>
          </Button>
          <ThemeToggle />
          {user ? (
            <>
              <Button asChild variant="outline" size="sm">
                <Link href="/transactions">Open app</Link>
              </Button>
              <UserNav name={user.name ?? undefined} email={user.email} />
            </>
          ) : (
            <Button asChild size="sm">
              <a href="/api/auth/google">Sign in with Google</a>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
