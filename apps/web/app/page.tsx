import type { Metadata } from 'next';

import { HomeContent } from '../components/home/home-content';
import { HomeHeader } from '../components/home/home-header';
import { getCurrentUser } from '../lib/auth';

export const metadata: Metadata = {
  title: {
    absolute: 'Coinmaester — Personal finance from Gmail',
  },
  description:
    'Open-source personal finance tracking from Gmail transaction emails. Sync inbox messages, classify them with a local Hugging Face model, and explore spending in a web UI.',
  openGraph: {
    title: 'Coinmaester — Personal finance from Gmail',
    description:
      'Sync Gmail, classify locally with Hugging Face, and explore spending. Open source and self-hosted.',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'Coinmaester — Personal finance from Gmail',
    description:
      'Open-source personal finance tracking from Gmail transaction emails.',
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
