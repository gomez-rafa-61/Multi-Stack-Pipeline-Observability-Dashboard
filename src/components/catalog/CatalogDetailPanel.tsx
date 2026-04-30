import { useEffect, useState, useMemo } from "react";
import { X, ExternalLink, Mail, ArrowRight, Pencil, Save, Loader2, Activity, Copy, Check } from "lucide-react";
import { Link } from "react-router-dom";
import { PlatformBadge } from "@/components/ui/PlatformBadge";
import { SearchInput } from "@/components/ui/SearchInput";
import { DiagramCard } from "./DiagramCard";
import { QualityScoreRing } from "./QualityScoreRing";
import { api } from "@/services/api-client";
import type { CatalogEntry, CatalogEntity, CatalogDiagram, CatalogDocument, LineageEdge, MonitoringEvent } from "@/types/pipeline";

/** UAM dashboard alignment (success / restricted / nav) */
const UAM = {
  teal: "#085041",
  red: "#791F1F",
  sidebar: "#0F172A",
} as const;

const CLASS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  PUBLIC:       { bg: "rgba(8,80,65,0.1)",  text: UAM.teal, border: "rgba(8,80,65,0.22)" },
  INTERNAL:     { bg: "rgba(37,99,235,0.08)",  text: "#2563EB", border: "rgba(37,99,235,0.2)" },
  CONFIDENTIAL: { bg: "rgba(217,119,6,0.08)",  text: "#D97706", border: "rgba(217,119,6,0.2)" },
  RESTRICTED:   { bg: "rgba(121,31,31,0.12)",  text: UAM.red, border: "rgba(121,31,31,0.28)" },
};

function sanitizeFqn(raw: string): string | null {
  const t = raw.trim().replace(/\s+/g, "");
  if (!t || !/^[\w.]+$/i.test(t)) return null;
  return t;
}

function describeTableSql(databaseDetails: string | null | undefined): string | null {
  const fq = databaseDetails ? sanitizeFqn(databaseDetails) : null;
  if (!fq) return null;
  return `DESCRIBE TABLE ${fq};`;
}

function primaryTargetFqn(entities: CatalogEntity[]): string | null {
  const hit = entities.find((e) => e.databaseDetails?.trim());
  return hit?.databaseDetails ? sanitizeFqn(hit.databaseDetails) : null;
}

const DOC_TYPE_LABELS: Record<string, string> = {
  SHAREPOINT_FOLDER: "SharePoint Folder",
  SHAREPOINT_LIST: "SharePoint List",
  CONFLUENCE: "Confluence",
  WIKI: "Wiki",
  TEAMS_CHANNEL: "Teams Channel",
  RUNBOOK: "Runbook",
  SOP: "SOP",
  OTHER: "Other",
};

function Badge({ label, style }: { label: string; style: { bg: string; text: string; border: string } }) {
  return (
    <span
      className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase"
      style={{ backgroundColor: style.bg, color: style.text, border: `1px solid ${style.border}` }}
    >
      {label}
    </span>
  );
}

function HeroMetric({
  title,
  value,
  subtitle,
  background,
}: {
  title: string;
  value: string;
  subtitle: string;
  background: string;
}) {
  return (
    <div
      className="rounded-xl px-4 py-3.5 text-white shadow-[0_4px_14px_rgba(15,23,42,0.12)] flex-1 min-w-0"
      style={{ backgroundColor: background }}
    >
      <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-white/75">{title}</p>
      <p className="text-[26px] font-semibold tabular-nums tracking-tight text-white leading-tight mt-1.5">{value}</p>
      <p className="text-[11px] text-white/55 mt-1.5 leading-snug">{subtitle}</p>
    </div>
  );
}

const glassPanel =
  "rounded-2xl border border-white/80 bg-white/75 backdrop-blur-xl shadow-[0_8px_32px_rgba(15,23,42,0.07)]";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="py-4 border-b border-border-default">
      <p className="text-[10px] font-medium uppercase tracking-[0.06em] text-text-muted mb-2">
        {title}
      </p>
      {children}
    </div>
  );
}

interface ParsedDbDetails {
  database: string | null;
  schema: string | null;
  tables: string[];
  raw: string;
}

/** Strip a "Key: " prefix that may be embedded in pipe-delimited field values. */
function stripKeyPrefix(val: string): string | null {
  const colonIdx = val.indexOf(": ");
  const stripped = colonIdx !== -1 ? val.slice(colonIdx + 2).trim() : val.trim();
  return stripped || null;
}

function parseDbDetails(raw: string | null): ParsedDbDetails | null {
  if (!raw?.trim()) return null;
  const base = { raw: raw.trim(), database: null as string | null, schema: null as string | null, tables: [] as string[] };

  const parts = raw.split("|").map((p) => p.trim()).filter(Boolean);

  // Airbyte-style: SOURCE_TYPE|STREAM|DEST_DB|DATABASE|SCHEMA|TABLE_NAME
  // Values may carry a "Key: value" prefix (e.g. "Database: AIRBYTE_DB").
  if (parts.length >= 5) {
    const database = stripKeyPrefix(parts[3]);
    const schema = stripKeyPrefix(parts[4]);
    const tableName = parts[5] ? stripKeyPrefix(parts[5]) : null;
    return { ...base, database, schema, tables: tableName ? [tableName] : [] };
  }

  // dot-notation: DB.SCHEMA.TABLE
  if (!raw.includes(" ") && raw.includes(".")) {
    const dotParts = raw.split(".");
    if (dotParts.length >= 2) {
      return {
        ...base,
        database: dotParts[0] || null,
        schema: dotParts.length >= 3 ? dotParts[1] : null,
        tables: dotParts.length >= 3 ? [dotParts.slice(2).join(".")] : [dotParts[1]],
      };
    }
  }

  return base;
}

const MONO_LABELS = new Set(["Database", "URI", "Connection", "Environment"]);

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  if (!value) return null;
  const useMono = MONO_LABELS.has(label);
  return (
    <div className="flex justify-between py-1.5">
      <span className="text-xs text-text-muted">{label}</span>
      <span className={`text-xs text-text-primary text-right max-w-[60%] truncate ${useMono ? "font-mono text-[11px]" : ""}`}>{value}</span>
    </div>
  );
}

function EditInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full h-7 px-2 bg-bg-primary border border-border-default rounded text-xs text-text-primary placeholder:text-text-muted outline-none focus:border-accent transition-colors duration-200"
    />
  );
}

interface Props {
  entry: CatalogEntry;
  lineage: LineageEdge[];
  qualityScore: number;
  onClose: () => void;
  onUpdated?: () => void;
  allEntries?: CatalogEntry[];
  onNavigateEntry?: (entry: CatalogEntry) => void;
}

export function CatalogDetailPanel({ entry, lineage, qualityScore, onClose, onUpdated, allEntries = [], onNavigateEntry }: Props) {
  const [diagrams, setDiagrams] = useState<CatalogDiagram[]>([]);
  const [documents, setDocuments] = useState<CatalogDocument[]>([]);
  const [entities, setEntities] = useState<CatalogEntity[]>([]);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    pipelineDescription: entry.pipelineDescription ?? "",
    dataDirection: entry.dataDirection ?? "",
    connectionType: entry.connectionType ?? "",
    dataEnvironment: entry.dataEnvironment ?? "",
    refreshFrequency: entry.refreshFrequency ?? "",
    businessSegment: entry.businessSegment ?? "",
    dataProvider: entry.dataProvider ?? "",
    ownerName: entry.ownerName ?? "",
    ownerEmail: entry.ownerEmail ?? "",
    engineerName: entry.engineerName ?? "",
    engineerEmail: entry.engineerEmail ?? "",
    dataClassification: entry.dataClassification,
  });
  const [monitoringEvents, setMonitoringEvents] = useState<MonitoringEvent[]>([]);
  const [streamSearch, setStreamSearch] = useState("");
  const [copiedSql, setCopiedSql] = useState(false);

  useEffect(() => {
    setEditForm({
      pipelineDescription: entry.pipelineDescription ?? "",
      dataDirection: entry.dataDirection ?? "",
      connectionType: entry.connectionType ?? "",
      dataEnvironment: entry.dataEnvironment ?? "",
      refreshFrequency: entry.refreshFrequency ?? "",
      businessSegment: entry.businessSegment ?? "",
      dataProvider: entry.dataProvider ?? "",
      ownerName: entry.ownerName ?? "",
      ownerEmail: entry.ownerEmail ?? "",
      engineerName: entry.engineerName ?? "",
      engineerEmail: entry.engineerEmail ?? "",
      dataClassification: entry.dataClassification,
    });
    setEditing(false);
  }, [entry]);

  useEffect(() => {
    api.getCatalogDiagrams(entry.catalogId).then(setDiagrams);
    api.getCatalogDocuments(entry.catalogId).then(setDocuments);
    api.getCatalogEntities(entry.catalogId).then(setEntities);
  }, [entry.catalogId]);

  useEffect(() => {
    setStreamSearch("");
    setCopiedSql(false);
  }, [entry.catalogId]);

  useEffect(() => {
    api.getJobStatus().then((events) => {
      const matched = events.filter(
        (ev) =>
          ev.platform.toUpperCase() === entry.platform.toUpperCase() &&
          ev.jobName.toUpperCase().trim() === entry.pipelineName.toUpperCase().trim(),
      );
      setMonitoringEvents(matched);
    });
  }, [entry.platform, entry.pipelineName]);

  const sparklineData = useMemo(() => {
    if (monitoringEvents.length === 0) return null;
    const sorted = [...monitoringEvents].sort(
      (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
    );
    const recent = sorted.slice(-10);
    return recent.map((ev) => ({
      success: ev.status.toUpperCase() === "SUCCESS" || ev.status.toUpperCase() === "SUCCEEDED",
    }));
  }, [monitoringEvents]);

  const successRate = useMemo(() => {
    if (!sparklineData || sparklineData.length === 0) return null;
    const total = sparklineData.length;
    const ok = sparklineData.filter((d) => d.success).length;
    return Math.round((ok / total) * 100);
  }, [sparklineData]);

  const activeFailures = useMemo(
    () =>
      monitoringEvents.filter((ev) => {
        const s = ev.status.toUpperCase();
        return s === "FAILED" || s === "FAILURE" || s === "ERROR";
      }).length,
    [monitoringEvents],
  );

  const targetFqn = useMemo(() => primaryTargetFqn(entities), [entities]);
  const describeSql = useMemo(() => describeTableSql(targetFqn), [targetFqn]);

  const filteredEntities = useMemo(() => {
    if (!streamSearch.trim()) return entities;
    const q = streamSearch.toLowerCase();
    return entities.filter(
      (e) =>
        e.entityName.toLowerCase().includes(q) ||
        (e.databaseDetails ?? "").toLowerCase().includes(q) ||
        (e.entityDescription ?? "").toLowerCase().includes(q),
    );
  }, [entities, streamSearch]);

  async function handleSave() {
    setSaving(true);
    try {
      await api.updateCatalogEntry(entry.catalogId, {
        platform: entry.platform,
        pipelineName: entry.pipelineName,
        pipelineDescription: editForm.pipelineDescription || null,
        dataDirection: editForm.dataDirection || null,
        connectionType: editForm.connectionType || null,
        dataEnvironment: editForm.dataEnvironment || null,
        refreshFrequency: editForm.refreshFrequency || null,
        businessSegment: editForm.businessSegment || null,
        dataProvider: editForm.dataProvider || null,
        ownerName: editForm.ownerName || null,
        ownerEmail: editForm.ownerEmail || null,
        engineerName: editForm.engineerName || null,
        engineerEmail: editForm.engineerEmail || null,
        dataClassification: editForm.dataClassification,
      });
      setEditing(false);
      onUpdated?.();
    } catch {
      // keep editing mode open on failure
    } finally {
      setSaving(false);
    }
  }

  const upstream = lineage.filter((e) => e.targetCatalogId === entry.catalogId);
  const downstream = lineage.filter((e) => e.sourceCatalogId === entry.catalogId);
  const classStyle = CLASS_COLORS[entry.dataClassification] ?? CLASS_COLORS.INTERNAL;

  const entryMap = new Map(allEntries.map((e) => [e.catalogId, e]));
  function resolveEntryName(catalogId: string) {
    return entryMap.get(catalogId)?.pipelineName ?? catalogId;
  }

  const showIngestionBadge = /INGEST/i.test(entry.dataDirection ?? "");

  return (
    <>
    <div
      className="fixed inset-0 z-30 bg-[#0f172a]/40 backdrop-blur-[2px]"
      onClick={onClose}
      aria-hidden
    />
    <div className="fixed inset-y-0 right-0 z-40 flex w-full max-w-[min(920px,calc(100vw-12px))] flex-col border-l border-white/50 bg-white/88 shadow-2xl backdrop-blur-2xl max-sm:max-w-full">
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-border-default/80 px-5">
        <div className="min-w-0 pr-3">
          <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-text-muted">Pipeline catalog</p>
          <h2 className="truncate text-sm font-semibold text-text-primary">{entry.pipelineName}</h2>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {editing ? (
            <button
              onClick={handleSave}
              disabled={saving}
              className="p-1.5 rounded-lg bg-accent text-white hover:bg-accent/90 transition-colors duration-200"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            </button>
          ) : (
            <button
              onClick={() => setEditing(true)}
              className="p-1.5 rounded-lg hover:bg-bg-primary text-text-secondary hover:text-accent transition-colors duration-200 cursor-pointer"
            >
              <Pencil size={14} />
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-bg-primary text-text-secondary hover:text-text-primary transition-colors duration-200 cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-6">
        {/* North star metrics */}
        <div className="grid grid-cols-1 gap-3 pt-5 sm:grid-cols-3">
          <HeroMetric
            title="Pipeline success rate"
            value={successRate != null ? `${successRate}%` : "—"}
            subtitle={
              sparklineData && sparklineData.length > 0
                ? `Based on last ${sparklineData.length} matched runs`
                : "No matched runs in monitoring feed"
            }
            background={UAM.teal}
          />
          <HeroMetric
            title="Total streams"
            value={String(entities.length)}
            subtitle={entities.length ? "Rows in stream inventory" : "Add entities to see inventory"}
            background={UAM.sidebar}
          />
          <HeroMetric
            title="Active failures"
            value={String(activeFailures)}
            subtitle={activeFailures ? "Failed runs in matched history" : "No failures in matched history"}
            background={UAM.red}
          />
        </div>

        {/* Connection header + metadata */}
        <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-[2fr_1fr]">
          <div className={`${glassPanel} p-5`}>
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border-default/70 pb-4">
              <div className="flex flex-wrap items-center gap-2">
                <PlatformBadge platform={entry.platform} />
                <Badge label={entry.dataClassification} style={classStyle} />
                {entry.dataEnvironment?.trim() && (
                  <Badge
                    label={entry.dataEnvironment.trim().toUpperCase()}
                    style={{
                      bg: "rgba(8,80,65,0.1)",
                      text: UAM.teal,
                      border: "rgba(8,80,65,0.22)",
                    }}
                  />
                )}
                {showIngestionBadge && (
                  <Badge
                    label="Ingestion"
                    style={{
                      bg: "rgba(254,243,199,0.9)",
                      text: "#92400E",
                      border: "rgba(217,119,6,0.25)",
                    }}
                  />
                )}
                {entry.catalogStatus === "DEPRECATED" && (
                  <Badge
                    label="Deprecated"
                    style={{ bg: "rgba(121,31,31,0.12)", text: UAM.red, border: "rgba(121,31,31,0.28)" }}
                  />
                )}
                {entry.catalogStatus === "PLANNED" && (
                  <Badge
                    label="Planned"
                    style={{ bg: "rgba(37,99,235,0.08)", text: "#2563EB", border: "rgba(37,99,235,0.2)" }}
                  />
                )}
              </div>
              <QualityScoreRing score={qualityScore} />
            </div>

            <p className="mt-4 text-[10px] font-medium uppercase tracking-[0.08em] text-text-muted">Pipeline title</p>
            <p className="text-xs font-medium text-text-primary">
              {entry.dataProvider ?? entry.businessSegment ?? "Documented pipeline"}
            </p>

            <p className="mt-3 text-[10px] font-medium uppercase tracking-[0.08em] text-text-muted">Data pipeline name</p>
            <h3 className="text-lg font-semibold tracking-tight text-text-primary">{entry.pipelineName}</h3>

            {(entry.pipelineDescription || editing) && (
              <div className="mt-3">
                {editing ? (
                  <textarea
                    value={editForm.pipelineDescription}
                    onChange={(e) => setEditForm((f) => ({ ...f, pipelineDescription: e.target.value }))}
                    rows={3}
                    className="w-full resize-none rounded-xl border border-border-default bg-white/90 px-3 py-2 text-sm text-text-primary outline-none transition-colors duration-200 focus:border-[#085041]/40 focus:ring-1 focus:ring-[#085041]/15"
                  />
                ) : (
                  entry.pipelineDescription && (
                    <p className="text-sm leading-relaxed text-text-secondary">{entry.pipelineDescription}</p>
                  )
                )}
              </div>
            )}

            {targetFqn && (
              <p className="mt-4 text-xs text-text-secondary">
                Target Snowflake object:{" "}
                <code
                  className="rounded-md px-1.5 py-0.5 font-mono text-[11px]"
                  style={{ backgroundColor: "rgba(8,80,65,0.1)", color: UAM.teal }}
                >
                  {targetFqn}
                </code>
              </p>
            )}

            {describeSql && (
              <div className="mt-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-text-muted">
                    Pre-filled · describe table
                  </p>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(describeSql);
                        setCopiedSql(true);
                        window.setTimeout(() => setCopiedSql(false), 2000);
                      } catch {
                        /* ignore */
                      }
                    }}
                    className="inline-flex items-center gap-1 rounded-lg border border-border-default bg-white/90 px-2 py-1 text-[10px] font-medium text-text-secondary transition-colors duration-200 hover:bg-bg-primary"
                  >
                    {copiedSql ? <Check size={12} style={{ color: UAM.teal }} /> : <Copy size={12} />}
                    {copiedSql ? "Copied" : "Copy SQL"}
                  </button>
                </div>
                <pre className="mt-2 overflow-x-auto rounded-xl border border-border-default/80 bg-slate-900/[0.04] px-3 py-2.5 font-mono text-[11px] leading-relaxed text-text-primary">
                  {describeSql}
                </pre>
              </div>
            )}
          </div>

          <div className={`${glassPanel} p-5`}>
            <h3 className="text-[10px] font-medium uppercase tracking-[0.08em] text-text-muted">Pipeline metadata</h3>
            <dl className="mt-3 space-y-2.5 text-[13px] text-text-secondary">
              <div>
                <dt className="text-[10px] font-medium uppercase tracking-[0.06em] text-text-muted">Owner</dt>
                <dd className="mt-0.5 font-mono text-xs text-text-primary break-all">
                  {entry.ownerEmail ?? entry.ownerName ?? "—"}
                </dd>
              </div>
              <div>
                <dt className="text-[10px] font-medium uppercase tracking-[0.06em] text-text-muted">Schedule</dt>
                <dd className="mt-0.5 text-text-primary">{entry.refreshFrequency ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-[10px] font-medium uppercase tracking-[0.06em] text-text-muted">Sync / connection</dt>
                <dd className="mt-0.5 text-text-primary">{entry.connectionType ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-[10px] font-medium uppercase tracking-[0.06em] text-text-muted">Data engineer</dt>
                <dd className="mt-0.5 text-xs text-text-primary break-all">
                  {entry.engineerEmail ?? entry.engineerName ?? "—"}
                </dd>
              </div>
            </dl>
          </div>
        </div>

        {/* Stream inventory */}
        {entities.length > 0 && (
          <div className={`${glassPanel} mt-5 overflow-hidden`}>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-default/80 px-4 py-3">
              <h3 className="text-sm font-semibold tracking-[-0.01em] text-text-primary">
                Stream inventory
                <span className="ml-2 text-xs font-normal text-text-muted">{filteredEntities.length} streams</span>
              </h3>
              <SearchInput
                value={streamSearch}
                onChange={setStreamSearch}
                placeholder="Search streams..."
              />
            </div>

            <div className="divide-y divide-border-default/60">
              {filteredEntities.length === 0 && (
                <p className="px-4 py-8 text-center text-sm text-text-muted">No streams match your search</p>
              )}
              {filteredEntities.map((ent) => {
                const mapped = Boolean(ent.databaseDetails?.trim());
                const parsed = parseDbDetails(ent.databaseDetails);
                const hasStructured = parsed && (parsed.database || parsed.schema || parsed.tables.length > 0);

                return (
                  <div
                    key={ent.entityId}
                    className="flex flex-col gap-3 px-4 py-4 transition-colors duration-150 hover:bg-bg-primary/30 sm:flex-row sm:items-start sm:gap-4"
                  >
                    {/* Left — stream identity */}
                    <div className="flex min-w-0 flex-1 items-start gap-2.5">
                      <span
                        className="mt-0.5 h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: mapped ? UAM.teal : UAM.red }}
                      />
                      <div className="min-w-0">
                        <span className="font-mono text-sm font-semibold text-text-primary break-all">{ent.entityName}</span>
                        {ent.entityDescription && (
                          <p className="mt-0.5 text-[11px] leading-snug text-text-muted line-clamp-2">
                            {ent.entityDescription}
                          </p>
                        )}
                        {ent.uri && (
                          <a
                            href={ent.uri}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-1 inline-flex items-center gap-1 text-[10px] text-accent hover:text-accent/80"
                          >
                            <ExternalLink size={9} className="shrink-0" />
                            Link
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Right — bordered box */}
                    {parsed ? (
                      <div
                        className="shrink-0 rounded-lg border sm:w-56"
                        style={{
                          borderColor: "rgba(15,23,42,0.12)",
                          backgroundColor: "rgba(248,247,244,0.85)",
                        }}
                      >
                        {hasStructured ? (
                          <>
                            {/* DATABASE / SCHEMA row */}
                            <div className="flex divide-x divide-border-default/50">
                              <div className="flex-1 px-3 py-2.5">
                                <p className="text-[9px] font-semibold uppercase tracking-[0.08em] text-text-muted">
                                  Database
                                </p>
                                <p className="mt-0.5 font-mono text-[12px] font-semibold text-text-primary truncate">
                                  {parsed.database ?? "—"}
                                </p>
                              </div>
                              <div className="flex-1 px-3 py-2.5">
                                <p className="text-[9px] font-semibold uppercase tracking-[0.08em] text-text-muted">
                                  Schema
                                </p>
                                <p className="mt-0.5 font-mono text-[12px] font-semibold text-text-primary truncate">
                                  {parsed.schema ?? "—"}
                                </p>
                              </div>
                            </div>

                            {/* Destination tables */}
                            <div
                              className="border-t px-3 py-2.5"
                              style={{ borderColor: "rgba(15,23,42,0.10)" }}
                            >
                              <p className="text-[9px] font-semibold uppercase tracking-[0.08em] text-text-muted">
                                Destination tables ({parsed.tables.length})
                              </p>
                              <div className="mt-1.5 flex flex-wrap gap-1">
                                {parsed.tables.length === 0 ? (
                                  <span className="text-[11px] text-text-muted">—</span>
                                ) : (
                                  parsed.tables.map((t) => (
                                    <span
                                      key={t}
                                      className="inline-flex items-center rounded-md border px-2 py-0.5 font-mono text-[11px] font-medium text-text-primary"
                                      style={{
                                        borderColor: "rgba(15,23,42,0.14)",
                                        backgroundColor: "rgba(255,255,255,0.7)",
                                      }}
                                    >
                                      {t}
                                    </span>
                                  ))
                                )}
                              </div>
                            </div>
                          </>
                        ) : (
                          /* Unstructured — show raw details as a single block */
                          <div className="px-3 py-2.5">
                            <p className="text-[9px] font-semibold uppercase tracking-[0.08em] text-text-muted mb-1">
                              Details
                            </p>
                            <p className="text-[11px] leading-relaxed text-text-secondary break-words">{parsed.raw}</p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-[11px] text-text-muted sm:w-56">No target details</span>
                    )}
                  </div>
                );
              })}
            </div>

            <p className="border-t border-border-default/60 px-4 py-2 text-[10px] text-text-muted">
              Per-stream last sync is not stored in catalog metadata; pipeline-level runs appear below.
            </p>
          </div>
        )}

        {/* Technical details */}
        <Section title="Technical Details">
          {editing ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs text-text-muted w-24 shrink-0">Direction</span>
                <EditInput value={editForm.dataDirection} onChange={(v) => setEditForm((f) => ({ ...f, dataDirection: v }))} />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-text-muted w-24 shrink-0">Connection</span>
                <EditInput value={editForm.connectionType} onChange={(v) => setEditForm((f) => ({ ...f, connectionType: v }))} />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-text-muted w-24 shrink-0">Environment</span>
                <EditInput value={editForm.dataEnvironment} onChange={(v) => setEditForm((f) => ({ ...f, dataEnvironment: v }))} />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-text-muted w-24 shrink-0">Refresh</span>
                <EditInput value={editForm.refreshFrequency} onChange={(v) => setEditForm((f) => ({ ...f, refreshFrequency: v }))} />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-text-muted w-24 shrink-0">Segment</span>
                <EditInput value={editForm.businessSegment} onChange={(v) => setEditForm((f) => ({ ...f, businessSegment: v }))} />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-text-muted w-24 shrink-0">Provider</span>
                <EditInput value={editForm.dataProvider} onChange={(v) => setEditForm((f) => ({ ...f, dataProvider: v }))} />
              </div>
            </div>
          ) : (
            <>
              <DetailRow label="Direction" value={entry.dataDirection} />
              <DetailRow label="Connection" value={entry.connectionType} />
              <DetailRow label="Environment" value={entry.dataEnvironment} />
              <DetailRow label="Refresh" value={entry.refreshFrequency} />
              <DetailRow label="Business Segment" value={entry.businessSegment} />
              <DetailRow label="Data Provider" value={entry.dataProvider} />
              {entry.slaHours != null && <DetailRow label="SLA" value={`${entry.slaHours}h`} />}
              {entry.priority && <DetailRow label="Priority" value={entry.priority} />}
            </>
          )}
        </Section>

        {/* Ownership */}
        <Section title="Ownership">
          {editing ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs text-text-muted w-24 shrink-0">Owner</span>
                <EditInput value={editForm.ownerName} onChange={(v) => setEditForm((f) => ({ ...f, ownerName: v }))} placeholder="Name" />
                <EditInput value={editForm.ownerEmail} onChange={(v) => setEditForm((f) => ({ ...f, ownerEmail: v }))} placeholder="Email" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-text-muted w-24 shrink-0">Engineer</span>
                <EditInput value={editForm.engineerName} onChange={(v) => setEditForm((f) => ({ ...f, engineerName: v }))} placeholder="Name" />
                <EditInput value={editForm.engineerEmail} onChange={(v) => setEditForm((f) => ({ ...f, engineerEmail: v }))} placeholder="Email" />
              </div>
            </div>
          ) : (
            <>
              {entry.ownerName && (
                <div className="flex items-center justify-between py-1">
                  <span className="text-xs text-text-muted">Owner</span>
                  <span className="text-xs text-text-primary flex items-center gap-1.5">
                    {entry.ownerName}
                    {entry.ownerEmail && (
                      <a href={`mailto:${entry.ownerEmail}`} className="text-accent hover:text-accent/80">
                        <Mail size={12} />
                      </a>
                    )}
                  </span>
                </div>
              )}
              {entry.engineerName && (
                <div className="flex items-center justify-between py-1">
                  <span className="text-xs text-text-muted">Engineer</span>
                  <span className="text-xs text-text-primary flex items-center gap-1.5">
                    {entry.engineerName}
                    {entry.engineerEmail && (
                      <a href={`mailto:${entry.engineerEmail}`} className="text-accent hover:text-accent/80">
                        <Mail size={12} />
                      </a>
                    )}
                  </span>
                </div>
              )}
            </>
          )}
        </Section>

        {/* Diagrams */}
        {diagrams.length > 0 && (
          <Section title="Diagrams">
            <div className="space-y-2">
              {diagrams.map((d) => (
                <DiagramCard key={d.diagramId} diagram={d} />
              ))}
            </div>
          </Section>
        )}

        {/* External Docs */}
        {documents.length > 0 && (
          <Section title="External Documentation">
            <div className="space-y-2">
              {documents.map((doc) => (
                <a
                  key={doc.documentId}
                  href={doc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-2.5 rounded-lg border border-border-default hover:bg-bg-primary transition-colors duration-200 group"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-text-primary truncate group-hover:text-accent transition-colors duration-200">
                      {doc.title}
                    </p>
                    <p className="text-[10px] font-medium uppercase tracking-[0.06em] text-text-muted mt-0.5">
                      {DOC_TYPE_LABELS[doc.docType ?? ""] ?? doc.docType ?? "Document"}
                    </p>
                  </div>
                  <ExternalLink size={14} className="text-text-muted shrink-0 group-hover:text-accent transition-colors duration-200" />
                </a>
              ))}
            </div>
          </Section>
        )}

        {/* Lineage mini-view */}
        {(upstream.length > 0 || downstream.length > 0) && (
          <Section title="Lineage">
            {upstream.length > 0 && (
              <div className="mb-2">
                <p className="text-[10px] text-text-muted mb-1">Upstream ({upstream.length})</p>
                {upstream.map((e) => {
                  const source = entryMap.get(e.sourceCatalogId);
                  return (
                    <button
                      key={e.lineageId}
                      onClick={() => source && onNavigateEntry?.(source)}
                      className="flex items-center gap-1.5 text-xs py-0.5 w-full text-left group"
                    >
                      <ArrowRight size={10} className="text-accent rotate-180 shrink-0" />
                      <span className="text-text-secondary group-hover:text-accent transition-colors duration-200 truncate">
                        {resolveEntryName(e.sourceCatalogId)}
                      </span>
                      <span className="text-[9px] text-text-muted ml-auto shrink-0">{e.relationshipType}</span>
                    </button>
                  );
                })}
              </div>
            )}
            {downstream.length > 0 && (
              <div>
                <p className="text-[10px] text-text-muted mb-1">Downstream ({downstream.length})</p>
                {downstream.map((e) => {
                  const target = entryMap.get(e.targetCatalogId);
                  return (
                    <button
                      key={e.lineageId}
                      onClick={() => target && onNavigateEntry?.(target)}
                      className="flex items-center gap-1.5 text-xs py-0.5 w-full text-left group"
                    >
                      <ArrowRight size={10} className="text-accent shrink-0" />
                      <span className="text-text-secondary group-hover:text-accent transition-colors duration-200 truncate">
                        {resolveEntryName(e.targetCatalogId)}
                      </span>
                      <span className="text-[9px] text-text-muted ml-auto shrink-0">{e.relationshipType}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </Section>
        )}
      </div>

      {/* Monitoring sparkline */}
      {sparklineData && sparklineData.length > 0 && (
        <div className="border-t border-border-default/80 px-5 py-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-[0.06em] text-text-muted">
              <Activity size={10} /> Recent runs
            </p>
            <span
              className="text-xs font-semibold"
              style={{
                color:
                  successRate != null && successRate >= 80
                    ? UAM.teal
                    : successRate != null && successRate >= 50
                      ? "#D97706"
                      : UAM.red,
              }}
            >
              {successRate}% success
            </span>
          </div>
          <div className="flex h-6 items-end gap-1">
            {sparklineData.map((d, i) => (
              <div
                key={i}
                className="flex-1 rounded-sm transition-colors duration-200"
                style={{
                  height: "100%",
                  backgroundColor: d.success ? "rgba(8,80,65,0.55)" : "rgba(121,31,31,0.55)",
                }}
                title={d.success ? "Success" : "Failed"}
              />
            ))}
          </div>
        </div>
      )}

      {/* Cross-link buttons */}
      <div className="flex shrink-0 gap-2 border-t border-border-default/80 px-5 py-3">
        <Link
          to={`/jobs?platform=${entry.platform}`}
          className="flex-1 flex items-center justify-center gap-1.5 h-8 rounded-lg bg-accent-muted text-accent text-xs font-medium hover:bg-accent/20 transition-colors duration-200"
        >
          View Performance
        </Link>
        <Link
          to="/job-status"
          className="flex-1 flex items-center justify-center gap-1.5 h-8 rounded-lg border border-border-default text-text-secondary text-xs font-medium hover:bg-bg-primary hover:text-text-primary transition-colors duration-200"
        >
          View Status
        </Link>
      </div>
    </div>
    </>
  );
}
