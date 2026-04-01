import type {
  PipelineHealthSummary,
  PipelineStatusTrend,
  PlatformBreakdown,
  RecentFailure,
  CyclePerformance,
  JobPerformanceRecord,
  JobRegistryRecord,
} from "@/types/pipeline";
import {
  healthSummary,
  statusTrend,
  platformBreakdown,
  recentFailures,
  cyclePerformance,
  jobPerformance,
  jobRegistry,
} from "@/data/seed-data";

const API_BASE =
  (window as unknown as Record<string, string>).__API_BASE_URL__ ?? "/api";

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

function normalizeRow<T>(row: T): T {
  const out = { ...row } as Record<string, unknown>;
  if (typeof out.platform === "string")
    out.platform = normalizePlatform(out.platform);
  if (typeof out.status === "string")
    out.status = out.status.toUpperCase();
  return out as T;
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

async function fetchRows<T>(
  endpoint: string,
  seed: T[],
): Promise<T[]> {
  const rows = await fetchWithFallback<T[]>(endpoint, seed);
  return rows.map(normalizeRow);
}

export type CortexAnalystResponse = Record<string, unknown>;

function formatHttpErrorDetail(data: unknown, fallbackText: string, status: number): string {
  if (data && typeof data === "object" && "detail" in data) {
    const d = (data as { detail: unknown }).detail;
    if (typeof d === "string") return d;
    if (Array.isArray(d) || d !== undefined) return JSON.stringify(d);
  }
  const t = fallbackText.trim();
  if (t.length > 0 && t.length < 2000) return t;
  return `HTTP ${status}`;
}

async function fetchPostJson<T>(
  path: string,
  body: Record<string, unknown>,
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    data = null;
  }
  if (!res.ok) {
    throw new Error(formatHttpErrorDetail(data, text, res.status));
  }
  return data as T;
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

  getJobRegistry: () =>
    fetchRows<JobRegistryRecord>("/job-registry", jobRegistry),

  getPlatforms: () =>
    fetchWithFallback<string[]>("/platforms", [
      "AIRBYTE",
      "DATABRICKS",
      "DBT_CLOUD",
      "POWER_AUTOMATE",
      "SNOWFLAKE",
    ]),

  postCortexAnalystMessage: (message: string, semanticView?: string) =>
    fetchPostJson<CortexAnalystResponse>("/cortex-analyst/message", {
      message,
      semanticView: semanticView ?? null,
    }),
};
