import type {
  PipelineHealthSummary,
  PipelineStatusTrend,
  PlatformBreakdown,
  RecentFailure,
  CyclePerformance,
  JobPerformanceRecord,
} from "@/types/pipeline";

export const healthSummary: PipelineHealthSummary = {
  totalRuns: 342,
  successfulRuns: 336,
  failedRuns: 4,
  cancelledRuns: 2,
  successRatePct: 98.2,
  avgDurationSeconds: 274.3,
  activePlatforms: 4,
  uniqueJobs: 27,
  earliestEvent: "2026-03-04T00:15:00Z",
  latestEvent: "2026-03-05T11:45:00Z",
};

function hoursAgo(h: number): string {
  const d = new Date();
  d.setHours(d.getHours() - h);
  return d.toISOString();
}

function generateTrendData(): PipelineStatusTrend[] {
  const platforms = ["DATABRICKS", "AIRBYTE", "SNOWFLAKE", "POWER_AUTOMATE"];
  const statuses: Array<"SUCCESS" | "FAILED" | "CANCELLED"> = [
    "SUCCESS",
    "FAILED",
    "CANCELLED",
  ];
  const rows: PipelineStatusTrend[] = [];

  for (let h = 168; h >= 0; h -= 1) {
    for (const platform of platforms) {
      const baseRuns =
        platform === "DATABRICKS"
          ? 5
          : platform === "AIRBYTE"
            ? 3
            : platform === "SNOWFLAKE"
              ? 4
              : 2;
      for (const status of statuses) {
        const count =
          status === "SUCCESS"
            ? baseRuns + Math.floor(Math.random() * 3)
            : status === "FAILED"
              ? Math.random() > 0.85
                ? 1
                : 0
              : Math.random() > 0.95
                ? 1
                : 0;
        if (count > 0) {
          rows.push({
            period: hoursAgo(h),
            platform,
            status,
            runCount: count,
            avgDurationSeconds:
              Math.round((180 + Math.random() * 300) * 10) / 10,
          });
        }
      }
    }
  }
  return rows;
}

export const statusTrend: PipelineStatusTrend[] = generateTrendData();

export const platformBreakdown: PlatformBreakdown[] = [
  {
    platform: "DATABRICKS",
    status: "SUCCESS",
    runCount: 487,
    avgDurationSeconds: 312.4,
    successRatePct: 99.1,
    uniqueJobs: 8,
    lastRunTime: hoursAgo(0),
  },
  {
    platform: "DATABRICKS",
    status: "FAILED",
    runCount: 3,
    avgDurationSeconds: 45.2,
    successRatePct: 99.1,
    uniqueJobs: 8,
    lastRunTime: hoursAgo(0),
  },
  {
    platform: "DATABRICKS",
    status: "CANCELLED",
    runCount: 1,
    avgDurationSeconds: 12.0,
    successRatePct: 99.1,
    uniqueJobs: 8,
    lastRunTime: hoursAgo(0),
  },
  {
    platform: "AIRBYTE",
    status: "SUCCESS",
    runCount: 289,
    avgDurationSeconds: 198.7,
    successRatePct: 97.3,
    uniqueJobs: 6,
    lastRunTime: hoursAgo(1),
  },
  {
    platform: "AIRBYTE",
    status: "FAILED",
    runCount: 8,
    avgDurationSeconds: 67.3,
    successRatePct: 97.3,
    uniqueJobs: 6,
    lastRunTime: hoursAgo(1),
  },
  {
    platform: "SNOWFLAKE",
    status: "SUCCESS",
    runCount: 672,
    avgDurationSeconds: 145.1,
    successRatePct: 100.0,
    uniqueJobs: 9,
    lastRunTime: hoursAgo(0),
  },
  {
    platform: "POWER_AUTOMATE",
    status: "SUCCESS",
    runCount: 134,
    avgDurationSeconds: 423.6,
    successRatePct: 95.0,
    uniqueJobs: 4,
    lastRunTime: hoursAgo(2),
  },
  {
    platform: "POWER_AUTOMATE",
    status: "FAILED",
    runCount: 5,
    avgDurationSeconds: 89.4,
    successRatePct: 95.0,
    uniqueJobs: 4,
    lastRunTime: hoursAgo(2),
  },
  {
    platform: "POWER_AUTOMATE",
    status: "CANCELLED",
    runCount: 2,
    avgDurationSeconds: 15.0,
    successRatePct: 95.0,
    uniqueJobs: 4,
    lastRunTime: hoursAgo(2),
  },
];

export const recentFailures: RecentFailure[] = [
  {
    eventTime: hoursAgo(0.5),
    platform: "AIRBYTE",
    jobName: "src_salesforce_accounts",
    runId: "ab-run-20260305-1130",
    status: "FAILED",
    durationSeconds: 45,
    errorMessage:
      "Connection refused: Salesforce API rate limit exceeded (429). Retry after 60s.",
    logUrl: "https://airbyte.internal/connections/abc123/runs/45",
    correlationId: "cycle-20260305-1130",
    minutesAgo: 30,
  },
  {
    eventTime: hoursAgo(2),
    platform: "DATABRICKS",
    jobName: "etl_claims_daily_load",
    runId: "dbx-run-84521",
    status: "FAILED",
    durationSeconds: 122,
    errorMessage:
      'AnalysisException: Table or view not found: raw_claims.claims_delta; line 14 pos 5',
    logUrl: "https://adb-12345.azuredatabricks.net/#/jobs/84521",
    correlationId: "cycle-20260305-0945",
    minutesAgo: 120,
  },
  {
    eventTime: hoursAgo(5),
    platform: "POWER_AUTOMATE",
    jobName: "flow_daily_inventory_sync",
    runId: "pa-run-f8a3b2",
    status: "FAILED",
    durationSeconds: 89,
    errorMessage:
      "Timeout: SharePoint connector did not respond within 120 seconds.",
    logUrl: "https://make.powerautomate.com/environments/default/flows/f8a3b2",
    correlationId: "cycle-20260305-0645",
    minutesAgo: 300,
  },
  {
    eventTime: hoursAgo(8),
    platform: "AIRBYTE",
    jobName: "src_hubspot_contacts",
    runId: "ab-run-20260305-0345",
    status: "FAILED",
    durationSeconds: 67,
    errorMessage:
      "AuthenticationError: OAuth token expired. Re-authorize the HubSpot source.",
    logUrl: "https://airbyte.internal/connections/def456/runs/88",
    correlationId: "cycle-20260305-0345",
    minutesAgo: 480,
  },
  {
    eventTime: hoursAgo(14),
    platform: "DATABRICKS",
    jobName: "etl_patient_demographics",
    runId: "dbx-run-84490",
    status: "FAILED",
    durationSeconds: 210,
    errorMessage:
      "java.lang.OutOfMemoryError: GC overhead limit exceeded on worker node 3.",
    logUrl: "https://adb-12345.azuredatabricks.net/#/jobs/84490",
    correlationId: "cycle-20260304-2145",
    minutesAgo: 840,
  },
  {
    eventTime: hoursAgo(22),
    platform: "POWER_AUTOMATE",
    jobName: "flow_nightly_email_digest",
    runId: "pa-run-c2d4e6",
    status: "FAILED",
    durationSeconds: 34,
    errorMessage:
      "InvalidRecipient: The mailbox 'reports@company.com' is full and cannot accept messages.",
    logUrl: "https://make.powerautomate.com/environments/default/flows/c2d4e6",
    correlationId: "cycle-20260304-1345",
    minutesAgo: 1320,
  },
  {
    eventTime: hoursAgo(36),
    platform: "AIRBYTE",
    jobName: "src_postgres_orders",
    runId: "ab-run-20260304-0045",
    status: "FAILED",
    durationSeconds: 12,
    errorMessage:
      "ConnectionError: Could not connect to source database at 10.0.1.50:5432 — connection timed out.",
    logUrl: "https://airbyte.internal/connections/ghi789/runs/102",
    correlationId: "cycle-20260304-0045",
    minutesAgo: 2160,
  },
  {
    eventTime: hoursAgo(48),
    platform: "DATABRICKS",
    jobName: "etl_financial_reconciliation",
    runId: "dbx-run-84455",
    status: "FAILED",
    durationSeconds: 567,
    errorMessage:
      "SchemaEvolutionException: Column 'amount' type changed from DECIMAL(18,2) to STRING in upstream source.",
    logUrl: "https://adb-12345.azuredatabricks.net/#/jobs/84455",
    correlationId: "cycle-20260303-1145",
    minutesAgo: 2880,
  },
];

function generateCycleData(): CyclePerformance[] {
  const rows: CyclePerformance[] = [];
  for (let i = 0; i < 48; i++) {
    const ts = new Date();
    ts.setMinutes(ts.getMinutes() - i * 15);
    rows.push({
      cycleTimestamp: ts.toISOString(),
      correlationId: `cycle-${ts.toISOString().slice(0, 16).replace(/[-T:]/g, "")}`,
      status: "COMPLETED",
      durationSeconds: 220 + Math.floor(Math.random() * 120),
      totalRuns: 10 + Math.floor(Math.random() * 8),
      successfulAdapters: 4,
      failedAdapters: Math.random() > 0.9 ? 1 : 0,
      storedRuns: 10 + Math.floor(Math.random() * 8),
      storageFailures: 0,
      notificationsSent: Math.random() > 0.85 ? 1 : 0,
      adapterSuccessRatePct:
        Math.random() > 0.9
          ? Math.round((75 + Math.random() * 25) * 10) / 10
          : 100.0,
    });
  }
  return rows;
}

export const cyclePerformance: CyclePerformance[] = generateCycleData();

export const jobPerformance: JobPerformanceRecord[] = [
  {
    platform: "DATABRICKS",
    jobName: "etl_claims_daily_load",
    totalRuns: 142,
    successfulRuns: 139,
    failedRuns: 3,
    successRatePct: 97.9,
    avgDurationSeconds: 345.2,
    maxDurationSeconds: 612.0,
    lastRunTime: hoursAgo(0),
    firstSeen: "2026-02-03T08:00:00Z",
  },
  {
    platform: "DATABRICKS",
    jobName: "etl_patient_demographics",
    totalRuns: 130,
    successfulRuns: 129,
    failedRuns: 1,
    successRatePct: 99.2,
    avgDurationSeconds: 278.9,
    maxDurationSeconds: 510.0,
    lastRunTime: hoursAgo(1),
    firstSeen: "2026-02-03T08:00:00Z",
  },
  {
    platform: "DATABRICKS",
    jobName: "etl_financial_reconciliation",
    totalRuns: 60,
    successfulRuns: 58,
    failedRuns: 2,
    successRatePct: 96.7,
    avgDurationSeconds: 487.6,
    maxDurationSeconds: 890.0,
    lastRunTime: hoursAgo(3),
    firstSeen: "2026-02-03T08:00:00Z",
  },
  {
    platform: "DATABRICKS",
    jobName: "etl_inventory_snapshot",
    totalRuns: 155,
    successfulRuns: 155,
    failedRuns: 0,
    successRatePct: 100.0,
    avgDurationSeconds: 189.3,
    maxDurationSeconds: 302.0,
    lastRunTime: hoursAgo(0),
    firstSeen: "2026-02-03T08:00:00Z",
  },
  {
    platform: "AIRBYTE",
    jobName: "src_salesforce_accounts",
    totalRuns: 288,
    successfulRuns: 282,
    failedRuns: 6,
    successRatePct: 97.9,
    avgDurationSeconds: 198.7,
    maxDurationSeconds: 445.0,
    lastRunTime: hoursAgo(0),
    firstSeen: "2026-02-03T10:00:00Z",
  },
  {
    platform: "AIRBYTE",
    jobName: "src_hubspot_contacts",
    totalRuns: 288,
    successfulRuns: 284,
    failedRuns: 4,
    successRatePct: 98.6,
    avgDurationSeconds: 134.2,
    maxDurationSeconds: 312.0,
    lastRunTime: hoursAgo(1),
    firstSeen: "2026-02-03T10:00:00Z",
  },
  {
    platform: "AIRBYTE",
    jobName: "src_postgres_orders",
    totalRuns: 288,
    successfulRuns: 286,
    failedRuns: 2,
    successRatePct: 99.3,
    avgDurationSeconds: 87.4,
    maxDurationSeconds: 201.0,
    lastRunTime: hoursAgo(0),
    firstSeen: "2026-02-03T10:00:00Z",
  },
  {
    platform: "SNOWFLAKE",
    jobName: "task_edw_dim_refresh",
    totalRuns: 672,
    successfulRuns: 672,
    failedRuns: 0,
    successRatePct: 100.0,
    avgDurationSeconds: 89.1,
    maxDurationSeconds: 178.0,
    lastRunTime: hoursAgo(0),
    firstSeen: "2026-02-03T00:00:00Z",
  },
  {
    platform: "SNOWFLAKE",
    jobName: "task_edw_fact_load",
    totalRuns: 672,
    successfulRuns: 672,
    failedRuns: 0,
    successRatePct: 100.0,
    avgDurationSeconds: 145.7,
    maxDurationSeconds: 298.0,
    lastRunTime: hoursAgo(0),
    firstSeen: "2026-02-03T00:00:00Z",
  },
  {
    platform: "SNOWFLAKE",
    jobName: "task_staging_cleanup",
    totalRuns: 336,
    successfulRuns: 336,
    failedRuns: 0,
    successRatePct: 100.0,
    avgDurationSeconds: 34.2,
    maxDurationSeconds: 67.0,
    lastRunTime: hoursAgo(0),
    firstSeen: "2026-02-03T00:00:00Z",
  },
  {
    platform: "POWER_AUTOMATE",
    jobName: "flow_daily_inventory_sync",
    totalRuns: 60,
    successfulRuns: 56,
    failedRuns: 4,
    successRatePct: 93.3,
    avgDurationSeconds: 423.6,
    maxDurationSeconds: 780.0,
    lastRunTime: hoursAgo(2),
    firstSeen: "2026-02-03T12:00:00Z",
  },
  {
    platform: "POWER_AUTOMATE",
    jobName: "flow_nightly_email_digest",
    totalRuns: 30,
    successfulRuns: 29,
    failedRuns: 1,
    successRatePct: 96.7,
    avgDurationSeconds: 56.8,
    maxDurationSeconds: 120.0,
    lastRunTime: hoursAgo(10),
    firstSeen: "2026-02-03T20:00:00Z",
  },
  {
    platform: "POWER_AUTOMATE",
    jobName: "flow_weekly_report_gen",
    totalRuns: 8,
    successfulRuns: 8,
    failedRuns: 0,
    successRatePct: 100.0,
    avgDurationSeconds: 312.5,
    maxDurationSeconds: 445.0,
    lastRunTime: hoursAgo(48),
    firstSeen: "2026-02-07T06:00:00Z",
  },
];
