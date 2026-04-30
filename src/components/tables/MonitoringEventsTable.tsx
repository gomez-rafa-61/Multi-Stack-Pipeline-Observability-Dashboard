import { useState, useMemo } from "react";
import { X } from "lucide-react";
import { SearchInput } from "@/components/ui/SearchInput";
import { PlatformBadge } from "@/components/ui/PlatformBadge";
import { JobNameText } from "@/components/ui/JobNameText";
import { getPlatformMeta } from "@/config/platform-meta";
import type { MonitoringEvent } from "@/types/pipeline";

interface Props {
  data: MonitoringEvent[];
}

type SortKey = "platform" | "jobName" | "eventType" | "status" | "startTime" | "endTime" | "durationSeconds";
type SortDir = "asc" | "desc";

function statusColor(status: string): { bg: string; text: string } {
  switch (status) {
    case "SUCCESS":
      return { bg: "rgba(22,163,74,0.08)", text: "var(--color-success)" };
    case "FAILED":
      return { bg: "rgba(220,38,38,0.08)", text: "var(--color-danger)" };
    case "CANCELLED":
      return { bg: "rgba(217,119,6,0.08)", text: "var(--color-warning)" };
    default:
      return { bg: "rgba(161,161,170,0.08)", text: "var(--color-text-muted)" };
  }
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds.toFixed(0)}s`;
  if (seconds < 3600) return `${(seconds / 60).toFixed(1)}m`;
  return `${(seconds / 3600).toFixed(1)}h`;
}

function formatTimestamp(iso: string): string {
  if (!iso) return "\u2014";
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function parseMetadata(raw: Record<string, unknown> | string | null): Record<string, unknown> | null {
  if (!raw) return null;
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
  return raw;
}

function formatFullTimestamp(iso: string): string {
  if (!iso) return "\u2014";
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatDetailDuration(seconds: number): string {
  if (seconds < 60) return `${seconds.toFixed(0)} seconds`;
  if (seconds < 3600) {
    const m = Math.floor(seconds / 60);
    const s = Math.round(seconds % 60);
    return `${m}m ${s}s`;
  }
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  if (!value) return null;
  const useMono = ["Job Name", "Event Type"].includes(label);
  return (
    <div className="flex justify-between py-1.5">
      <span className="text-xs text-text-muted">{label}</span>
      <span className={`text-xs text-text-primary text-right max-w-[60%] truncate ${useMono ? "font-mono text-[11px]" : ""}`}>
        {value}
      </span>
    </div>
  );
}

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

// Keys that map to database / schema / destination table in platform metadata
const DB_KEYS    = new Set(["database", "db", "dest_db", "destination_db", "database_name"]);
const SCHEMA_KEYS = new Set(["schema", "schema_name", "dest_schema", "destination_schema"]);
const TABLE_KEYS  = new Set(["table", "table_name", "dest_table", "destination_table", "tables", "stream"]);

function extractDbInfo(meta: Record<string, unknown>): {
  database: string | null;
  schema: string | null;
  tables: string[];
  rest: [string, unknown][];
} {
  let database: string | null = null;
  let schema: string | null = null;
  const tables: string[] = [];
  const rest: [string, unknown][] = [];

  for (const [k, v] of Object.entries(meta)) {
    const lk = k.toLowerCase().replace(/[^a-z_]/g, "");
    const val = v != null && String(v).trim() !== "" && String(v) !== "null" ? String(v).trim() : null;
    if (DB_KEYS.has(lk) && val) {
      database = val;
    } else if (SCHEMA_KEYS.has(lk) && val) {
      schema = val;
    } else if (TABLE_KEYS.has(lk) && val) {
      tables.push(val);
    } else {
      rest.push([k, v]);
    }
  }
  return { database, schema, tables, rest };
}

function DbSchemaBox({ database, schema, tables }: { database: string | null; schema: string | null; tables: string[] }) {
  return (
    <div
      className="mt-3 rounded-lg border overflow-hidden"
      style={{ borderColor: "rgba(15,23,42,0.12)", backgroundColor: "rgba(248,247,244,0.85)" }}
    >
      {/* DATABASE / SCHEMA row */}
      <div className="flex divide-x" style={{ borderColor: "rgba(15,23,42,0.10)" }}>
        <div className="flex-1 px-3 py-2.5">
          <p className="text-[9px] font-semibold uppercase tracking-[0.08em] text-text-muted">Database</p>
          <p className="mt-0.5 font-mono text-[12px] font-semibold text-text-primary truncate">
            {database ?? "—"}
          </p>
        </div>
        <div className="flex-1 px-3 py-2.5" style={{ borderColor: "rgba(15,23,42,0.10)" }}>
          <p className="text-[9px] font-semibold uppercase tracking-[0.08em] text-text-muted">Schema</p>
          <p className="mt-0.5 font-mono text-[12px] font-semibold text-text-primary truncate">
            {schema ?? "—"}
          </p>
        </div>
      </div>

      {/* Destination tables */}
      <div className="border-t px-3 py-2.5" style={{ borderColor: "rgba(15,23,42,0.10)" }}>
        <p className="text-[9px] font-semibold uppercase tracking-[0.08em] text-text-muted">
          Destination tables ({tables.length})
        </p>
        <div className="mt-1.5 flex flex-wrap gap-1">
          {tables.length === 0 ? (
            <span className="text-[11px] text-text-muted">—</span>
          ) : (
            tables.map((t) => (
              <span
                key={t}
                className="inline-flex items-center rounded-md border px-2 py-0.5 font-mono text-[11px] font-medium text-text-primary"
                style={{ borderColor: "rgba(15,23,42,0.14)", backgroundColor: "rgba(255,255,255,0.7)" }}
              >
                {t}
              </span>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function EventDetailPanel({ event, onClose }: { event: MonitoringEvent; onClose: () => void }) {
  const sc = statusColor(event.status);
  const parsed = parseMetadata(event.platformMetadata);
  const { database, schema, tables, rest } = parsed
    ? extractDbInfo(parsed)
    : { database: null, schema: null, tables: [], rest: [] };
  const hasDbInfo = database || schema || tables.length > 0;

  return (
    <>
      <div className="fixed inset-0 bg-black/20 z-30" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 w-[420px] bg-white/95 backdrop-blur-xl border-l border-border-default z-40 flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-4 h-14 border-b border-border-default shrink-0">
          <h2 className="text-sm font-semibold text-text-primary truncate pr-4">{event.jobName}</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-bg-primary text-text-secondary hover:text-text-primary transition-colors duration-200 cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4">
          <div className="flex flex-wrap items-center gap-2 py-4 border-b border-border-default">
            <PlatformBadge platform={event.platform} />
            <span
              className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-[0.02em]"
              style={{ backgroundColor: sc.bg, color: sc.text, border: `1px solid ${sc.bg}` }}
            >
              {event.status}
            </span>
          </div>

          {/* Timing */}
          <Section title="Timing">
            <DetailRow label="Start Time" value={formatFullTimestamp(event.startTime)} />
            <DetailRow label="End Time" value={formatFullTimestamp(event.endTime)} />
            <DetailRow label="Duration" value={formatDetailDuration(Number(event.durationSeconds))} />
          </Section>

          {/* Event Details */}
          <Section title="Event Details">
            <DetailRow label="Platform" value={getPlatformMeta(event.platform).displayName} />
            <DetailRow label="Job Name" value={event.jobName} />
            <DetailRow label="Event Type" value={event.eventType} />
          </Section>

          {/* Platform Metadata */}
          {parsed && Object.keys(parsed).length > 0 && (
            <Section title="Platform Metadata">
              {/* Bordered DB/Schema/Table box */}
              {hasDbInfo && <DbSchemaBox database={database} schema={schema} tables={tables} />}

              {/* Remaining key-value pairs */}
              {rest.length > 0 && (
                <div className={`space-y-1.5 ${hasDbInfo ? "mt-3" : ""}`}>
                  {rest.map(([key, value]) => {
                    const val = value != null && String(value).trim() !== "" && String(value) !== "null"
                      ? String(value)
                      : null;
                    if (!val) return null;
                    return (
                      <div key={key} className="flex justify-between py-1">
                        <span className="text-xs text-text-muted font-mono whitespace-nowrap">{key}</span>
                        <span className="text-xs text-text-primary font-medium text-right truncate max-w-[60%]">
                          {val}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </Section>
          )}
        </div>
      </div>
    </>
  );
}

const COLUMNS: Array<{ key: SortKey; label: string }> = [
  { key: "platform", label: "Platform" },
  { key: "jobName", label: "Job Name" },
  { key: "eventType", label: "Event Type" },
  { key: "status", label: "Status" },
  { key: "startTime", label: "Start Time" },
  { key: "endTime", label: "End Time" },
  { key: "durationSeconds", label: "Duration" },
];

export function MonitoringEventsTable({ data }: Props) {
  const [search, setSearch] = useState("");
  const [platformFilter, setPlatformFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [sortKey, setSortKey] = useState<SortKey>("startTime");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  const platforms = useMemo(
    () => Array.from(new Set(data.map((d) => d.platform))).sort(),
    [data],
  );

  const filtered = useMemo(() => {
    let rows = data;
    if (platformFilter !== "ALL") {
      rows = rows.filter((r) => r.platform === platformFilter);
    }
    if (statusFilter !== "ALL") {
      rows = rows.filter((r) => r.status === statusFilter);
    }
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (r) =>
          r.jobName.toLowerCase().includes(q) ||
          r.platform.toLowerCase().includes(q) ||
          r.eventType.toLowerCase().includes(q),
      );
    }
    const numericKeys = new Set<string>(["durationSeconds"]);
    return [...rows].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (numericKeys.has(sortKey)) {
        return sortDir === "asc" ? Number(av) - Number(bv) : Number(bv) - Number(av);
      }
      return sortDir === "asc"
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av));
    });
  }, [data, search, platformFilter, statusFilter, sortKey, sortDir]);

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  function sortIndicator(key: SortKey) {
    if (sortKey !== key) return "";
    return sortDir === "asc" ? " \u2191" : " \u2193";
  }

  const selectedEvent = selectedIdx !== null ? filtered[selectedIdx] : null;

  return (
    <>
      <div className="bg-bg-surface border border-border-default rounded-[14px]">
        <div className="flex items-center justify-between p-4 border-b border-border-default">
          <h3 className="text-sm font-semibold text-text-primary">
            Current Activities
            <span className="text-text-muted font-normal ml-2 text-xs">
              Last 14 Days
            </span>
          </h3>
          <div className="flex items-center gap-3">
            <select
              value={platformFilter}
              onChange={(e) => setPlatformFilter(e.target.value)}
              className="h-8 px-3 bg-bg-primary border border-border-input rounded-lg text-sm text-text-primary outline-none focus:border-accent transition-colors duration-200 appearance-none cursor-pointer"
            >
              <option value="ALL">All Platforms</option>
              {platforms.map((p) => (
                <option key={p} value={p}>
                  {getPlatformMeta(p).displayName}
                </option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-8 px-3 bg-bg-primary border border-border-input rounded-lg text-sm text-text-primary outline-none focus:border-accent transition-colors duration-200 appearance-none cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="SUCCESS">Success</option>
              <option value="FAILED">Failed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search events..."
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border-default">
                {COLUMNS.map((col) => (
                  <th
                    key={col.key}
                    onClick={() => handleSort(col.key)}
                    className="text-left text-[10px] font-medium uppercase tracking-[0.06em] text-text-muted px-4 py-3 cursor-pointer select-none hover:text-text-primary transition-colors duration-150"
                  >
                    {col.label}
                    {sortIndicator(col.key)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((row, i) => {
                const sc = statusColor(row.status);
                const isSelected = selectedIdx === i;
                return (
                  <tr
                    key={`${row.platform}-${row.jobName}-${row.startTime}-${i}`}
                    onClick={() => setSelectedIdx(isSelected ? null : i)}
                    className={`border-b border-border-default transition-all duration-150 cursor-pointer ${
                      isSelected
                        ? "bg-accent-muted border-l-2 border-l-accent"
                        : "hover:bg-bg-primary/50 hover:-translate-y-px hover:shadow-[0_2px_12px_rgba(0,0,0,0.04)]"
                    }`}
                  >
                    <td className="px-4 py-3.5">
                      <PlatformBadge platform={row.platform} compact />
                    </td>
                    <td className="px-4 py-3.5 max-w-[350px]">
                      <JobNameText title={row.jobName}>
                        {row.jobName}
                      </JobNameText>
                    </td>
                    <td className="px-4 py-3.5 text-sm text-text-secondary whitespace-nowrap">
                      {row.eventType}
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className="inline-block px-2 py-0.5 rounded text-xs font-semibold"
                        style={{ backgroundColor: sc.bg, color: sc.text }}
                      >
                        {row.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-sm text-text-secondary font-mono tabular-nums whitespace-nowrap">
                      {formatTimestamp(row.startTime)}
                    </td>
                    <td className="px-4 py-3.5 text-sm text-text-secondary font-mono tabular-nums whitespace-nowrap">
                      {formatTimestamp(row.endTime)}
                    </td>
                    <td className="px-4 py-3.5 text-sm text-text-secondary font-mono tabular-nums whitespace-nowrap">
                      {formatDuration(Number(row.durationSeconds))}
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={COLUMNS.length}
                    className="px-4 py-8 text-center text-sm text-text-muted"
                  >
                    No events found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="px-4 py-3 border-t border-border-default">
          <p className="text-xs text-text-muted">
            Showing {filtered.length} of {data.length} events
          </p>
        </div>
      </div>

      {selectedEvent && (
        <EventDetailPanel
          event={selectedEvent}
          onClose={() => setSelectedIdx(null)}
        />
      )}
    </>
  );
}
