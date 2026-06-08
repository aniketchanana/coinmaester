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
      <main className="w-full px-3 py-3">{children}</main>
    </div>
  );
}
