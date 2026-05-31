import { AppHeader } from '../../components/app-header';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-muted/30">
      <AppHeader />
      <main className="container mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
