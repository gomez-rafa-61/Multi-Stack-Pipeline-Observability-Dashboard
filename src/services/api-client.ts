import type {
  PipelineHealthSummary,
  PipelineStatusTrend,
  PlatformBreakdown,
  RecentFailure,
  CyclePerformance,
  JobPerformanceRecord,
  JobRegistryRecord,
  MonitoringEvent,
  CatalogEntry,
  CatalogEntity,
  EntityLineageRecord,
  LineageEdge,
  CatalogDiagram,
  CatalogDocument,
} from "@/types/pipeline";
import {
  healthSummary,
  statusTrend,
  platformBreakdown,
  recentFailures,
  cyclePerformance,
  jobPerformance,
  jobRegistry,
  monitoringEvents,
  catalogEntries,
  catalogEntities,
  catalogLineage,
  entityLineage,
  catalogDiagrams,
  catalogDocuments,
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

async function fetchPutJson<T>(
  path: string,
  body: Record<string, unknown>,
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "PUT",
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

async function fetchDelete<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { method: "DELETE" });
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

  getJobStatus: () =>
    fetchRows<MonitoringEvent>("/job-status", monitoringEvents),

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

  // Catalog Portal
  getCatalog: () =>
    fetchRows<CatalogEntry>("/catalog", catalogEntries),

  getCatalogById: (id: string) =>
    fetchWithFallback<CatalogEntry>(
      `/catalog/${id}`,
      catalogEntries.find((e) => e.catalogId === id) ?? catalogEntries[0],
    ),

  getCatalogEntities: (catalogId: string) =>
    fetchWithFallback<CatalogEntity[]>(
      `/catalog/${catalogId}/entities`,
      catalogEntities.filter((e) => e.catalogId === catalogId),
    ),

  getCatalogLineage: () =>
    fetchWithFallback<LineageEdge[]>("/catalog/lineage", catalogLineage),

  getEntityLineage: () =>
    fetchWithFallback<EntityLineageRecord[]>("/catalog/entity-lineage", entityLineage),

  getCatalogDiagrams: (catalogId: string) =>
    fetchWithFallback<CatalogDiagram[]>(
      `/catalog/${catalogId}/diagrams`,
      catalogDiagrams.filter((d) => d.catalogId === catalogId),
    ),

  getCatalogDocuments: (catalogId: string) =>
    fetchWithFallback<CatalogDocument[]>(
      `/catalog/${catalogId}/documents`,
      catalogDocuments.filter((d) => d.catalogId === catalogId),
    ),

  createCatalogEntry: (data: Record<string, unknown>) =>
    fetchPostJson<{ catalogId: string }>("/catalog", data),

  bulkImportCatalog: (rows: Record<string, unknown>[]) =>
    fetchPostJson<{ inserted: number; skipped: number; errors: { pipelineName: string; error: string }[] }>(
      "/catalog/bulk",
      { rows },
    ),

  updateCatalogEntry: (id: string, data: Record<string, unknown>) =>
    fetchPutJson<{ status: string }>(`/catalog/${id}`, data),

  createEntity: (catalogId: string, data: Record<string, unknown>) =>
    fetchPostJson<{ entityId: string }>(`/catalog/${catalogId}/entities`, data),

  updateEntity: (entityId: string, data: Record<string, unknown>) =>
    fetchPutJson<{ status: string }>(`/catalog/entities/${entityId}`, data),

  deleteEntity: (entityId: string) =>
    fetchDelete<{ status: string }>(`/catalog/entities/${entityId}`),

  createLineageEdge: (data: Record<string, unknown>) =>
    fetchPostJson<{ lineageId: string }>("/catalog/lineage", data),

  deleteLineageEdge: (id: string) =>
    fetchDelete<{ status: string }>(`/catalog/lineage/${id}`),

  createDiagram: (catalogId: string, data: Record<string, unknown>) =>
    fetchPostJson<{ diagramId: string }>(`/catalog/${catalogId}/diagrams`, data),

  deleteDiagram: (id: string) =>
    fetchDelete<{ status: string }>(`/catalog/diagrams/${id}`),

  createDocument: (catalogId: string, data: Record<string, unknown>) =>
    fetchPostJson<{ documentId: string }>(`/catalog/${catalogId}/documents`, data),

  deleteDocument: (id: string) =>
    fetchDelete<{ status: string }>(`/catalog/documents/${id}`),
};
