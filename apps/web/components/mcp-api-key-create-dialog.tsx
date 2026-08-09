'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Check, Copy } from 'lucide-react';
import * as React from 'react';
import { toast } from 'sonner';

import { Button } from '@repo/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@repo/ui/dialog';
import { Input } from '@repo/ui/input';
import { Label } from '@repo/ui/label';

import {
  createMcpApiKey,
  mcpApiKeyKeys,
  type CreatedMcpApiKey,
} from '../lib/mcp-api-keys';

interface McpApiKeyCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function McpApiKeyCreateDialog({
  open,
  onOpenChange,
}: McpApiKeyCreateDialogProps) {
  const queryClient = useQueryClient();
  const [name, setName] = React.useState('');
  const [createdKey, setCreatedKey] = React.useState<CreatedMcpApiKey | null>(
    null,
  );
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    if (!open) {
      setName('');
      setCreatedKey(null);
      setCopied(false);
    }
  }, [open]);

  const mutation = useMutation({
    mutationFn: () => createMcpApiKey({ name: name.trim() }),
    onSuccess: (key) => {
      void queryClient.invalidateQueries({ queryKey: mcpApiKeyKeys.all });
      setCreatedKey(key);
      toast.success('API key created');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create API key');
    },
  });

  const canSubmit = name.trim().length > 0 && !mutation.isPending;

  async function handleCopy() {
    if (!createdKey) {
      return;
    }
    try {
      await navigator.clipboard.writeText(createdKey.key);
      setCopied(true);
      toast.success('API key copied to clipboard');
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error('Could not copy to clipboard');
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {createdKey ? (
          <>
            <DialogHeader>
              <DialogTitle>API key</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3">
              <div className="overflow-hidden rounded-lg border bg-muted/20">
                <div className="flex items-center justify-between gap-3 border-b bg-muted/40 px-3 py-1.5">
                  <span className="min-w-0 truncate font-mono text-xs text-muted-foreground">
                    {createdKey.name || 'API key'}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-sm px-1.5 py-0.5 font-mono text-xs text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {copied ? (
                      <Check className="size-3.5 text-primary" />
                    ) : (
                      <Copy className="size-3.5" />
                    )}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <code
                  id="created-mcp-key"
                  className="block select-all break-all p-2 font-mono text-sm leading-relaxed"
                >
                  {createdKey.key}
                </code>
              </div>
              <p className="flex items-start gap-2 text-xs text-muted-foreground">
                <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-destructive" />
                <span>
                  This is the only time the full key will be shown. Store it
                  somewhere safe, You won&apos;t be able to view this key again
                  after closing. If you lose it, revoke the key and create a new
                  one.
                </span>
              </p>
            </div>
            <DialogFooter>
              <Button onClick={() => onOpenChange(false)}>Done</Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Create MCP API key</DialogTitle>
              <DialogDescription>
                Give the key a descriptive name so you can recognize it later
                (e.g. the client or agent it will be used from).
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="create-mcp-key-name">Name</Label>
                <Input
                  id="create-mcp-key-name"
                  placeholder="e.g. Cursor on my laptop"
                  value={name}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                    setName(event.target.value)
                  }
                  onKeyDown={(event: React.KeyboardEvent<HTMLInputElement>) => {
                    if (event.key === 'Enter' && canSubmit) {
                      mutation.mutate();
                    }
                  }}
                  disabled={mutation.isPending}
                  autoFocus
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={mutation.isPending}
              >
                Cancel
              </Button>
              <Button onClick={() => mutation.mutate()} disabled={!canSubmit}>
                {mutation.isPending ? 'Creating…' : 'Create key'}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
