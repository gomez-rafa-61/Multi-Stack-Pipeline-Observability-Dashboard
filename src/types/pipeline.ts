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
  /** From JOB_REGISTRY.PLATFORM_METADATA.tag (Snowflake grouping) */
  tag?: string | null;
}

export interface MonitoringEvent {
  platform: string;
  jobName: string;
  eventType: string;
  status: string;
  startTime: string;
  endTime: string;
  durationSeconds: number;
  platformMetadata: Record<string, unknown> | string | null;
}

// ---------------------------------------------------------------------------
// Catalog Portal
// ---------------------------------------------------------------------------

export interface CatalogEntry {
  catalogId: string;
  platform: string;
  pipelineName: string;
  pipelineDescription: string | null;
  businessSegment: string | null;
  dataProvider: string | null;
  dataDirection: string | null;
  connectionType: string | null;
  dataEnvironment: string | null;
  ownerName: string | null;
  ownerEmail: string | null;
  engineerName: string | null;
  engineerEmail: string | null;
  isDocumented: boolean;
  tags: string[];
  dataClassification: string;
  refreshFrequency: string | null;
  catalogStatus: string;
  deprecationDate: string | null;
  lastCatalogUpdate: string | null;
  updatedBy: string | null;
  createdAt: string;
  createdBy: string | null;
  priority: string | null;
  slaHours: number | null;
  enabled: boolean | null;
  businessFunction: string | null;
}

export interface CatalogEntity {
  entityId: string;
  catalogId: string;
  entityName: string;
  entityDescription: string | null;
  databaseDetails: string | null;
  uri: string | null;
}

export interface EntityLineageRecord {
  catalogId: string;
  platform: string;
  pipelineName: string;
  dataProvider: string | null;
  entityId: string;
  entityName: string;
  databaseDetails: string | null;
  sourceType: string | null;
  stream: string | null;
  destDb: string | null;
  database: string | null;
  schema: string | null;
  tableName: string | null;
}

export interface LineageEdge {
  lineageId: string;
  sourceCatalogId: string;
  targetCatalogId: string;
  relationshipType: string;
  description: string | null;
}

export interface CatalogDiagram {
  diagramId: string;
  catalogId: string;
  title: string;
  url: string;
  diagramType: string | null;
  thumbnailUrl: string | null;
  description: string | null;
}

export interface CatalogDocument {
  documentId: string;
  catalogId: string;
  title: string;
  url: string;
  docType: string | null;
  description: string | null;
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
  /** From JOB_REGISTRY.PLATFORM_METADATA.tag (Snowflake grouping) */
  tag?: string | null;
}
