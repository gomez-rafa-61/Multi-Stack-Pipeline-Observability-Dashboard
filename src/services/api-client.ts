import type {
  PipelineHealthSummary,
  PipelineStatusTrend,
  PlatformBreakdown,
  RecentFailure,
  CyclePerformance,
  JobPerformanceRecord,
} from "@/types/pipeline";
import {
  healthSummary,
  statusTrend,
  platformBreakdown,
  recentFailures,
  cyclePerformance,
  jobPerformance,
} from "@/data/seed-data";

const API_BASE = "/api";

const PLATFORM_ALIAS: Record<string, string> = {
  snowflake: "SNOWFLAKE",
  airbyte: "AIRBYTE",
  databricks: "DATABRICKS",
  power_automate: "POWER_AUTOMATE",
  powerautomate: "POWER_AUTOMATE",
};

function normalizePlatform(value: string): string {
  return PLATFORM_ALIAS[value.toLowerCase()] ?? value.toUpperCase();
}

function normalizeRow<T extends Record<string, unknown>>(row: T): T {
  const out = { ...row };
  if (typeof out.platform === "string")
    out.platform = normalizePlatform(out.platform as string) as T["platform"];
  if (typeof out.status === "string")
    out.status = (out.status as string).toUpperCase() as T["status"];
  return out;
}

async function fetchLive<T>(endpoint: string): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`);
  if (!res.ok) throw new Error(`API ${endpoint}: ${res.status}`);
  return res.json();
}

async function fetchWithFallback<T>(endpoint: string, seed: T): Promise<T> {
  try {
    return await fetchLive<T>(endpoint);
  } catch {
    console.warn(`Live API unavailable for ${endpoint}, using seed data`);
    return seed;
  }
}

async function fetchRows<T extends Record<string, unknown>>(
  endpoint: string,
  seed: T[],
): Promise<T[]> {
  const rows = await fetchWithFallback<T[]>(endpoint, seed);
  return rows.map(normalizeRow);
}

export const api = {
  getHealthSummary: () =>
    fetchWithFallback<PipelineHealthSummary>("/health-summary", healthSummary),

  getStatusTrend: () =>
    fetchRows<PipelineStatusTrend>("/status-trend", statusTrend),

  getPlatformBreakdown: () =>
    fetchRows<PlatformBreakdown>("/platform-breakdown", platformBreakdown),

  getRecentFailures: () =>
    fetchRows<RecentFailure>("/recent-failures", recentFailures),

  getCyclePerformance: () =>
    fetchWithFallback<CyclePerformance[]>(
      "/cycle-performance",
      cyclePerformance
    ),

  getJobPerformance: () =>
    fetchRows<JobPerformanceRecord>("/job-performance", jobPerformance),

  getPlatforms: () =>
    fetchWithFallback<string[]>("/platforms", [
      "AIRBYTE",
      "DATABRICKS",
      "DBT_CLOUD",
      "POWER_AUTOMATE",
      "SNOWFLAKE",
    ]),
};
