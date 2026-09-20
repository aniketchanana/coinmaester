'use client';

import { useQuery } from '@tanstack/react-query';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@repo/ui/dialog';

import { ApiError } from '../lib/api-client';
import { emailBodyKeys, fetchEmailBody } from '../lib/email-body';

/**
 * Neither `allow-scripts` nor `allow-same-origin`: the email runs in an opaque
 * origin with scripts and form submissions inert, so it cannot read our cookies,
 * storage, or DOM. Popups are permitted so links can still open in a new tab.
 */
const EMAIL_SANDBOX = 'allow-popups allow-popups-to-escape-sandbox';

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
              ? `${data.from}${data.receivedAt ? ` · ${formatReceivedAt(data.receivedAt)}` : ''}`
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
        ) : data?.html ? (
          <iframe
            title="Source email"
            srcDoc={data.html}
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
