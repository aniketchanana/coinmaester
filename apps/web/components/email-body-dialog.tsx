'use client';

import { useQuery } from '@tanstack/react-query';
import * as React from 'react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@repo/ui/dialog';

import { ApiError } from '../lib/api-client';
import { emailBodyKeys, fetchEmailBody } from '../lib/email-body';
import type { EmailBody } from '../types/email-body';

/**
 * Email markup is untrusted third-party content. `default-src 'none'` keeps the
 * document from reaching the network for anything but images; remote images stay
 * allowed so bank logos and receipts render. Drop `https:`/`http:` from `img-src`
 * if you would rather block sender tracking pixels.
 */
const EMAIL_CONTENT_SECURITY_POLICY = [
  "default-src 'none'",
  'img-src https: http: data:',
  "style-src 'unsafe-inline'",
  'font-src data:',
  "object-src 'none'",
  "form-action 'none'",
  "frame-src 'none'",
].join('; ');

/**
 * Neither `allow-scripts` nor `allow-same-origin`: the email runs in an opaque
 * origin with scripts and form submissions inert, so it cannot read our cookies,
 * storage, or DOM. Popups are permitted so links can still open in a new tab.
 */
const EMAIL_SANDBOX = 'allow-popups allow-popups-to-escape-sandbox';

const EMAIL_BASE_STYLES = `
  html { color-scheme: light; }
  body {
    margin: 0;
    padding: 16px;
    background: #ffffff;
    color: #111827;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    font-size: 14px;
    overflow-wrap: break-word;
  }
  img { max-width: 100%; height: auto; }
  table { max-width: 100%; }
  pre {
    margin: 0;
    white-space: pre-wrap;
    overflow-wrap: break-word;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 13px;
  }
`;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildEmailDocument(email: EmailBody): string {
  const content = email.isHtml
    ? email.body
    : `<pre>${escapeHtml(email.body)}</pre>`;

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta http-equiv="Content-Security-Policy" content="${EMAIL_CONTENT_SECURITY_POLICY}" />
    <base target="_blank" />
    <style>${EMAIL_BASE_STYLES}</style>
  </head>
  <body>${content}</body>
</html>`;
}

function formatReceivedAt(isoDate: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(isoDate));
}

interface EmailBodyDialogProps {
  gmailMessageId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EmailBodyDialog({
  gmailMessageId,
  open,
  onOpenChange,
}: EmailBodyDialogProps) {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: emailBodyKeys.detail(gmailMessageId ?? ''),
    queryFn: () => fetchEmailBody(gmailMessageId!),
    enabled: open && gmailMessageId !== null,
    retry: false,
    staleTime: Infinity,
  });

  const emailDocument = React.useMemo(
    () => (data ? buildEmailDocument(data) : null),
    [data],
  );

  const errorMessage =
    error instanceof ApiError && error.status === 404
      ? 'This email is no longer stored on disk.'
      : ((error as Error | null)?.message ?? 'Failed to load the email');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl overflow-hidden">
        <DialogHeader className="min-w-0 pr-8">
          <DialogTitle className="text-left leading-snug wrap-break-word">
            {data?.subject || 'Source email'}
          </DialogTitle>
          <DialogDescription className="text-left wrap-break-word">
            {data
              ? `${data.from} · ${formatReceivedAt(data.receivedAt)}`
              : 'The original email stored during sync.'}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="h-[70vh] animate-pulse rounded-md border bg-muted" />
        ) : isError ? (
          <div className="flex h-[70vh] items-center justify-center rounded-md border">
            <p className="px-6 text-center text-sm text-muted-foreground">
              {errorMessage}
            </p>
          </div>
        ) : emailDocument ? (
          <iframe
            key={data?.gmailMessageId}
            title="Source email"
            srcDoc={emailDocument}
            sandbox={EMAIL_SANDBOX}
            referrerPolicy="no-referrer"
            loading="lazy"
            className="h-[70vh] w-full rounded-md border bg-white"
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
