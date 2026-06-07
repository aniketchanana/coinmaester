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
    <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-md">
      <div className="container mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <span className="text-lg font-semibold tracking-tight">
          Finance App
        </span>
        <div className="flex items-center gap-2">
          <SyncStatus />
          <ThemeToggle />
          <UserNav name={name} email={email} image={image} />
        </div>
      </div>
    </header>
  );
}
