import Link from 'next/link';

import { Button } from '@repo/ui/button';

import type { SessionUser } from '../../lib/auth';
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
