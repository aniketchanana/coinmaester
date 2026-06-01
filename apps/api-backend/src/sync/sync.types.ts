import type { JobStatus } from '@repo/constant/job-status';

export interface CreateSyncJobResponse {
  id: string;
  status: JobStatus;
}

export interface LatestSyncStatusResponse {
  lastSyncStatus: JobStatus | null;
  lastSyncedTime: string | null;
}
