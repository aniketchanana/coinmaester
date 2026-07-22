import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Boxes,
  Code2,
  Cpu,
  GitPullRequest,
  Github,
  LineChart,
  Mail,
  Server,
} from 'lucide-react';
import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';

import { Button } from '@repo/ui/button';
import { cn } from '@repo/ui/lib/utils';

import type { SessionUser } from '../../lib/auth';
import { REVEAL_UP_CLASS, staggerDelay } from '../../lib/motion';
import { SetupCommands } from './setup-commands';

const REPO_URL = 'https://github.com/aniketchanana/coinmaester';

const DOC_LINKS: {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
}[] = [
  {
    title: 'Architecture',
    description: 'Email → LLM → Postgres pipeline and app layout',
    href: `${REPO_URL}/blob/main/docs/architecture.md`,
    icon: Boxes,
  },
  {
    title: 'Self-hosting',
    description: 'Docker web/API, host worker, OAuth, and ports',
    href: `${REPO_URL}/blob/main/docs/self-hosting.md`,
    icon: Server,
  },
  {
    title: 'Local development',
    description: 'Day-to-day setup with pnpm docker:dev and pnpm dev',
    href: `${REPO_URL}/blob/main/docs/development.md`,
    icon: Code2,
  },
  {
    title: 'Contributing',
    description: 'PR workflow, conventions, and checks before you open a PR',
    href: `${REPO_URL}/blob/main/CONTRIBUTING.md`,
    icon: GitPullRequest,
  },
];

const STEPS: {
  title: string;
  description: string;
  icon: LucideIcon;
}[] = [
  {
    title: 'Sync Gmail',
    description:
      'Connect Google and pull transaction emails. Message bodies stay on disk; only paths live in the database.',
    icon: Mail,
  },
  {
    title: 'Classify locally',
    description:
      'A host-run Hugging Face model labels messages and extracts amounts, merchants, and types — nothing leaves your machine for inference.',
    icon: Cpu,
  },
  {
    title: 'Explore spending',
    description:
      'Browse transactions, analytics, and email sync status in the web UI once processing finishes.',
    icon: LineChart,
  },
];

const PIPELINE = [
  { label: 'Gmail', icon: Mail },
  { label: 'Local LLM', icon: Cpu },
  { label: 'Spending', icon: LineChart },
] as const;

type HomeContentProps = {
  user: SessionUser | null;
};

export function HomeContent({ user }: HomeContentProps) {
  return (
    <>
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,hsl(var(--muted))_0%,transparent_55%)]"
        />
        <div className="mx-auto grid w-full max-w-5xl items-center gap-10 px-4 py-10 sm:px-6 sm:py-14 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:gap-12">
          <div
            className={cn(REVEAL_UP_CLASS, 'duration-500')}
            style={staggerDelay(0)}
          >
            <p className="inline-flex items-center gap-2 text-sm font-medium tracking-wide text-muted-foreground">
              <Github className="size-3.5" />
              Open source · Self-hosted
            </p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl sm:leading-[1.1]">
              Coinmaester
            </h1>
            <p className="mt-4 max-w-xl text-base text-muted-foreground sm:text-lg">
              Personal finance tracking from Gmail transaction emails. Sync your
              inbox, classify with a local model, and explore spending in a
              simple web UI.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              {user ? (
                <Button asChild size="lg">
                  <Link href="/transactions">Open app</Link>
                </Button>
              ) : (
                <Button asChild size="lg">
                  <a href="/api/auth/google">Sign in with Google</a>
                </Button>
              )}
              <Button asChild variant="outline" size="lg">
                <a href={REPO_URL} target="_blank" rel="noopener noreferrer">
                  <Github className="size-4" />
                  View on GitHub
                </a>
              </Button>
            </div>
          </div>

          <div
            aria-hidden
            className={cn(REVEAL_UP_CLASS, 'duration-500')}
            style={staggerDelay(2)}
          >
            <div className="border-2 border-border bg-card p-4 shadow-(--shadow-surface) sm:p-5">
              <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                Pipeline
              </p>
              <div className="mt-4 flex flex-col gap-3">
                {PIPELINE.map((stage, index) => {
                  const Icon = stage.icon;
                  return (
                    <div key={stage.label} className="flex flex-col gap-3">
                      <div className="flex items-center gap-3 border-2 border-border bg-background px-3 py-2.5 shadow-(--shadow-surface-sm)">
                        <span className="flex size-9 shrink-0 items-center justify-center border-2 border-border bg-secondary">
                          <Icon className="size-4" />
                        </span>
                        <span className="text-sm font-medium tracking-tight">
                          {stage.label}
                        </span>
                        <span className="ml-auto font-mono text-xs text-muted-foreground">
                          {String(index + 1).padStart(2, '0')}
                        </span>
                      </div>
                      {index < PIPELINE.length - 1 ? (
                        <div className="flex justify-center text-muted-foreground">
                          <ArrowRight className="size-4 rotate-90" />
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        id="how-it-works"
        className="border-t-2 border-border"
        aria-labelledby="how-it-works-heading"
      >
        <div className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6 sm:py-14">
          <div
            className={cn(REVEAL_UP_CLASS, 'duration-500')}
            style={staggerDelay(0)}
          >
            <h2
              id="how-it-works-heading"
              className="text-2xl font-semibold tracking-tight sm:text-3xl"
            >
              How it works
            </h2>
            <p className="mt-2 max-w-2xl text-muted-foreground">
              Gmail in, structured transactions out — with the LLM worker
              running on your host, not in Docker.
            </p>
          </div>
          <ol className="mt-8 grid gap-6 sm:grid-cols-3 sm:gap-5">
            {STEPS.map((step, index) => {
              const Icon = step.icon;
              return (
                <li
                  key={step.title}
                  className={cn(
                    REVEAL_UP_CLASS,
                    'duration-500 border-2 border-border bg-card p-4 shadow-(--shadow-surface-sm)',
                  )}
                  style={staggerDelay(index + 1)}
                >
                  <div className="flex items-center gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center border-2 border-border bg-secondary">
                      <Icon className="size-5" />
                    </span>
                    <div>
                      <p className="font-mono text-xs text-muted-foreground">
                        {String(index + 1).padStart(2, '0')}
                      </p>
                      <h3 className="text-base font-medium tracking-tight">
                        {step.title}
                      </h3>
                    </div>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                    {step.description}
                  </p>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      <section
        id="setup"
        className="border-t-2 border-border bg-muted/40"
        aria-labelledby="setup-heading"
      >
        <div className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6 sm:py-14">
          <div
            className={cn(REVEAL_UP_CLASS, 'duration-500')}
            style={staggerDelay(0)}
          >
            <div className="flex items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center border-2 border-border bg-card shadow-(--shadow-surface-sm)">
                <Server className="size-5" />
              </span>
              <div>
                <h2
                  id="setup-heading"
                  className="text-2xl font-semibold tracking-tight sm:text-3xl"
                >
                  Self-host in minutes
                </h2>
                <p className="mt-1 max-w-2xl text-muted-foreground">
                  Run web and API in Docker; keep the Hugging Face worker on the
                  host so it can use your CPU (or GPU).
                </p>
              </div>
            </div>
          </div>
          <div
            className={cn(REVEAL_UP_CLASS, 'duration-500 mt-6')}
            style={staggerDelay(2)}
          >
            <SetupCommands />
          </div>
          <p
            className={cn(
              REVEAL_UP_CLASS,
              'duration-500 mt-4 text-sm text-muted-foreground',
            )}
            style={staggerDelay(3)}
          >
            Full OAuth URIs, ports, and networking notes live in the{' '}
            <a
              href={`${REPO_URL}/blob/main/docs/self-hosting.md`}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-4 hover:text-foreground"
            >
              self-hosting guide
            </a>
            .
          </p>
        </div>
      </section>

      <section
        id="docs"
        className="border-t-2 border-border"
        aria-labelledby="docs-heading"
      >
        <div className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6 sm:py-14">
          <div
            className={cn(REVEAL_UP_CLASS, 'duration-500')}
            style={staggerDelay(0)}
          >
            <div className="flex items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center border-2 border-border bg-secondary">
                <BookOpen className="size-5" />
              </span>
              <div>
                <h2
                  id="docs-heading"
                  className="text-2xl font-semibold tracking-tight sm:text-3xl"
                >
                  Docs and links
                </h2>
                <p className="mt-1 max-w-2xl text-muted-foreground">
                  Everything you need to understand, run, and contribute to the
                  project.
                </p>
              </div>
            </div>
          </div>
          <ul className="mt-8 grid gap-4 sm:grid-cols-2">
            {DOC_LINKS.map((link, index) => {
              const Icon = link.icon;
              return (
                <li
                  key={link.title}
                  className={cn(REVEAL_UP_CLASS, 'duration-500')}
                  style={staggerDelay(index + 1)}
                >
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex h-full items-start gap-3 border-2 border-border bg-card p-4 shadow-(--shadow-surface-sm) transition-transform hover:-translate-y-0.5 hover:shadow-(--shadow-surface)"
                  >
                    <span className="flex size-10 shrink-0 items-center justify-center border-2 border-border bg-secondary">
                      <Icon className="size-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="inline-flex items-center gap-1.5 text-base font-medium tracking-tight">
                        {link.title}
                        <ArrowUpRight className="size-4 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                      </span>
                      <span className="mt-1 block text-sm text-muted-foreground">
                        {link.description}
                      </span>
                    </span>
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      <footer className="border-t-2 border-border">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-3 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>Coinmaester is open source. Self-host your own finance tracker.</p>
          <a
            href={REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 underline-offset-4 hover:text-foreground hover:underline"
          >
            <Github className="size-4" />
            github.com/aniketchanana/coinmaester
          </a>
        </div>
      </footer>
    </>
  );
}
