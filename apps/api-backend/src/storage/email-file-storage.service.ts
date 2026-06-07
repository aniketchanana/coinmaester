import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { Injectable, OnModuleInit } from '@nestjs/common';

const DEFAULT_EMAIL_DIR = 'email';
const configured = process.env.EMAIL_STORAGE_DIR?.trim();
const EMAIL_DIR_NAME = configured || DEFAULT_EMAIL_DIR;
const REPO_ROOT = path.resolve(__dirname, '../../../..');

@Injectable()
export class EmailFileStorageService implements OnModuleInit {
  private readonly storageRoot: string;

  constructor() {
    if (configured && path.isAbsolute(configured)) {
      this.storageRoot = configured;
    } else {
      this.storageRoot = path.resolve(REPO_ROOT, EMAIL_DIR_NAME);
    }
  }

  async onModuleInit(): Promise<void> {
    await this.ensureStorageDir();
  }

  async ensureStorageDir(): Promise<void> {
    await mkdir(this.storageRoot, { recursive: true });
  }

  relativePathForId(postgresId: string): string {
    return `${EMAIL_DIR_NAME}/${postgresId}.txt`;
  }

  async writeBody(postgresId: string, content: string): Promise<string> {
    await this.ensureStorageDir();
    const filePath = path.join(this.storageRoot, `${postgresId}.txt`);
    await writeFile(filePath, content, 'utf8');
    return this.relativePathForId(postgresId);
  }

  async readBody(relativePath: string): Promise<string> {
    const normalized = path.normalize(relativePath);
    if (normalized.startsWith('..') || path.isAbsolute(normalized)) {
      throw new Error('Invalid email body path');
    }

    const filePath = path.join(REPO_ROOT, normalized);
    return readFile(filePath, 'utf8');
  }
}
