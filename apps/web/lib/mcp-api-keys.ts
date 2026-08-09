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
  const base = process.env.API_INTERNAL_URL ?? '';
  return `${base.replace(/\/$/, '')}/mcp`;
}
