'use client';

import { Check, Copy, Terminal } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { cn } from '@repo/ui/lib/utils';

type SetupCommand = {
  command: string;
  comment?: string;
};

const SETUP_COMMANDS: SetupCommand[] = [
  {
    command: 'cp .env.example .env',
    comment: 'Google OAuth + secrets',
  },
  {
    command: 'pnpm docker:prod',
    comment: 'Postgres, RabbitMQ, API, web',
  },
  {
    command: 'pnpm install',
  },
  {
    command: 'cd apps/python-worker && uv sync && cd ../..',
  },
  {
    command: 'pnpm worker',
    comment: 'required for classification',
  },
];

const ALL_COMMANDS = SETUP_COMMANDS.map((item) => item.command).join('\n');

async function copyText(text: string) {
  await navigator.clipboard.writeText(text);
}

export function SetupCommands() {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  async function handleCopy(text: string, key: string, label: string) {
    try {
      await copyText(text);
      setCopiedKey(key);
      toast.success(label);
      window.setTimeout(() => {
        setCopiedKey((current) => (current === key ? null : current));
      }, 1600);
    } catch {
      toast.error('Could not copy to clipboard');
    }
  }

  return (
    <div className="overflow-hidden rounded-md border-2 border-border bg-card text-card-foreground shadow-(--shadow-surface)">
      <div className="flex items-center justify-between gap-3 border-b-2 border-border bg-secondary px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex items-center gap-1.5" aria-hidden>
            <span className="size-2.5 rounded-full border border-border bg-background" />
            <span className="size-2.5 rounded-full border border-border bg-background" />
            <span className="size-2.5 rounded-full border border-border bg-background" />
          </div>
          <span className="inline-flex items-center gap-1.5 truncate font-mono text-xs text-muted-foreground">
            <Terminal className="size-3.5 shrink-0" />
            terminal — self-host
          </span>
        </div>
        <button
          type="button"
          onClick={() => handleCopy(ALL_COMMANDS, 'all', 'Copied all commands')}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-sm border-2 border-border bg-background px-2 py-1 font-mono text-xs text-foreground shadow-(--shadow-surface-sm) transition-colors hover:bg-accent"
        >
          {copiedKey === 'all' ? (
            <Check className="size-3.5 text-primary" />
          ) : (
            <Copy className="size-3.5" />
          )}
          Copy all
        </button>
      </div>

      <div className="space-y-0.5 p-2 font-mono text-sm leading-relaxed sm:p-3">
        {SETUP_COMMANDS.map((item, index) => {
          const key = `line-${index}`;
          const isCopied = copiedKey === key;

          return (
            <button
              key={key}
              type="button"
              onClick={() => handleCopy(item.command, key, 'Copied command')}
              className={cn(
                'group flex w-full items-start gap-2 rounded-sm px-2 py-1.5 text-left transition-colors',
                'hover:bg-muted focus-visible:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              )}
              title="Click to copy"
            >
              <span className="shrink-0 select-none font-semibold text-primary">
                $
              </span>
              <span className="min-w-0 flex-1 break-all text-foreground">
                {item.command}
                {item.comment ? (
                  <span className="text-muted-foreground">
                    {'  '}
                    <span className="opacity-70">#</span> {item.comment}
                  </span>
                ) : null}
              </span>
              <span className="mt-0.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                {isCopied ? (
                  <Check className="size-3.5 text-primary" />
                ) : (
                  <Copy className="size-3.5" />
                )}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
