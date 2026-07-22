import type { Metadata } from 'next';

import { HomeContent } from '../components/home/home-content';
import { HomeHeader } from '../components/home/home-header';
import { getCurrentUser } from '../lib/auth';

export const metadata: Metadata = {
  title: {
    absolute: 'Coinmaester — AI-powered finance from email',
  },
  description:
    'Open-source AI-powered finance tracker for transaction emails. Sync your inbox, classify with a local model, and explore spending in a web UI.',
  openGraph: {
    title: 'Coinmaester — AI-powered finance from email',
    description:
      'Local AI classifies transaction emails and extracts spending details. Open source and self-hosted.',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'Coinmaester — AI-powered finance from email',
    description:
      'Open-source AI-powered finance tracker for transaction emails.',
  },
};

export default async function HomePage() {
  const user = await getCurrentUser();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <HomeHeader user={user} />
      <main>
        <HomeContent user={user} />
      </main>
    </div>
  );
}
