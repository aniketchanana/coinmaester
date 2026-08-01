import type { JobStatus } from '@repo/constant/job-status';

export interface CreateSyncJobResponse {
  jobs: {
    id: string;
    status: JobStatus;
  }[];
}

export interface LatestSyncStatusResponse {
  lastSyncStatus: JobStatus | null;
  lastSyncedTime: string | null;
}
