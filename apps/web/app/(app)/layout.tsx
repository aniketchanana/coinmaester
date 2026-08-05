import { redirect } from 'next/navigation';

import { AppHeader } from '../../components/app-header';
import { PageTransition } from '../../components/page-transition';
import { getCurrentUser } from '../../lib/auth';

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/');
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <AppHeader name={user.name ?? undefined} email={user.email} />
      <main className="w-full px-2 py-2 sm:px-3 sm:py-3">
        <PageTransition>{children}</PageTransition>
      </main>
    </div>
  );
}
