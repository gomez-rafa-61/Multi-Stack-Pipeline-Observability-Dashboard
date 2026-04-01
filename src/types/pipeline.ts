export type PipelineStatus = "SUCCESS" | "FAILED" | "CANCELLED";
export type Platform = string;

export interface PipelineHealthSummary {
  totalRuns: number;
  successfulRuns: number;
  failedRuns: number;
  cancelledRuns: number;
  successRatePct: number;
  avgDurationSeconds: number;
  activePlatforms: number;
  uniqueJobs: number;
  earliestEvent: string;
  latestEvent: string;
}

export interface PipelineStatusTrend {
  period: string;
  platform: string;
  status: PipelineStatus;
  runCount: number;
  avgDurationSeconds: number;
}

export interface PlatformBreakdown {
  platform: string;
  status: PipelineStatus;
  runCount: number;
  avgDurationSeconds: number;
  successRatePct: number;
  uniqueJobs: number;
  lastRunTime: string;
}

export interface RecentFailure {
  eventTime: string;
  platform: string;
  jobName: string;
  runId: string;
  status: "FAILED";
  durationSeconds: number;
  errorMessage: string;
  logUrl: string;
  correlationId: string;
  minutesAgo: number;
}

export interface CyclePerformance {
  cycleTimestamp: string;
  correlationId: string;
  status: string;
  durationSeconds: number;
  totalRuns: number;
  successfulAdapters: number;
  failedAdapters: number;
  storedRuns: number;
  storageFailures: number;
  notificationsSent: number;
  adapterSuccessRatePct: number;
}

export interface JobPerformanceRecord {
  platform: string;
  jobName: string;
  totalRuns: number;
  successfulRuns: number;
  failedRuns: number;
  successRatePct: number;
  avgDurationSeconds: number;
  maxDurationSeconds: number;
  lastRunTime: string;
  firstSeen: string;
  solutionId?: string | null;
  solutionName?: string | null;
}

export interface JobRegistryRecord {
  platform: string;
  jobName: string;
  priority: string;
  description: string;
  businessFunction: string;
  slaHours: number;
  enabled: boolean;
  solutionId?: string | null;
  solutionName?: string | null;
  category?: string | null;
  flowType?: string | null;
}
