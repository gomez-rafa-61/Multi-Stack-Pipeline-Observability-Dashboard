import type {
  PipelineHealthSummary,
  PipelineStatusTrend,
  PlatformBreakdown,
  RecentFailure,
  CyclePerformance,
  JobPerformanceRecord,
  JobRegistryRecord,
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

export const jobRegistry: JobRegistryRecord[] = [
  { platform: "AIRBYTE", jobName: "Bitly ADL -> Snowflake", priority: "medium", description: "Bitly ADL data sync to Snowflake", businessFunction: "Data Integration", slaHours: 6, enabled: false },
  { platform: "AIRBYTE", jobName: "CIRF & PIR - ADL -> Snowflake", priority: "high", description: "CIRF & PIR report data sync to Snowflake", businessFunction: "Finance", slaHours: 4, enabled: false },
  { platform: "AIRBYTE", jobName: "Cura-Customer-Integration-Prod -> Snowflake", priority: "critical", description: "Cura customer integration — production sync", businessFunction: "Customer Integration", slaHours: 4, enabled: false },
  { platform: "AIRBYTE", jobName: "Deputy Full Loads -> Snowflake", priority: "medium", description: "Deputy full data load", businessFunction: "Workforce Management", slaHours: 6, enabled: false },
  { platform: "AIRBYTE", jobName: "Deputy_contact_incremental -> Snowflake", priority: "high", description: "Deputy contact records — incremental sync", businessFunction: "Workforce Management", slaHours: 4, enabled: false },
  { platform: "AIRBYTE", jobName: "Deputy_employee_historical_snapshots -> Snowflake", priority: "medium", description: "Deputy employee historical snapshot data", businessFunction: "Workforce Management", slaHours: 6, enabled: false },
  { platform: "AIRBYTE", jobName: "Deputy_employee_history_incremental -> Snowflake", priority: "high", description: "Deputy employee history incremental data", businessFunction: "Workforce Management", slaHours: 4, enabled: false },
  { platform: "AIRBYTE", jobName: "Deputy_employee_incremental_with_history_append -> Snowflake", priority: "high", description: "Deputy employee incremental with history append", businessFunction: "Workforce Management", slaHours: 4, enabled: false },
  { platform: "AIRBYTE", jobName: "Deputy_new_albany -> Snowflake", priority: "medium", description: "Deputy New Albany sync", businessFunction: "Workforce Management", slaHours: 6, enabled: false },
  { platform: "AIRBYTE", jobName: "Deputy_roster_incremental -> Snowflake", priority: "high", description: "Deputy roster data — incremental sync", businessFunction: "Workforce Management", slaHours: 4, enabled: false },
  { platform: "AIRBYTE", jobName: "Deputy_roster_lookback_snapshot -> Snowflake", priority: "high", description: "Deputy roster lookback snapshot", businessFunction: "Workforce Management", slaHours: 4, enabled: false },
  { platform: "AIRBYTE", jobName: "Deputy_timesheet_incremental -> Snowflake", priority: "high", description: "Deputy timesheet data — incremental sync", businessFunction: "Workforce Management", slaHours: 4, enabled: false },
  { platform: "AIRBYTE", jobName: "Deputy_timesheet_lookback_snapshot -> Snowflake", priority: "high", description: "Deputy timesheet lookback snapshot", businessFunction: "Workforce Management", slaHours: 4, enabled: false },
  { platform: "AIRBYTE", jobName: "Deputy_timesheet_pay_return_incremental -> Snowflake", priority: "high", description: "Deputy timesheet pay return — incremental sync", businessFunction: "Workforce Management", slaHours: 4, enabled: false },
  { platform: "AIRBYTE", jobName: "Deputy_timesheet_pay_return_lookback_snapshot -> Snowflake", priority: "high", description: "Deputy timesheet pay return lookback snapshot", businessFunction: "Workforce Management", slaHours: 4, enabled: false },
  { platform: "AIRBYTE", jobName: "Dutchie Ecom-POS Mapping -> Snowflake", priority: "high", description: "Dutchie ecommerce to POS mapping", businessFunction: "Retail / POS", slaHours: 4, enabled: false },
  { platform: "AIRBYTE", jobName: "Dutchie Pos Brilliant Buds Location -> Snowflake", priority: "high", description: "Dutchie POS data for Brilliant Buds location", businessFunction: "Retail / POS", slaHours: 4, enabled: false },
  { platform: "AIRBYTE", jobName: "Location Compliance -> Snowflake", priority: "high", description: "Location compliance data from SharePoint", businessFunction: "Operations", slaHours: 4, enabled: false },
  { platform: "AIRBYTE", jobName: "Location Mapping Smartsheet -> Snowflake", priority: "medium", description: "Location mapping reference data from Smartsheet", businessFunction: "Retail Operations", slaHours: 26, enabled: false },
  { platform: "AIRBYTE", jobName: "Product Standard File -> Snowflake", priority: "medium", description: "Product standard file from SharePoint", businessFunction: "Data Integration", slaHours: 6, enabled: false },
  { platform: "AIRBYTE", jobName: "Sharepoint Security Files -> Snowflake", priority: "high", description: "Security files from SharePoint", businessFunction: "Operations", slaHours: 4, enabled: false },
  { platform: "AIRBYTE", jobName: "Shopify - Florida Hemp Store -> Snowflake", priority: "high", description: "Shopify Florida Hemp Store e-commerce data", businessFunction: "E-Commerce", slaHours: 26, enabled: false },
  { platform: "AIRBYTE", jobName: "Simplifya ADL -> Snowflake", priority: "medium", description: "Simplifya ADL data sync to Snowflake", businessFunction: "Data Integration", slaHours: 6, enabled: false },
  { platform: "AIRBYTE", jobName: "Smartsheets_retail_store_info -> Snowflake", priority: "medium", description: "Retail store info from Smartsheets", businessFunction: "Retail Operations", slaHours: 26, enabled: false },
  { platform: "AIRBYTE", jobName: "Snowflake_sweed_egress_PROD_PREV_DAY -> MS SQL Server", priority: "critical", description: "Snowflake to MS SQL Server egress for customer integration (production)", businessFunction: "Customer Integration", slaHours: 4, enabled: false },
  { platform: "AIRBYTE", jobName: "Springbig Prod -> Snowflake", priority: "high", description: "Springbig loyalty/marketing platform — production", businessFunction: "Marketing / Loyalty", slaHours: 4, enabled: false },
  { platform: "AIRBYTE", jobName: "SurveyMonkey -> Snowflake", priority: "medium", description: "SurveyMonkey survey data", businessFunction: "Marketing / Reviews", slaHours: 26, enabled: false },
  { platform: "AIRBYTE", jobName: "Uberall_reviews -> Snowflake", priority: "medium", description: "Uberall review data", businessFunction: "Marketing / Reviews", slaHours: 26, enabled: false },
  { platform: "AIRBYTE", jobName: "Wholesale Mapping Files -> Snowflake", priority: "medium", description: "Wholesale mapping files from SharePoint", businessFunction: "Data Integration", slaHours: 6, enabled: false },
  { platform: "AIRBYTE", jobName: "costing_files -> Snowflake", priority: "medium", description: "Costing files from SharePoint", businessFunction: "Operations", slaHours: 6, enabled: false },
  { platform: "AIRBYTE", jobName: "deputy_labor_model -> Snowflake", priority: "medium", description: "Deputy labor model data", businessFunction: "Workforce Management", slaHours: 6, enabled: false },
  { platform: "AIRBYTE", jobName: "edge_reviews -> Snowflake", priority: "medium", description: "Edge reviews data (manual sync)", businessFunction: "Marketing / Reviews", slaHours: 26, enabled: false },
  { platform: "AIRBYTE", jobName: "labor_model_rules -> Snowflake", priority: "medium", description: "Labor model rules from Deputy", businessFunction: "Workforce Management", slaHours: 8, enabled: false },
  { platform: "AIRBYTE", jobName: "leaftrade dispensary_locations -> Snowflake", priority: "high", description: "LeafTrade dispensary location data", businessFunction: "B2B Commerce", slaHours: 4, enabled: false },
  { platform: "AIRBYTE", jobName: "leaftrade_batches -> Snowflake", priority: "high", description: "LeafTrade batch data", businessFunction: "B2B Commerce", slaHours: 4, enabled: false },
  { platform: "AIRBYTE", jobName: "leaftrade_categories -> Snowflake", priority: "high", description: "LeafTrade product categories", businessFunction: "B2B Commerce", slaHours: 4, enabled: false },
  { platform: "AIRBYTE", jobName: "leaftrade_dispensaries -> Snowflake", priority: "high", description: "LeafTrade dispensary data", businessFunction: "B2B Commerce", slaHours: 4, enabled: false },
  { platform: "AIRBYTE", jobName: "leaftrade_ordered_items -> Snowflake", priority: "critical", description: "LeafTrade ordered items — revenue data", businessFunction: "B2B Commerce", slaHours: 2, enabled: false },
  { platform: "AIRBYTE", jobName: "leaftrade_orders -> Snowflake", priority: "critical", description: "LeafTrade orders — revenue data", businessFunction: "B2B Commerce", slaHours: 2, enabled: false },
  { platform: "AIRBYTE", jobName: "leaftrade_product_variants -> Snowflake", priority: "high", description: "LeafTrade product variants", businessFunction: "B2B Commerce", slaHours: 4, enabled: false },
  { platform: "AIRBYTE", jobName: "leaftrade_products -> Snowflake", priority: "high", description: "LeafTrade product catalog", businessFunction: "B2B Commerce", slaHours: 4, enabled: false },
  { platform: "AIRBYTE", jobName: "leaftrade_stock -> Snowflake", priority: "critical", description: "LeafTrade stock/inventory levels", businessFunction: "B2B Commerce", slaHours: 2, enabled: false },
  { platform: "AIRBYTE", jobName: "leaftrade_stock_locations -> Snowflake", priority: "critical", description: "LeafTrade stock location data", businessFunction: "B2B Commerce", slaHours: 2, enabled: false },
  { platform: "AIRBYTE", jobName: "leaftrade_strains -> Snowflake", priority: "high", description: "LeafTrade strain reference data", businessFunction: "B2B Commerce", slaHours: 4, enabled: false },
  { platform: "AIRBYTE", jobName: "leaftrade_vendor_accounts -> Snowflake", priority: "high", description: "LeafTrade vendor account data", businessFunction: "B2B Commerce", slaHours: 4, enabled: false },
  { platform: "AIRBYTE", jobName: "leaftrade_vendor_users -> Snowflake", priority: "high", description: "LeafTrade vendor user data", businessFunction: "B2B Commerce", slaHours: 4, enabled: false },
  { platform: "AIRBYTE", jobName: "sweed_product_map_dev -> Snowflake", priority: "medium", description: "Sweed product mapping (dev)", businessFunction: "Data Integration", slaHours: 6, enabled: false },
  { platform: "AIRBYTE", jobName: "uberall -> Snowflake", priority: "medium", description: "Uberall location data", businessFunction: "Marketing / Reviews", slaHours: 26, enabled: false },
  { platform: "AIRBYTE", jobName: "vena_budget -> Snowflake", priority: "high", description: "Vena budget/financial planning data", businessFunction: "Financial Planning", slaHours: 8, enabled: false },
  { platform: "AIRBYTE", jobName: "vena_dimension_hierarchy -> Snowflake", priority: "high", description: "Vena dimension hierarchy reference data", businessFunction: "Financial Planning", slaHours: 8, enabled: false },
  { platform: "AIRBYTE", jobName: "vena_snowflake_forecast -> Snowflake", priority: "high", description: "Vena financial forecast data", businessFunction: "Financial Planning", slaHours: 8, enabled: false },
  { platform: "DATABRICKS", jobName: "BDSA Daily Ingestion", priority: "high", description: "Daily ingestion of Bitro data into Snowflake", businessFunction: "Data Ingestion", slaHours: 4, enabled: false },
  { platform: "DATABRICKS", jobName: "Kognitiv Daily Data Ingestion", priority: "high", description: "Quality and compliance data ingestion from Regulate platform", businessFunction: "Quality & Compliance", slaHours: 4, enabled: false },
  { platform: "DATABRICKS", jobName: "Price Alerting", priority: "high", description: "Scheduled price alerting and monitoring job", businessFunction: "Pricing & Analytics", slaHours: 4, enabled: false },
  { platform: "DATABRICKS", jobName: "Windy City Stores LL Daily Ingestion", priority: "medium", description: "Daily ingestion of Windy City Strains dispensary data", businessFunction: "Data Ingestion / Retail", slaHours: 6, enabled: false },
  { platform: "DATABRICKS", jobName: "Wurk Saved Reports Weekly Ingestion", priority: "medium", description: "Weekly ingestion of saved search data", businessFunction: "Analytics", slaHours: 8, enabled: false },
  { platform: "DBT_CLOUD", jobName: "Dutchie Inventory Snapshot Ad Hoc Refresh", priority: "high", description: "Nightly dutchie inventory snapshot", businessFunction: "Analytics", slaHours: 2, enabled: false },
  { platform: "DBT_CLOUD", jobName: "Full Project Test", priority: "medium", description: "Bi-weekly full project test", businessFunction: "Analytics", slaHours: 4, enabled: false },
  { platform: "DBT_CLOUD", jobName: "Production Ad Hoc", priority: "medium", description: "Ad hoc production runs", businessFunction: "Analytics", slaHours: 0, enabled: false },
  { platform: "DBT_CLOUD", jobName: "Production CD Job", priority: "high", description: "CD job on merge to main", businessFunction: "Analytics", slaHours: 2, enabled: false },
  { platform: "DBT_CLOUD", jobName: "Production CI", priority: "medium", description: "CI job on PR against main", businessFunction: "Analytics", slaHours: 0, enabled: false },
  { platform: "DBT_CLOUD", jobName: "dbt PROD Nightly Run", priority: "high", description: "Main nightly Production job", businessFunction: "Analytics", slaHours: 2, enabled: false },
  { platform: "POWER_AUTOMATE", jobName: "Bitly API Ingestion Orchestrator", priority: "high", description: "Scheduled orchestration flow for Bitly API data ingestion", businessFunction: "Data Ingestion", slaHours: 2, enabled: true, solutionId: "ADO97489", solutionName: "ADO97489- Bitly API Ingestion", category: "orchestration", flowType: "scheduled" },
  { platform: "POWER_AUTOMATE", jobName: "Bitly Bitlink Clicks Ingestion", priority: "medium", description: "Ingests Bitly bitlink click analytics data", businessFunction: "Data Ingestion", slaHours: 2, enabled: true, solutionId: "ADO97489", solutionName: "ADO97489- Bitly API Ingestion", category: "ingestion", flowType: "instant" },
  { platform: "POWER_AUTOMATE", jobName: "Bitly Bitlinks Ingestion", priority: "medium", description: "Ingests Bitly shortened link metadata", businessFunction: "Data Ingestion", slaHours: 2, enabled: true, solutionId: "ADO97489", solutionName: "ADO97489- Bitly API Ingestion", category: "ingestion", flowType: "instant" },
  { platform: "POWER_AUTOMATE", jobName: "Bitly Campaigns Ingestion", priority: "medium", description: "Ingests Bitly campaign data", businessFunction: "Data Ingestion", slaHours: 2, enabled: true, solutionId: "ADO97489", solutionName: "ADO97489- Bitly API Ingestion", category: "ingestion", flowType: "instant" },
  { platform: "POWER_AUTOMATE", jobName: "Bitly Groups Ingestion", priority: "medium", description: "Ingests Bitly group configuration data", businessFunction: "Data Ingestion", slaHours: 2, enabled: true, solutionId: "ADO97489", solutionName: "ADO97489- Bitly API Ingestion", category: "ingestion", flowType: "instant" },
  { platform: "POWER_AUTOMATE", jobName: "Bitly QR Code Scans Ingestion", priority: "medium", description: "Ingests Bitly QR code scan analytics", businessFunction: "Data Ingestion", slaHours: 2, enabled: true, solutionId: "ADO97489", solutionName: "ADO97489- Bitly API Ingestion", category: "ingestion", flowType: "instant" },
  { platform: "POWER_AUTOMATE", jobName: "Bitly QR Codes Ingestion", priority: "medium", description: "Ingests Bitly QR code metadata", businessFunction: "Data Ingestion", slaHours: 2, enabled: true, solutionId: "ADO97489", solutionName: "ADO97489- Bitly API Ingestion", category: "ingestion", flowType: "instant" },
  { platform: "POWER_AUTOMATE", jobName: "Costing File Archive", priority: "low", description: "Archives processed costing source file", businessFunction: "Data Ingestion", slaHours: 4, enabled: true, solutionId: "ADO81979", solutionName: "ADO81979- Costing Files from Sharepoint", category: "archival", flowType: "instant" },
  { platform: "POWER_AUTOMATE", jobName: "Costing File Availability Check", priority: "medium", description: "Checks SharePoint for costing source file availability", businessFunction: "Data Ingestion", slaHours: 2, enabled: true, solutionId: "ADO81979", solutionName: "ADO81979- Costing Files from Sharepoint", category: "validation", flowType: "instant" },
  { platform: "POWER_AUTOMATE", jobName: "Costing File Copy to Blob", priority: "medium", description: "Copies costing file from SharePoint into Azure Blob", businessFunction: "Data Ingestion", slaHours: 2, enabled: true, solutionId: "ADO81979", solutionName: "ADO81979- Costing Files from Sharepoint", category: "data_movement", flowType: "instant" },
  { platform: "POWER_AUTOMATE", jobName: "Costing File Ingestion Orchestrator", priority: "high", description: "Automated orchestration flow for costing file ingestion", businessFunction: "Data Ingestion", slaHours: 2, enabled: true, solutionId: "ADO81979", solutionName: "ADO81979- Costing Files from Sharepoint", category: "orchestration", flowType: "automated" },
  { platform: "POWER_AUTOMATE", jobName: "Flower Quality Scorecard", priority: "high", description: "Automated flower quality scorecard report", businessFunction: "Reporting", slaHours: 2, enabled: true, solutionId: "ADO82674", solutionName: "ADO82674- Flower Quality Scorecard", category: "reporting", flowType: "automated" },
  { platform: "POWER_AUTOMATE", jobName: "Fresh Service CIRF Ingestion", priority: "medium", description: "Ingests Fresh Service CIRF report data", businessFunction: "Data Ingestion", slaHours: 2, enabled: true, solutionId: "ADO83733", solutionName: "ADO83733- Fresh Service Ingestion", category: "ingestion", flowType: "instant" },
  { platform: "POWER_AUTOMATE", jobName: "Fresh Service Ingestion Orchestrator", priority: "high", description: "Scheduled orchestration flow for Fresh Service data ingestion", businessFunction: "Data Ingestion", slaHours: 2, enabled: true, solutionId: "ADO83733", solutionName: "ADO83733- Fresh Service Ingestion", category: "orchestration", flowType: "scheduled" },
  { platform: "POWER_AUTOMATE", jobName: "Fresh Service PIR Ingestion", priority: "medium", description: "Ingests Fresh Service PIR report data", businessFunction: "Data Ingestion", slaHours: 2, enabled: true, solutionId: "ADO83733", solutionName: "ADO83733- Fresh Service Ingestion", category: "ingestion", flowType: "instant" },
  { platform: "POWER_AUTOMATE", jobName: "Grow Customer Experience Snapshot", priority: "high", description: "Automated customer experience snapshot report", businessFunction: "Reporting", slaHours: 2, enabled: true, solutionId: "ADO92691", solutionName: "ADO92691-Grow Plus Customer Experience Snapshot", category: "reporting", flowType: "automated" },
  { platform: "POWER_AUTOMATE", jobName: "Location Compliance Archive File", priority: "low", description: "Archives processed location compliance source file", businessFunction: "Data Ingestion", slaHours: 4, enabled: true, solutionId: "ADO82168", solutionName: "ADO82168- Location Compliance File from Sharepoint", category: "archival", flowType: "instant" },
  { platform: "POWER_AUTOMATE", jobName: "Location Compliance Copy to Blob", priority: "medium", description: "Copies location compliance file from SharePoint into Azure Blob", businessFunction: "Data Ingestion", slaHours: 2, enabled: true, solutionId: "ADO82168", solutionName: "ADO82168- Location Compliance File from Sharepoint", category: "data_movement", flowType: "instant" },
  { platform: "POWER_AUTOMATE", jobName: "Location Compliance Excel Split", priority: "medium", description: "Splits location compliance Excel file into processable segments", businessFunction: "Data Ingestion", slaHours: 2, enabled: true, solutionId: "ADO82168", solutionName: "ADO82168- Location Compliance File from Sharepoint", category: "transformation", flowType: "instant" },
  { platform: "POWER_AUTOMATE", jobName: "Location Compliance File Check", priority: "medium", description: "Checks SharePoint for location compliance file availability", businessFunction: "Data Ingestion", slaHours: 2, enabled: true, solutionId: "ADO82168", solutionName: "ADO82168- Location Compliance File from Sharepoint", category: "validation", flowType: "instant" },
  { platform: "POWER_AUTOMATE", jobName: "Location Compliance Ingestion Orchestrator", priority: "high", description: "Scheduled orchestration flow for location compliance file ingestion", businessFunction: "Data Ingestion", slaHours: 2, enabled: true, solutionId: "ADO82168", solutionName: "ADO82168- Location Compliance File from Sharepoint", category: "orchestration", flowType: "scheduled" },
  { platform: "POWER_AUTOMATE", jobName: "Product Standard Archive File", priority: "low", description: "Archives processed source file", businessFunction: "Data Ingestion", slaHours: 4, enabled: true, solutionId: "ADO92961", solutionName: "ADO92961- Product Standard File Ingestion", category: "archival", flowType: "instant" },
  { platform: "POWER_AUTOMATE", jobName: "Product Standard Check File Availability", priority: "medium", description: "Checks SharePoint for source file availability", businessFunction: "Data Ingestion", slaHours: 2, enabled: true, solutionId: "ADO92961", solutionName: "ADO92961- Product Standard File Ingestion", category: "validation", flowType: "instant" },
  { platform: "POWER_AUTOMATE", jobName: "Product Standard Copy SharePoint to Blob", priority: "medium", description: "Copies source file from SharePoint into Azure Blob", businessFunction: "Data Ingestion", slaHours: 2, enabled: true, solutionId: "ADO92961", solutionName: "ADO92961- Product Standard File Ingestion", category: "data_movement", flowType: "instant" },
  { platform: "POWER_AUTOMATE", jobName: "Product Standard Excel to CSV", priority: "medium", description: "Converts Excel source to CSV format", businessFunction: "Data Ingestion", slaHours: 2, enabled: true, solutionId: "ADO92961", solutionName: "ADO92961- Product Standard File Ingestion", category: "transformation", flowType: "instant" },
  { platform: "POWER_AUTOMATE", jobName: "Product Standard File Ingestion", priority: "high", description: "Scheduled orchestration flow for product standard file ingestion", businessFunction: "Data Ingestion", slaHours: 2, enabled: true, solutionId: "ADO92961", solutionName: "ADO92961- Product Standard File Ingestion", category: "orchestration", flowType: "scheduled" },
  { platform: "POWER_AUTOMATE", jobName: "Security Copy SharePoint to Blob", priority: "medium", description: "Copies security file from SharePoint into Azure Blob", businessFunction: "Data Ingestion", slaHours: 2, enabled: true, solutionId: "ADO82472", solutionName: "ADO82472- Security Files from Sharepoint", category: "data_movement", flowType: "instant" },
  { platform: "POWER_AUTOMATE", jobName: "Security Excel to CSV", priority: "medium", description: "Converts security Excel source to CSV format", businessFunction: "Data Ingestion", slaHours: 2, enabled: true, solutionId: "ADO82472", solutionName: "ADO82472- Security Files from Sharepoint", category: "transformation", flowType: "instant" },
  { platform: "POWER_AUTOMATE", jobName: "Security File Archive", priority: "low", description: "Archives processed security source file", businessFunction: "Data Ingestion", slaHours: 4, enabled: true, solutionId: "ADO82472", solutionName: "ADO82472- Security Files from Sharepoint", category: "archival", flowType: "instant" },
  { platform: "POWER_AUTOMATE", jobName: "Security File Availability Check", priority: "medium", description: "Checks SharePoint for security source file availability", businessFunction: "Data Ingestion", slaHours: 2, enabled: true, solutionId: "ADO82472", solutionName: "ADO82472- Security Files from Sharepoint", category: "validation", flowType: "instant" },
  { platform: "POWER_AUTOMATE", jobName: "Security File Ingestion Orchestrator", priority: "high", description: "Scheduled orchestration flow for security file ingestion from SharePoint", businessFunction: "Data Ingestion", slaHours: 2, enabled: true, solutionId: "ADO82472", solutionName: "ADO82472- Security Files from Sharepoint", category: "orchestration", flowType: "scheduled" },
  { platform: "POWER_AUTOMATE", jobName: "SharePoint Site Index Ingestion", priority: "high", description: "Scheduled ingestion of SharePoint site index list items", businessFunction: "Data Ingestion", slaHours: 2, enabled: true, solutionId: "ADO83364", solutionName: "ADO83364- Sharepoint Site Index List Item", category: "ingestion", flowType: "scheduled" },
  { platform: "POWER_AUTOMATE", jobName: "Wholesale Mapping Archive File", priority: "low", description: "Archives processed wholesale mapping source file", businessFunction: "Data Ingestion", slaHours: 4, enabled: true, solutionId: "ADO81977/84908/84910", solutionName: "ADO81977/84908/84910- Wholesale Mapping Files Ingestion", category: "archival", flowType: "instant" },
  { platform: "POWER_AUTOMATE", jobName: "Wholesale Mapping Copy to Blob", priority: "medium", description: "Copies wholesale mapping file from SharePoint into Azure Blob", businessFunction: "Data Ingestion", slaHours: 2, enabled: true, solutionId: "ADO81977/84908/84910", solutionName: "ADO81977/84908/84910- Wholesale Mapping Files Ingestion", category: "data_movement", flowType: "instant" },
  { platform: "POWER_AUTOMATE", jobName: "Wholesale Mapping File Check", priority: "medium", description: "Checks SharePoint for wholesale mapping file availability", businessFunction: "Data Ingestion", slaHours: 2, enabled: true, solutionId: "ADO81977/84908/84910", solutionName: "ADO81977/84908/84910- Wholesale Mapping Files Ingestion", category: "validation", flowType: "instant" },
  { platform: "POWER_AUTOMATE", jobName: "Wholesale Mapping Ingestion Orchestrator", priority: "high", description: "Scheduled orchestration flow for wholesale mapping file ingestion", businessFunction: "Data Ingestion", slaHours: 2, enabled: true, solutionId: "ADO81977/84908/84910", solutionName: "ADO81977/84908/84910- Wholesale Mapping Files Ingestion", category: "orchestration", flowType: "scheduled" },
  { platform: "SNOWFLAKE", jobName: "Accounting distribution template configurations", priority: "high", description: "Accounting distribution template configurations", businessFunction: "Financial Accounting", slaHours: 3, enabled: false },
  { platform: "SNOWFLAKE", jobName: "Agreement header master data", priority: "medium", description: "Agreement header master data", businessFunction: "Contract Management", slaHours: 6, enabled: false },
  { platform: "SNOWFLAKE", jobName: "Asset lease detail records", priority: "medium", description: "Asset lease detail records", businessFunction: "Asset Management", slaHours: 4, enabled: false },
  { platform: "SNOWFLAKE", jobName: "Bank account master data", priority: "high", description: "Bank account master data", businessFunction: "Banking", slaHours: 3, enabled: false },
  { platform: "SNOWFLAKE", jobName: "Brazil CFOP fiscal operations table - regional com", priority: "high", description: "Brazil CFOP fiscal operations table - regional compliance", businessFunction: "Tax & Compliance - Brazil", slaHours: 2, enabled: false },
  { platform: "SNOWFLAKE", jobName: "Brazil fiscal establishment configuration", priority: "high", description: "Brazil fiscal establishment configuration", businessFunction: "Tax & Compliance - Brazil", slaHours: 2, enabled: false },
  { platform: "SNOWFLAKE", jobName: "Brazil tax substitution codes - regional complianc", priority: "high", description: "Brazil tax substitution codes - regional compliance", businessFunction: "Tax & Compliance - Brazil", slaHours: 2, enabled: false },
  { platform: "SNOWFLAKE", jobName: "Business relations table for CRM", priority: "medium", description: "Business relations table for CRM", businessFunction: "CRM", slaHours: 6, enabled: false },
  { platform: "SNOWFLAKE", jobName: "CRM marketing campaign table", priority: "medium", description: "CRM marketing campaign table", businessFunction: "CRM", slaHours: 6, enabled: false },
  { platform: "SNOWFLAKE", jobName: "Call center inventory table extensions", priority: "medium", description: "Call center inventory table extensions", businessFunction: "Call Center", slaHours: 4, enabled: false },
  { platform: "SNOWFLAKE", jobName: "Category hierarchy role assignments", priority: "high", description: "Category hierarchy role assignments", businessFunction: "Product Management", slaHours: 3, enabled: false },
  { platform: "SNOWFLAKE", jobName: "China ledger voucher type configuration - regional", priority: "high", description: "China ledger voucher type configuration - regional compliance", businessFunction: "General Ledger - China", slaHours: 2, enabled: false },
  { platform: "SNOWFLAKE", jobName: "Company NAF code classification", priority: "low", description: "Company NAF code classification", businessFunction: "Company Master Data", slaHours: 8, enabled: false },
  { platform: "SNOWFLAKE", jobName: "Company master information and legal entities", priority: "high", description: "Company master information and legal entities", businessFunction: "Company Master Data", slaHours: 3, enabled: false },
  { platform: "SNOWFLAKE", jobName: "Core logistics location records", priority: "high", description: "Core logistics location records", businessFunction: "Logistics & Address", slaHours: 3, enabled: false },
  { platform: "SNOWFLAKE", jobName: "Core product master table", priority: "high", description: "Core product master table", businessFunction: "Product Management", slaHours: 3, enabled: false },
  { platform: "SNOWFLAKE", jobName: "Country/region name translations", priority: "high", description: "Country/region name translations", businessFunction: "Logistics & Address", slaHours: 3, enabled: false },
  { platform: "SNOWFLAKE", jobName: "Country/region reference data", priority: "high", description: "Country/region reference data", businessFunction: "Logistics & Address", slaHours: 3, enabled: false },
  { platform: "SNOWFLAKE", jobName: "Curaleaf inventory table cross-reference", priority: "medium", description: "Curaleaf inventory table cross-reference", businessFunction: "Inventory Management", slaHours: 4, enabled: false },
  { platform: "SNOWFLAKE", jobName: "Curaleaf retail account mapping custom table", priority: "medium", description: "Curaleaf retail account mapping custom table", businessFunction: "Curaleaf Custom", slaHours: 4, enabled: false },
  { platform: "SNOWFLAKE", jobName: "Customer group classifications", priority: "high", description: "Customer group classifications", businessFunction: "Accounts Receivable", slaHours: 3, enabled: false },
  { platform: "SNOWFLAKE", jobName: "Customer master data - core AR reference", priority: "critical", description: "Customer master data - core AR reference", businessFunction: "Accounts Receivable", slaHours: 2, enabled: false },
  { platform: "SNOWFLAKE", jobName: "Customer/vendor post-dated check register", priority: "medium", description: "Customer/vendor post-dated check register", businessFunction: "Accounts Payable/Receivable", slaHours: 4, enabled: false },
  { platform: "SNOWFLAKE", jobName: "DUNS number directory records", priority: "medium", description: "DUNS number directory records", businessFunction: "Master Data", slaHours: 6, enabled: false },
  { platform: "SNOWFLAKE", jobName: "Dimension attribute directory category mappings", priority: "high", description: "Dimension attribute directory category mappings", businessFunction: "Financial Dimensions", slaHours: 3, enabled: false },
  { platform: "SNOWFLAKE", jobName: "Directory name affixes (prefixes/suffixes)", priority: "low", description: "Directory name affixes (prefixes/suffixes)", businessFunction: "Master Data", slaHours: 12, enabled: false },
  { platform: "SNOWFLAKE", jobName: "Directory party table - core entity master data", priority: "critical", description: "Directory party table - core entity master data", businessFunction: "Master Data", slaHours: 1, enabled: false },
  { platform: "SNOWFLAKE", jobName: "Electronic address records (email, phone, URL)", priority: "high", description: "Electronic address records (email, phone, URL)", businessFunction: "Logistics & Address", slaHours: 3, enabled: false },
  { platform: "SNOWFLAKE", jobName: "Employee employment records and history", priority: "medium", description: "Employee employment records and history", businessFunction: "Human Resources", slaHours: 4, enabled: false },
  { platform: "SNOWFLAKE", jobName: "Engineering change product versions", priority: "medium", description: "Engineering change product versions", businessFunction: "Engineering Change Management", slaHours: 4, enabled: false },
  { platform: "SNOWFLAKE", jobName: "Engineering change released product version attrib", priority: "medium", description: "Engineering change released product version attributes", businessFunction: "Engineering Change Management", slaHours: 4, enabled: false },
  { platform: "SNOWFLAKE", jobName: "Engineering change released product versions", priority: "medium", description: "Engineering change released product versions", businessFunction: "Engineering Change Management", slaHours: 4, enabled: false },
  { platform: "SNOWFLAKE", jobName: "Expense/revenue deferrals table", priority: "medium", description: "Expense/revenue deferrals table", businessFunction: "Financial Revenue Recognition", slaHours: 4, enabled: false },
  { platform: "SNOWFLAKE", jobName: "Financial dimension attribute definitions", priority: "high", description: "Financial dimension attribute definitions", businessFunction: "Financial Dimensions", slaHours: 3, enabled: false },
  { platform: "SNOWFLAKE", jobName: "Financial dimension attribute value sets", priority: "high", description: "Financial dimension attribute value sets", businessFunction: "Financial Dimensions", slaHours: 2, enabled: false },
  { platform: "SNOWFLAKE", jobName: "Financial dimension attribute values - core refere", priority: "high", description: "Financial dimension attribute values - core reference data", businessFunction: "Financial Dimensions", slaHours: 2, enabled: false },
  { platform: "SNOWFLAKE", jobName: "Financial dimension combinations - critical for GL", priority: "critical", description: "Financial dimension combinations - critical for GL postings", businessFunction: "Financial Dimensions", slaHours: 1, enabled: false },
  { platform: "SNOWFLAKE", jobName: "Financial dimension hierarchies and structure", priority: "high", description: "Financial dimension hierarchies and structure", businessFunction: "Financial Dimensions", slaHours: 3, enabled: false },
  { platform: "SNOWFLAKE", jobName: "Financial dimension hierarchy integration mappings", priority: "high", description: "Financial dimension hierarchy integration mappings", businessFunction: "Financial Dimensions", slaHours: 3, enabled: false },
  { platform: "SNOWFLAKE", jobName: "Financial dimension hierarchy level definitions", priority: "high", description: "Financial dimension hierarchy level definitions", businessFunction: "Financial Dimensions", slaHours: 3, enabled: false },
  { platform: "SNOWFLAKE", jobName: "Financial dimension parameters and configuration", priority: "high", description: "Financial dimension parameters and configuration", businessFunction: "Financial Dimensions", slaHours: 3, enabled: false },
  { platform: "SNOWFLAKE", jobName: "Financial dimension tags for categorization", priority: "high", description: "Financial dimension tags for categorization", businessFunction: "Financial Dimensions", slaHours: 3, enabled: false },
  { platform: "SNOWFLAKE", jobName: "Financial tag dimension values", priority: "high", description: "Financial tag dimension values", businessFunction: "Financial Dimensions", slaHours: 3, enabled: false },
  { platform: "SNOWFLAKE", jobName: "Fixed asset group classifications", priority: "medium", description: "Fixed asset group classifications", businessFunction: "Asset Management", slaHours: 4, enabled: false },
  { platform: "SNOWFLAKE", jobName: "Fixed assets master table", priority: "high", description: "Fixed assets master table", businessFunction: "Asset Management", slaHours: 3, enabled: false },
  { platform: "SNOWFLAKE", jobName: "Fixed assets staging table", priority: "medium", description: "Fixed assets staging table", businessFunction: "Asset Management", slaHours: 4, enabled: false },
  { platform: "SNOWFLAKE", jobName: "Florida Dept of Health - MMTC", priority: "high", description: "The table contains records of data processing events, specifically tracking the execution of data loads. Each record represents a single load event and includes details about the execution time, report date, and processing status.", businessFunction: "Retail Compliance", slaHours: 2, enabled: true },
  { platform: "SNOWFLAKE", jobName: "France NGP classification codes", priority: "medium", description: "France NGP classification codes", businessFunction: "Tax & Compliance - France", slaHours: 4, enabled: false },
  { platform: "SNOWFLAKE", jobName: "General journal account entries - core financial t", priority: "critical", description: "General journal account entries - core financial transactions", businessFunction: "General Ledger", slaHours: 1, enabled: false },
  { platform: "SNOWFLAKE", jobName: "General journal entry headers - core financial pos", priority: "critical", description: "General journal entry headers - core financial postings", businessFunction: "General Ledger", slaHours: 1, enabled: false },
  { platform: "SNOWFLAKE", jobName: "German DTAZV payment message table", priority: "medium", description: "German DTAZV payment message table", businessFunction: "Payments - Germany", slaHours: 4, enabled: false },
  { platform: "SNOWFLAKE", jobName: "HR job master definitions", priority: "medium", description: "HR job master definitions", businessFunction: "Human Resources", slaHours: 4, enabled: false },
  { platform: "SNOWFLAKE", jobName: "HR position detail records", priority: "medium", description: "HR position detail records", businessFunction: "Human Resources", slaHours: 4, enabled: false },
  { platform: "SNOWFLAKE", jobName: "HR position master records", priority: "medium", description: "HR position master records", businessFunction: "Human Resources", slaHours: 4, enabled: false },
  { platform: "SNOWFLAKE", jobName: "Human capital worker/employee master data", priority: "medium", description: "Human capital worker/employee master data", businessFunction: "Human Resources", slaHours: 6, enabled: false },
  { platform: "SNOWFLAKE", jobName: "ICEBERG Table Refresh", priority: "high", description: "Registry of FnO entities synced to Iceberg tables via Synapse Link", businessFunction: "Data Platform - Iceberg", slaHours: 1, enabled: true },
  { platform: "SNOWFLAKE", jobName: "Iceland vendor invoice declaration", priority: "medium", description: "Iceland vendor invoice declaration", businessFunction: "Accounts Payable - Iceland", slaHours: 4, enabled: false },
  { platform: "SNOWFLAKE", jobName: "India HSN code table - GST compliance", priority: "high", description: "India HSN code table - GST compliance", businessFunction: "Tax & Compliance - India", slaHours: 2, enabled: false },
  { platform: "SNOWFLAKE", jobName: "India customs tariff code table", priority: "high", description: "India customs tariff code table", businessFunction: "Tax & Compliance - India", slaHours: 2, enabled: false },
  { platform: "SNOWFLAKE", jobName: "India service accounting code table - GST complian", priority: "high", description: "India service accounting code table - GST compliance", businessFunction: "Tax & Compliance - India", slaHours: 2, enabled: false },
  { platform: "SNOWFLAKE", jobName: "India vendor invoice line tax extensions - GST com", priority: "high", description: "India vendor invoice line tax extensions - GST compliance", businessFunction: "Tax & Compliance - India", slaHours: 2, enabled: false },
  { platform: "SNOWFLAKE", jobName: "India vendor tax information - GST compliance", priority: "high", description: "India vendor tax information - GST compliance", businessFunction: "Tax & Compliance - India", slaHours: 2, enabled: false },
  { platform: "SNOWFLAKE", jobName: "Inventory counting reason code policies", priority: "medium", description: "Inventory counting reason code policies", businessFunction: "Inventory Management", slaHours: 4, enabled: false },
  { platform: "SNOWFLAKE", jobName: "Inventory dimension combinations (released product", priority: "critical", description: "Inventory dimension combinations (released products)", businessFunction: "Inventory Management", slaHours: 2, enabled: false },
  { platform: "SNOWFLAKE", jobName: "Inventory dimensions - critical for inventory trac", priority: "critical", description: "Inventory dimensions - critical for inventory tracking", businessFunction: "Inventory Management", slaHours: 2, enabled: false },
  { platform: "SNOWFLAKE", jobName: "Inventory item default inventory settings", priority: "high", description: "Inventory item default inventory settings", businessFunction: "Inventory Management", slaHours: 3, enabled: false },
  { platform: "SNOWFLAKE", jobName: "Inventory item group definitions", priority: "high", description: "Inventory item group definitions", businessFunction: "Inventory Management", slaHours: 3, enabled: false },
  { platform: "SNOWFLAKE", jobName: "Inventory item group item assignments", priority: "high", description: "Inventory item group item assignments", businessFunction: "Inventory Management", slaHours: 3, enabled: false },
  { platform: "SNOWFLAKE", jobName: "Inventory item master table - core product referen", priority: "critical", description: "Inventory item master table - core product reference", businessFunction: "Inventory Management", slaHours: 2, enabled: false },
  { platform: "SNOWFLAKE", jobName: "Inventory item pricing records", priority: "high", description: "Inventory item pricing records", businessFunction: "Inventory Management", slaHours: 3, enabled: false },
  { platform: "SNOWFLAKE", jobName: "Inventory item purchase setup defaults", priority: "high", description: "Inventory item purchase setup defaults", businessFunction: "Inventory Management", slaHours: 3, enabled: false },
  { platform: "SNOWFLAKE", jobName: "Inventory item sales setup defaults", priority: "high", description: "Inventory item sales setup defaults", businessFunction: "Inventory Management", slaHours: 3, enabled: false },
  { platform: "SNOWFLAKE", jobName: "Inventory item supply type setup", priority: "high", description: "Inventory item supply type setup", businessFunction: "Inventory Management", slaHours: 3, enabled: false },
  { platform: "SNOWFLAKE", jobName: "Inventory model group item assignments", priority: "high", description: "Inventory model group item assignments", businessFunction: "Inventory Management", slaHours: 3, enabled: false },
  { platform: "SNOWFLAKE", jobName: "Inventory site master data", priority: "high", description: "Inventory site master data", businessFunction: "Inventory Management", slaHours: 3, enabled: false },
  { platform: "SNOWFLAKE", jobName: "Inventory table counting reason code policy assign", priority: "critical", description: "Inventory table counting reason code policy assignments", businessFunction: "Inventory Management", slaHours: 2, enabled: false },
  { platform: "SNOWFLAKE", jobName: "Inventory table module settings - product pricing/", priority: "high", description: "Inventory table module settings - product pricing/costs", businessFunction: "Inventory Management", slaHours: 3, enabled: false },
  { platform: "SNOWFLAKE", jobName: "Inventory warehouse/location master data", priority: "high", description: "Inventory warehouse/location master data", businessFunction: "Inventory Management", slaHours: 3, enabled: false },
  { platform: "SNOWFLAKE", jobName: "Job detail records for HR positions", priority: "medium", description: "Job detail records for HR positions", businessFunction: "Human Resources", slaHours: 4, enabled: false },
  { platform: "SNOWFLAKE", jobName: "Language configuration table", priority: "low", description: "Language configuration table", businessFunction: "System Configuration", slaHours: 12, enabled: false },
  { platform: "SNOWFLAKE", jobName: "Ledger configuration and setup", priority: "high", description: "Ledger configuration and setup", businessFunction: "General Ledger", slaHours: 2, enabled: false },
  { platform: "SNOWFLAKE", jobName: "Ledger fund definitions", priority: "high", description: "Ledger fund definitions", businessFunction: "General Ledger", slaHours: 3, enabled: false },
  { platform: "SNOWFLAKE", jobName: "Ledger journal headers - parent of journal transac", priority: "critical", description: "Ledger journal headers - parent of journal transactions", businessFunction: "General Ledger", slaHours: 1, enabled: false },
  { platform: "SNOWFLAKE", jobName: "Ledger journal table - regional extensions", priority: "critical", description: "Ledger journal table - regional extensions", businessFunction: "General Ledger", slaHours: 1, enabled: false },
  { platform: "SNOWFLAKE", jobName: "Ledger journal transaction tax extensions", priority: "critical", description: "Ledger journal transaction tax extensions", businessFunction: "General Ledger", slaHours: 1, enabled: false },
  { platform: "SNOWFLAKE", jobName: "Ledger journal transactions - asset entries", priority: "critical", description: "Ledger journal transactions - asset entries", businessFunction: "General Ledger", slaHours: 1, enabled: false },
  { platform: "SNOWFLAKE", jobName: "Ledger journal transactions - core GL transactions", priority: "critical", description: "Ledger journal transactions - core GL transactions", businessFunction: "General Ledger", slaHours: 1, enabled: false },
  { platform: "SNOWFLAKE", jobName: "Ledger journal transactions - regional extensions", priority: "critical", description: "Ledger journal transactions - regional extensions", businessFunction: "General Ledger", slaHours: 1, enabled: false },
  { platform: "SNOWFLAKE", jobName: "Logistics location extensions", priority: "high", description: "Logistics location extensions", businessFunction: "Logistics & Address", slaHours: 3, enabled: false },
  { platform: "SNOWFLAKE", jobName: "Main account chart of accounts - core financial re", priority: "critical", description: "Main account chart of accounts - core financial reference", businessFunction: "General Ledger", slaHours: 1, enabled: false },
  { platform: "SNOWFLAKE", jobName: "Malaysia GST relief category - regional compliance", priority: "high", description: "Malaysia GST relief category - regional compliance", businessFunction: "Tax & Compliance - Malaysia", slaHours: 2, enabled: false },
  { platform: "SNOWFLAKE", jobName: "Organization operating unit definitions", priority: "medium", description: "Organization operating unit definitions", businessFunction: "Organization Management", slaHours: 4, enabled: false },
  { platform: "SNOWFLAKE", jobName: "Organization team membership criteria", priority: "medium", description: "Organization team membership criteria", businessFunction: "Organization Management", slaHours: 4, enabled: false },
  { platform: "SNOWFLAKE", jobName: "Overall pipeline status validation task", priority: "critical", description: "Overall pipeline status validation task", businessFunction: "Data Pipeline Monitoring", slaHours: 1, enabled: false },
  { platform: "SNOWFLAKE", jobName: "Party-to-location associations", priority: "high", description: "Party-to-location associations", businessFunction: "Master Data", slaHours: 2, enabled: false },
  { platform: "SNOWFLAKE", jobName: "Payment transaction codes", priority: "medium", description: "Payment transaction codes", businessFunction: "Payments", slaHours: 4, enabled: false },
  { platform: "SNOWFLAKE", jobName: "Person name records for directory", priority: "high", description: "Person name records for directory", businessFunction: "Master Data", slaHours: 3, enabled: false },
  { platform: "SNOWFLAKE", jobName: "Postal/physical address records", priority: "high", description: "Postal/physical address records", businessFunction: "Logistics & Address", slaHours: 3, enabled: false },
  { platform: "SNOWFLAKE", jobName: "Process manufacturing catch weight items", priority: "medium", description: "Process manufacturing catch weight items", businessFunction: "Process Manufacturing", slaHours: 4, enabled: false },
  { platform: "SNOWFLAKE", jobName: "Product attribute definitions", priority: "high", description: "Product attribute definitions", businessFunction: "Product Management", slaHours: 3, enabled: false },
  { platform: "SNOWFLAKE", jobName: "Product attribute type definitions", priority: "high", description: "Product attribute type definitions", businessFunction: "Product Management", slaHours: 3, enabled: false },
  { platform: "SNOWFLAKE", jobName: "Product attribute value mappings", priority: "high", description: "Product attribute value mappings", businessFunction: "Product Management", slaHours: 3, enabled: false },
  { platform: "SNOWFLAKE", jobName: "Product attribute values", priority: "high", description: "Product attribute values", businessFunction: "Product Management", slaHours: 3, enabled: false },
  { platform: "SNOWFLAKE", jobName: "Product category definitions", priority: "high", description: "Product category definitions", businessFunction: "Product Management", slaHours: 3, enabled: false },
  { platform: "SNOWFLAKE", jobName: "Product category hierarchy definitions", priority: "high", description: "Product category hierarchy definitions", businessFunction: "Product Management", slaHours: 3, enabled: false },
  { platform: "SNOWFLAKE", jobName: "Product color dimension values", priority: "medium", description: "Product color dimension values", businessFunction: "Product Management", slaHours: 4, enabled: false },
  { platform: "SNOWFLAKE", jobName: "Product configuration dimension values", priority: "medium", description: "Product configuration dimension values", businessFunction: "Product Management", slaHours: 4, enabled: false },
  { platform: "SNOWFLAKE", jobName: "Product dimension group definitions", priority: "high", description: "Product dimension group definitions", businessFunction: "Product Management", slaHours: 3, enabled: false },
  { platform: "SNOWFLAKE", jobName: "Product dimension group product assignments", priority: "high", description: "Product dimension group product assignments", businessFunction: "Product Management", slaHours: 3, enabled: false },
  { platform: "SNOWFLAKE", jobName: "Product instance attribute values", priority: "high", description: "Product instance attribute values", businessFunction: "Product Management", slaHours: 3, enabled: false },
  { platform: "SNOWFLAKE", jobName: "Product master modeling policy settings", priority: "high", description: "Product master modeling policy settings", businessFunction: "Product Management", slaHours: 3, enabled: false },
  { platform: "SNOWFLAKE", jobName: "Product name/description translations", priority: "high", description: "Product name/description translations", businessFunction: "Product Management", slaHours: 3, enabled: false },
  { platform: "SNOWFLAKE", jobName: "Product service warranty configurations", priority: "medium", description: "Product service warranty configurations", businessFunction: "Product Management", slaHours: 6, enabled: false },
  { platform: "SNOWFLAKE", jobName: "Product size dimension values", priority: "medium", description: "Product size dimension values", businessFunction: "Product Management", slaHours: 4, enabled: false },
  { platform: "SNOWFLAKE", jobName: "Product style dimension values", priority: "medium", description: "Product style dimension values", businessFunction: "Product Management", slaHours: 4, enabled: false },
  { platform: "SNOWFLAKE", jobName: "Product tracking dimension group definitions", priority: "high", description: "Product tracking dimension group definitions", businessFunction: "Product Management", slaHours: 3, enabled: false },
  { platform: "SNOWFLAKE", jobName: "Product variant dimension value combinations", priority: "high", description: "Product variant dimension value combinations", businessFunction: "Product Management", slaHours: 3, enabled: false },
  { platform: "SNOWFLAKE", jobName: "Product version dimension values", priority: "medium", description: "Product version dimension values", businessFunction: "Product Management", slaHours: 4, enabled: false },
  { platform: "SNOWFLAKE", jobName: "Product-to-category assignments", priority: "high", description: "Product-to-category assignments", businessFunction: "Product Management", slaHours: 3, enabled: false },
  { platform: "SNOWFLAKE", jobName: "Project group classifications", priority: "medium", description: "Project group classifications", businessFunction: "Project Management", slaHours: 4, enabled: false },
  { platform: "SNOWFLAKE", jobName: "Project invoice header records", priority: "high", description: "Project invoice header records", businessFunction: "Project Management", slaHours: 3, enabled: false },
  { platform: "SNOWFLAKE", jobName: "Project master table", priority: "high", description: "Project master table", businessFunction: "Project Management", slaHours: 3, enabled: false },
  { platform: "SNOWFLAKE", jobName: "Public sector budget reservation headers", priority: "high", description: "Public sector budget reservation headers", businessFunction: "Budgeting - Public Sector", slaHours: 3, enabled: false },
  { platform: "SNOWFLAKE", jobName: "Public sector budget reservation line items", priority: "high", description: "Public sector budget reservation line items", businessFunction: "Budgeting - Public Sector", slaHours: 3, enabled: false },
  { platform: "SNOWFLAKE", jobName: "Purchase journal auto-summary configuration", priority: "high", description: "Purchase journal auto-summary configuration", businessFunction: "Procurement", slaHours: 3, enabled: false },
  { platform: "SNOWFLAKE", jobName: "Retail POS terminal definitions", priority: "high", description: "Retail POS terminal definitions", businessFunction: "Retail Operations", slaHours: 3, enabled: false },
  { platform: "SNOWFLAKE", jobName: "Retail channel definitions and configuration", priority: "high", description: "Retail channel definitions and configuration", businessFunction: "Retail Operations", slaHours: 3, enabled: false },
  { platform: "SNOWFLAKE", jobName: "Retail inventory table extensions", priority: "high", description: "Retail inventory table extensions", businessFunction: "Retail Operations", slaHours: 3, enabled: false },
  { platform: "SNOWFLAKE", jobName: "Retail product kit configurations", priority: "high", description: "Retail product kit configurations", businessFunction: "Retail Operations", slaHours: 3, enabled: false },
  { platform: "SNOWFLAKE", jobName: "Retail store definitions and configuration", priority: "high", description: "Retail store definitions and configuration", businessFunction: "Retail Operations", slaHours: 3, enabled: false },
  { platform: "SNOWFLAKE", jobName: "Retail vendor table extensions", priority: "high", description: "Retail vendor table extensions", businessFunction: "Retail Operations", slaHours: 3, enabled: false },
  { platform: "SNOWFLAKE", jobName: "Revenue deferral staging table load", priority: "medium", description: "Revenue deferral staging table load", businessFunction: "Financial Revenue Recognition", slaHours: 4, enabled: false },
  { platform: "SNOWFLAKE", jobName: "Russia agreement header extensions", priority: "medium", description: "Russia agreement header extensions", businessFunction: "Contract Management - Russia", slaHours: 6, enabled: false },
  { platform: "SNOWFLAKE", jobName: "Russia cash management table", priority: "medium", description: "Russia cash management table", businessFunction: "Cash Management - Russia", slaHours: 4, enabled: false },
  { platform: "SNOWFLAKE", jobName: "Russia employee table extensions", priority: "medium", description: "Russia employee table extensions", businessFunction: "Human Resources - Russia", slaHours: 6, enabled: false },
  { platform: "SNOWFLAKE", jobName: "Russia profit tax table (RTax25)", priority: "medium", description: "Russia profit tax table (RTax25)", businessFunction: "Tax & Compliance - Russia", slaHours: 4, enabled: false },
  { platform: "SNOWFLAKE", jobName: "Sales module parameters and configuration", priority: "high", description: "Sales module parameters and configuration", businessFunction: "Sales", slaHours: 3, enabled: false },
  { platform: "SNOWFLAKE", jobName: "Saudi Arabia vendor Zakat information", priority: "medium", description: "Saudi Arabia vendor Zakat information", businessFunction: "Accounts Payable - Saudi Arabia", slaHours: 6, enabled: false },
  { platform: "SNOWFLAKE", jobName: "Storage dimension group definitions", priority: "high", description: "Storage dimension group definitions", businessFunction: "Product Management", slaHours: 3, enabled: false },
  { platform: "SNOWFLAKE", jobName: "Storage dimension group item assignments", priority: "high", description: "Storage dimension group item assignments", businessFunction: "Product Management", slaHours: 3, enabled: false },
  { platform: "SNOWFLAKE", jobName: "Storage dimension group product assignments", priority: "high", description: "Storage dimension group product assignments", businessFunction: "Product Management", slaHours: 3, enabled: false },
  { platform: "SNOWFLAKE", jobName: "System SQL dictionary metadata", priority: "low", description: "System SQL dictionary metadata", businessFunction: "System Configuration", slaHours: 12, enabled: false },
  { platform: "SNOWFLAKE", jobName: "System-wide parameters and configuration", priority: "high", description: "System-wide parameters and configuration", businessFunction: "System Configuration", slaHours: 3, enabled: false },
  { platform: "SNOWFLAKE", jobName: "Tax branch configuration", priority: "high", description: "Tax branch configuration", businessFunction: "Tax & Compliance", slaHours: 2, enabled: false },
  { platform: "SNOWFLAKE", jobName: "Tax rate type configuration - compliance critical", priority: "high", description: "Tax rate type configuration - compliance critical", businessFunction: "Tax & Compliance", slaHours: 2, enabled: false },
  { platform: "SNOWFLAKE", jobName: "Thailand tax withholding item group configuration", priority: "high", description: "Thailand tax withholding item group configuration", businessFunction: "Tax & Compliance - Thailand", slaHours: 2, enabled: false },
  { platform: "SNOWFLAKE", jobName: "Tracking dimension group field setup", priority: "high", description: "Tracking dimension group field setup", businessFunction: "Product Management", slaHours: 3, enabled: false },
  { platform: "SNOWFLAKE", jobName: "Tracking dimension group item assignments", priority: "high", description: "Tracking dimension group item assignments", businessFunction: "Product Management", slaHours: 3, enabled: false },
  { platform: "SNOWFLAKE", jobName: "Tracking dimension group product assignments", priority: "high", description: "Tracking dimension group product assignments", businessFunction: "Product Management", slaHours: 3, enabled: false },
  { platform: "SNOWFLAKE", jobName: "Transportation management inventory enablement", priority: "medium", description: "Transportation management inventory enablement", businessFunction: "Transportation Management", slaHours: 4, enabled: false },
  { platform: "SNOWFLAKE", jobName: "Travel and expense text/descriptions", priority: "low", description: "Travel and expense text/descriptions", businessFunction: "Travel & Expense", slaHours: 8, enabled: false },
  { platform: "SNOWFLAKE", jobName: "US 1099 tax box detail configurations", priority: "high", description: "US 1099 tax box detail configurations", businessFunction: "Tax & Compliance", slaHours: 2, enabled: false },
  { platform: "SNOWFLAKE", jobName: "US 1099 tax reporting field definitions", priority: "high", description: "US 1099 tax reporting field definitions", businessFunction: "Tax & Compliance", slaHours: 2, enabled: false },
  { platform: "SNOWFLAKE", jobName: "US NACHA/IAT customer/vendor bank info", priority: "medium", description: "US NACHA/IAT customer/vendor bank info", businessFunction: "Accounts Payable/Receivable - US", slaHours: 4, enabled: false },
  { platform: "SNOWFLAKE", jobName: "Unit of measure reference data", priority: "medium", description: "Unit of measure reference data", businessFunction: "System Configuration", slaHours: 6, enabled: false },
  { platform: "SNOWFLAKE", jobName: "Vendor 1099-OID detail records", priority: "high", description: "Vendor 1099-OID detail records", businessFunction: "Accounts Payable - 1099", slaHours: 3, enabled: false },
  { platform: "SNOWFLAKE", jobName: "Vendor exception group definitions", priority: "medium", description: "Vendor exception group definitions", businessFunction: "Accounts Payable", slaHours: 6, enabled: false },
  { platform: "SNOWFLAKE", jobName: "Vendor group classifications", priority: "high", description: "Vendor group classifications", businessFunction: "Accounts Payable", slaHours: 3, enabled: false },
  { platform: "SNOWFLAKE", jobName: "Vendor invoice info lines - regional extensions", priority: "critical", description: "Vendor invoice info lines - regional extensions", businessFunction: "Accounts Payable", slaHours: 2, enabled: false },
  { platform: "SNOWFLAKE", jobName: "Vendor invoice information - core AP transactions", priority: "critical", description: "Vendor invoice information - core AP transactions", businessFunction: "Accounts Payable", slaHours: 2, enabled: false },
  { platform: "SNOWFLAKE", jobName: "Vendor invoice line details", priority: "critical", description: "Vendor invoice line details", businessFunction: "Accounts Payable", slaHours: 2, enabled: false },
  { platform: "SNOWFLAKE", jobName: "Vendor invoice sub-table extensions", priority: "critical", description: "Vendor invoice sub-table extensions", businessFunction: "Accounts Payable", slaHours: 2, enabled: false },
  { platform: "SNOWFLAKE", jobName: "Vendor master data - core AP reference", priority: "critical", description: "Vendor master data - core AP reference", businessFunction: "Accounts Payable", slaHours: 2, enabled: false },
  { platform: "SNOWFLAKE", jobName: "Vendor transactions - core AP transaction history", priority: "critical", description: "Vendor transactions - core AP transaction history", businessFunction: "Accounts Payable", slaHours: 2, enabled: false },
  { platform: "SNOWFLAKE", jobName: "Warehouse inventory table extensions", priority: "high", description: "Warehouse inventory table extensions", businessFunction: "Warehouse Management", slaHours: 3, enabled: false },
  { platform: "SNOWFLAKE", jobName: "Warehouse product transportation code mappings", priority: "medium", description: "Warehouse product transportation code mappings", businessFunction: "Warehouse Management", slaHours: 4, enabled: false },
  { platform: "SNOWFLAKE", jobName: "Warehouse reservation hierarchy definitions", priority: "high", description: "Warehouse reservation hierarchy definitions", businessFunction: "Warehouse Management", slaHours: 3, enabled: false },
  { platform: "SNOWFLAKE", jobName: "Warehouse reservation hierarchy item mappings", priority: "high", description: "Warehouse reservation hierarchy item mappings", businessFunction: "Warehouse Management", slaHours: 3, enabled: false },
  { platform: "SNOWFLAKE", jobName: "Warranty inventory table", priority: "low", description: "Warranty inventory table", businessFunction: "Warranty Management", slaHours: 8, enabled: false },
  { platform: "SNOWFLAKE", jobName: "Work center/resource table for manufacturing", priority: "high", description: "Work center/resource table for manufacturing", businessFunction: "Manufacturing", slaHours: 3, enabled: false },
];

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return s / 2147483647;
  };
}

function generateJobPerformance(): JobPerformanceRecord[] {
  return jobRegistry.map((job, idx) => {
    const rng = seededRandom(idx * 31 + job.jobName.length * 7);

    if (!job.enabled) {
      return {
        platform: job.platform,
        jobName: job.jobName,
        totalRuns: 0,
        successfulRuns: 0,
        failedRuns: 0,
        successRatePct: 0,
        avgDurationSeconds: 0,
        maxDurationSeconds: 0,
        lastRunTime: "",
        firstSeen: "",
      };
    }

    const baseCadence = job.slaHours <= 2 ? 672 : job.slaHours <= 4 ? 336 : 60;
    const totalRuns = Math.max(1, Math.round(baseCadence * (0.7 + rng() * 0.6)));
    const failRate = rng() < 0.7 ? rng() * 0.03 : 0.03 + rng() * 0.07;
    const failedRuns = Math.round(totalRuns * failRate);
    const successfulRuns = totalRuns - failedRuns;
    const successRatePct = Math.round((successfulRuns / totalRuns) * 1000) / 10;
    const avgDur = 30 + rng() * 400;
    const maxDur = avgDur * (1.5 + rng());
    const lastRunHoursAgo = Math.floor(rng() * 12);

    return {
      platform: job.platform,
      jobName: job.jobName,
      totalRuns,
      successfulRuns,
      failedRuns,
      successRatePct,
      avgDurationSeconds: Math.round(avgDur * 10) / 10,
      maxDurationSeconds: Math.round(maxDur * 10) / 10,
      lastRunTime: hoursAgo(lastRunHoursAgo),
      firstSeen: "2026-02-03T00:00:00Z",
    };
  });
}

export const jobPerformance: JobPerformanceRecord[] = generateJobPerformance();
