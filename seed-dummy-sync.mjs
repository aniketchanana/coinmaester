#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const apiBackendDir = path.join(scriptDir, 'apps/api-backend');

const result = spawnSync(
  'pnpm',
  ['seed:dummy-sync', ...process.argv.slice(2)],
  {
    cwd: apiBackendDir,
    stdio: 'inherit',
    env: process.env,
  },
);

process.exit(result.status ?? 1);
