'use client';

import { Check, Copy } from 'lucide-react';
import * as React from 'react';
import { toast } from 'sonner';

import { Badge } from '@repo/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@repo/ui/tabs';

import { getMcpServerUrl } from '../lib/mcp-api-keys';

const KEY_PLACEHOLDER = 'YOUR_API_KEY';

function useCopy() {
  const [copied, setCopied] = React.useState(false);
  const copy = React.useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success('Copied to clipboard');
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error('Could not copy to clipboard');
    }
  }, []);
  return { copied, copy };
}

function CodeBlock({ label, code }: { label: string; code: string }) {
  const { copied, copy } = useCopy();
  return (
    <div className="overflow-hidden rounded-lg border bg-muted/20">
      <div className="flex items-center justify-between gap-3 border-b bg-muted/40 px-3 py-1.5">
        <span className="font-mono text-xs text-muted-foreground">{label}</span>
        <button
          type="button"
          onClick={() => copy(code)}
          className="inline-flex items-center gap-1.5 rounded-sm px-1.5 py-0.5 font-mono text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          {copied ? (
            <Check className="size-3.5 text-primary" />
          ) : (
            <Copy className="size-3.5" />
          )}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="overflow-x-auto p-3 text-sm leading-relaxed">
        <code className="font-mono">{code}</code>
      </pre>
    </div>
  );
}

function InlineCopy({ value }: { value: string }) {
  const { copied, copy } = useCopy();
  return (
    <button
      type="button"
      onClick={() => copy(value)}
      className="group inline-flex min-w-0 items-center gap-2"
      title="Click to copy"
    >
      <code className="min-w-0 truncate font-mono text-sm text-foreground">
        {value}
      </code>
      {copied ? (
        <Check className="size-3.5 shrink-0 text-primary" />
      ) : (
        <Copy className="size-3.5 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground" />
      )}
    </button>
  );
}

type McpClient = {
  id: string;
  label: string;
  file: string;
  code: string;
  description?: string;
  steps?: string[];
};

export function McpConnectionGuide() {
  const serverUrl = getMcpServerUrl();

  const clients: McpClient[] = [
    {
      id: 'cursor',
      label: 'Cursor',
      file: '~/.cursor/mcp.json',
      description:
        'Uses an API key from above. Create one, then paste it in place of ' +
        `${KEY_PLACEHOLDER}.`,
      code: `{
  "mcpServers": {
    "coinmaester": {
      "url": "${serverUrl}",
      "headers": {
        "Authorization": "Bearer ${KEY_PLACEHOLDER}"
      }
    }
  }
}`,
    },
    {
      id: 'claude',
      label: 'Claude Desktop',
      file: 'claude_desktop_config.json',
      description:
        'Uses an API key from above. Create one, then paste it in place of ' +
        `${KEY_PLACEHOLDER}.`,
      code: `{
  "mcpServers": {
    "coinmaester": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote",
        "${serverUrl}",
        "--header",
        "Authorization:Bearer ${KEY_PLACEHOLDER}"
      ]
    }
  }
}`,
    },
    {
      id: 'oauth',
      label: 'Connected App (OAuth)',
      file: 'MCP Server URL',
      description:
        'For apps that connect over OAuth (e.g. Gemini, or ChatGPT / Claude ' +
        'connectors). No API key needed — you sign in with Google and approve ' +
        'access. Add this as a custom MCP connector:',
      steps: [
        'In your app, open connector / custom app settings and choose “Add custom app” (or “Add MCP server”).',
        'Paste the MCP server URL below and continue.',
        'When the app opens a browser, sign in with Google and approve access to your Coinmaester data.',
      ],
      code: serverUrl,
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold tracking-tight">Connect a client</h2>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border bg-muted/20 px-3 py-2.5">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <Badge variant="secondary">MCP Server</Badge>
          <InlineCopy value={serverUrl} />
        </div>
        <Badge variant="outline">Streamable HTTP</Badge>
        <Badge variant="outline">API key</Badge>
        <Badge variant="outline">OAuth 2.1</Badge>
      </div>

      <Tabs defaultValue="cursor" className="w-full gap-3">
        <TabsList>
          {clients.map((client) => (
            <TabsTrigger key={client.id} value={client.id}>
              {client.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {clients.map((client) => (
          <TabsContent
            key={client.id}
            value={client.id}
            className="flex flex-col gap-3"
          >
            {client.description ? (
              <p className="text-sm text-muted-foreground">
                {client.description}
              </p>
            ) : null}
            {client.steps ? (
              <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
                {client.steps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
            ) : null}
            <CodeBlock label={client.file} code={client.code} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
