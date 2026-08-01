import { JOB_STATUS, type JobStatus } from '@repo/constant/job-status';

import { apiGet, apiPost } from './api-client';

export type { JobStatus };

export interface LatestSyncStatusResponse {
  lastSyncStatus: JobStatus | null;
  lastSyncedTime: string | null;
}

export interface CreateSyncJobResponse {
  jobs: {
    id: string;
    status: JobStatus;
  }[];
}

export const syncKeys = {
  latest: ['sync', 'latest'] as const,
};

export function fetchLatestSyncStatus(): Promise<LatestSyncStatusResponse> {
  return apiGet<LatestSyncStatusResponse>('/sync/latest');
}

export function triggerSync() {
  return apiPost<CreateSyncJobResponse>('/sync');
}

export function isSyncInProgress(
  status: JobStatus | null | undefined,
): boolean {
  return status === JOB_STATUS.PENDING || status === JOB_STATUS.IN_PROGRESS;
}

export function isSyncFailed(status: JobStatus | null | undefined): boolean {
  return status === JOB_STATUS.FAILED;
}
