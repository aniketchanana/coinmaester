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

export function AppHeader({
  name = 'User',
  email,
  image,
}: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-md transition-[background-color,box-shadow,border-color] duration-300">
      <div className="flex h-16 w-full items-center justify-between gap-4 px-3">
        <div className="flex min-w-0 items-center gap-6">
          <span className="shrink-0 text-lg font-semibold tracking-tight">
            Finance App
          </span>
          <AppNav />
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <SyncStatus />
          <ThemeToggle />
          <IncognitoToggle />
          <UserNav name={name} email={email} image={image} />
        </div>
      </div>
    </header>
  );
}
