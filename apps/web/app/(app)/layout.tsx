import { redirect } from 'next/navigation';

import { AppHeader } from '../../components/app-header';
import { getCurrentUser } from '../../lib/auth';

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <AppHeader name={user.name ?? undefined} email={user.email} />
      <main className="container mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
