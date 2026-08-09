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

export interface JobStatusCounts {
  pending: number;
  inProgress: number;
  completed: number;
  failed: number;
  total: number;
}

export interface JobStatusSummaryResponse {
  /** Gmail fetch sync jobs still PENDING or IN_PROGRESS. */
  activeSyncJobs: number;
  lastSyncStatus: JobStatus | null;
  lastSyncedTime: string | null;
  /** AI email-parsing jobs (GmailMessage) grouped by status. */
  messages: JobStatusCounts;
  /**
   * True while Gmail fetch or AI parsing still has work in flight.
   * Agents should keep polling until this is false before reading new transactions.
   */
  hasActiveWork: boolean;
}
