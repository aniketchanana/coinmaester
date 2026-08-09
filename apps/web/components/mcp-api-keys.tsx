'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { KeyRound, Plus, Trash2 } from 'lucide-react';
import * as React from 'react';
import { toast } from 'sonner';

import { Badge } from '@repo/ui/badge';
import { Button } from '@repo/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@repo/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@repo/ui/table';

import {
  fetchMcpApiKeys,
  type McpApiKey,
  mcpApiKeyKeys,
  revokeMcpApiKey,
} from '../lib/mcp-api-keys';
import { McpApiKeyCreateDialog } from './mcp-api-key-create-dialog';

function formatDate(value: string | null): string {
  if (!value) {
    return '—';
  }
  return new Date(value).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function McpApiKeys() {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = React.useState(false);
  const [keyToRevoke, setKeyToRevoke] = React.useState<McpApiKey | null>(null);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: mcpApiKeyKeys.list(),
    queryFn: fetchMcpApiKeys,
  });

  const revokeMutation = useMutation({
    mutationFn: (id: string) => revokeMcpApiKey(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: mcpApiKeyKeys.all });
      toast.success('API key revoked');
      setKeyToRevoke(null);
    },
    onError: (mutationError: Error) => {
      toast.error(mutationError.message || 'Failed to revoke API key');
    },
  });

  const keys = data ?? [];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold tracking-tight">API keys</h2>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="size-4" />
          Create key
        </Button>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Key</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Last used</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="py-10 text-center text-sm text-muted-foreground"
                >
                  Loading keys…
                </TableCell>
              </TableRow>
            ) : isError ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="py-10 text-center text-sm text-destructive"
                >
                  {error instanceof Error
                    ? error.message
                    : 'Failed to load API keys'}
                </TableCell>
              </TableRow>
            ) : keys.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-12">
                  <div className="flex flex-col items-center gap-2 text-center">
                    <KeyRound className="size-6 text-muted-foreground" />
                    <p className="text-sm font-medium">No API keys yet</p>
                    <p className="max-w-sm text-sm text-muted-foreground">
                      Create your first key to connect an MCP client or AI agent
                      to Coinmaester.
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              keys.map((key) => {
                const isRevoked = key.revokedAt !== null;
                return (
                  <TableRow key={key.id}>
                    <TableCell className="font-medium">{key.name}</TableCell>
                    <TableCell>
                      <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                        {key.prefix}…
                      </code>
                    </TableCell>
                    <TableCell>
                      {isRevoked ? (
                        <Badge variant="secondary">Revoked</Badge>
                      ) : (
                        <Badge>Active</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(key.createdAt)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(key.lastUsedAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setKeyToRevoke(key)}
                        disabled={isRevoked}
                      >
                        <Trash2 className="size-4" />
                        Revoke
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <McpApiKeyCreateDialog open={createOpen} onOpenChange={setCreateOpen} />

      <Dialog
        open={keyToRevoke !== null}
        onOpenChange={(open) => {
          if (!open) {
            setKeyToRevoke(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revoke API key</DialogTitle>
            <DialogDescription>
              {keyToRevoke
                ? `"${keyToRevoke.name}" will stop working immediately. Any client or agent using it will lose access. This cannot be undone.`
                : ''}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setKeyToRevoke(null)}
              disabled={revokeMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (keyToRevoke) {
                  revokeMutation.mutate(keyToRevoke.id);
                }
              }}
              disabled={revokeMutation.isPending}
            >
              {revokeMutation.isPending ? 'Revoking…' : 'Revoke key'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
