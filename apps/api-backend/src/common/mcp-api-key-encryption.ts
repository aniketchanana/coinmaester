import { createHmac, randomBytes } from 'node:crypto';

const MCP_API_KEY_PREFIX = 'cmk_live_';
const PREFIX_DISPLAY_LENGTH = MCP_API_KEY_PREFIX.length + 6;

function getPepper(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      'AUTH_SECRET must be set (>= 32 chars) to hash MCP API keys',
    );
  }
  return secret;
}

export function hashApiKey(key: string): string {
  return createHmac('sha256', getPepper()).update(key).digest('hex');
}

export function generateApiKey(): {
  key: string;
  prefix: string;
  keyHash: string;
} {
  const secret = randomBytes(32).toString('base64url');
  const key = `${MCP_API_KEY_PREFIX}${secret}`;
  const prefix = key.slice(0, PREFIX_DISPLAY_LENGTH);

  return { key, prefix, keyHash: hashApiKey(key) };
}
