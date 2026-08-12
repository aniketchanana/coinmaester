import { apiDelete, apiGet, apiPost } from './api-client';

export interface McpApiKey {
  id: string;
  name: string;
  prefix: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
}

export interface CreatedMcpApiKey {
  id: string;
  name: string;
  prefix: string;
  key: string;
  createdAt: string;
}

export interface CreateMcpApiKeyPayload {
  name: string;
}

export const mcpApiKeyKeys = {
  all: ['mcp-api-keys'] as const,
  list: () => ['mcp-api-keys', 'list'] as const,
};

export function fetchMcpApiKeys(): Promise<McpApiKey[]> {
  return apiGet<McpApiKey[]>('/mcp/keys');
}

export async function createMcpApiKey(
  payload: CreateMcpApiKeyPayload,
): Promise<CreatedMcpApiKey> {
  const response = await apiPost<CreatedMcpApiKey>('/mcp/keys', payload);
  return response.data;
}

export function revokeMcpApiKey(id: string): Promise<void> {
  return apiDelete(`/mcp/keys/${id}`);
}

export function getMcpServerUrl(): string {
  // The MCP endpoint is served on this same web origin (Next.js proxies `/mcp`
  // and the OAuth routes to api-backend). Using the current origin keeps the
  // OAuth issuer, session cookie, and connector URL all on one domain.
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/mcp`;
  }
  return `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/mcp`;
}
