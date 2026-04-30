import { useState, useMemo } from "react";
import { ChevronUp, ChevronDown, CheckCircle2, AlertTriangle, Clock } from "lucide-react";
import { getPlatformMeta } from "@/config/platform-meta";
import { PlatformBadge } from "@/components/ui/PlatformBadge";
import { QualityScoreRing } from "@/components/catalog/QualityScoreRing";
import type { CatalogEntry } from "@/types/pipeline";

const STATUS_CFG: Record<string, { bg: string; text: string; border: string; icon: typeof CheckCircle2 }> = {
  ACTIVE: { bg: "rgba(8,80,65,0.1)", text: "#085041", border: "rgba(8,80,65,0.22)", icon: CheckCircle2 },
  DEPRECATED: { bg: "rgba(121,31,31,0.1)", text: "#791F1F", border: "rgba(121,31,31,0.25)", icon: AlertTriangle },
  PLANNED: { bg: "rgba(37,99,235,0.08)", text: "#2563EB", border: "rgba(37,99,235,0.2)", icon: Clock },
};

const ACCENT = "#3B82F6";
const ACCENT_BG = "#EFF6FF";

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days < 1) return "today";
  if (days === 1) return "1 day ago";
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return months === 1 ? "1 month ago" : `${months}mo ago`;
}

type SortKey =
  | "platform"
  | "dataProvider"
  | "pipelineName"
  | "pipelineDescription"
  | "businessSegment"
  | "connectionType"
  | "catalogStatus"
  | "refreshFrequency"
  | "quality";

type SortDir = "asc" | "desc";

interface Props {
  data: CatalogEntry[];
  qualityScores: Map<string, number>;
  onSelect: (entry: CatalogEntry) => void;
  selectedId: string | null;
  loading?: boolean;
  /** Landing template: fewer columns, unified catalog card. */
  variant?: "full" | "landing";
}

const FULL_COLUMNS: { key: SortKey; label: string }[] = [
  { key: "platform", label: "Platform" },
  { key: "dataProvider", label: "Data Provider" },
  { key: "pipelineName", label: "Pipeline" },
  { key: "pipelineDescription", label: "Description" },
  { key: "businessSegment", label: "Business Segment" },
  { key: "connectionType", label: "Connection Type" },
  { key: "catalogStatus", label: "Status" },
  { key: "refreshFrequency", label: "Refresh" },
];

const LANDING_COLUMNS: { key: SortKey; label: string }[] = [
  { key: "platform", label: "Platform" },
  { key: "pipelineName", label: "Pipeline identity" },
  { key: "businessSegment", label: "Business segment" },
  { key: "catalogStatus", label: "Status" },
  { key: "refreshFrequency", label: "Next sync" },
];

function TH({
  label,
  sortKey,
  currentSort,
  currentDir,
  onSort,
  landing,
}: {
  label: string;
  sortKey: SortKey;
  currentSort: SortKey;
  currentDir: SortDir;
  onSort: (k: SortKey) => void;
  landing?: boolean;
}) {
  const active = currentSort === sortKey;
  const pad = landing ? "px-6 py-4" : "px-4 py-3";
  return (
    <th
      className={`text-left text-[11px] font-medium uppercase tracking-[0.05em] ${pad} cursor-pointer select-none whitespace-nowrap transition-colors duration-150 ${landing ? "text-[#64748B]" : "text-text-muted hover:text-text-primary"}`}
      onClick={() => onSort(sortKey)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {active && (currentDir === "asc" ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
      </span>
    </th>
  );
}

function SkeletonRow({ cols, landing }: { cols: number; landing: boolean }) {
  const pad = landing ? "px-6 py-4" : "px-4 py-3.5";
  const border = landing ? "border-[#E2E8F0]" : "border-border-default";
  return (
    <tr className={`border-b ${border}`}>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className={pad}>
          <div
            className="h-4 rounded bg-gradient-to-r from-slate-100 via-slate-200 to-slate-100 bg-[length:200%_100%] animate-shimmer"
            style={{ width: `${50 + (i * 7) % 40}%` }}
          />
        </td>
      ))}
    </tr>
  );
}

function compareStr(a: string | null | undefined, b: string | null | undefined, dir: number): number {
  const av = (a ?? "").toLowerCase();
  const bv = (b ?? "").toLowerCase();
  return dir * av.localeCompare(bv);
}

function pipelineSubtitle(row: CatalogEntry): string {
  const sub = row.dataProvider?.trim() || row.connectionType?.trim() || row.pipelineDescription?.trim();
  if (!sub) return "\u2014";
  return sub.length > 56 ? `${sub.slice(0, 54)}…` : sub;
}

export function CatalogTable({
  data,
  qualityScores,
  onSelect,
  selectedId,
  loading,
  variant = "full",
}: Props) {
  const landing = variant === "landing";
  const [sortKey, setSortKey] = useState<SortKey>(landing ? "pipelineName" : "platform");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const sorted = useMemo(() => {
    const copy = [...data];
    const dir = sortDir === "asc" ? 1 : -1;

    copy.sort((a, b) => {
      if (sortKey === "quality") {
        return dir * ((qualityScores.get(a.catalogId) ?? 0) - (qualityScores.get(b.catalogId) ?? 0));
      }

      const primary = compareStr(a[sortKey] as string, b[sortKey] as string, dir);
      if (primary !== 0) return primary;

      const platformCmp = compareStr(a.platform, b.platform, 1);
      if (platformCmp !== 0) return platformCmp;
      return compareStr(a.pipelineName, b.pipelineName, 1);
    });

    return copy;
  }, [data, sortKey, sortDir, qualityScores]);

  const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;
  const now = Date.now();
  const columns = landing ? LANDING_COLUMNS : FULL_COLUMNS;
  const colCount = landing ? 5 : 10;

  const table = (
    <table className="w-full border-collapse text-left">
      <thead className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
        <tr>
          {columns.map((col) => (
            <TH
              key={col.key}
              label={col.label}
              sortKey={col.key}
              currentSort={sortKey}
              currentDir={sortDir}
              onSort={handleSort}
              landing={landing}
            />
          ))}
          {!landing && (
            <>
              <th className="px-4 py-3 text-left text-[10px] font-medium uppercase tracking-[0.06em] text-text-muted whitespace-nowrap">
                Documented
              </th>
              <TH
                label="Quality"
                sortKey="quality"
                currentSort={sortKey}
                currentDir={sortDir}
                onSort={handleSort}
              />
            </>
          )}
        </tr>
      </thead>
      <tbody className="text-[13px]">
        {loading &&
          data.length === 0 &&
          Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} cols={colCount} landing={landing} />)}

        {sorted.map((row) => {
          const isStale = !row.lastCatalogUpdate || now - new Date(row.lastCatalogUpdate).getTime() > NINETY_DAYS_MS;
          const statusCfg = STATUS_CFG[row.catalogStatus] ?? STATUS_CFG.ACTIVE;
          const StatusIcon = statusCfg.icon;
          const score = qualityScores.get(row.catalogId) ?? 0;
          const isSelected = row.catalogId === selectedId;
          const isDeprecated = row.catalogStatus === "DEPRECATED";
          const isActive = row.catalogStatus === "ACTIVE";
          const meta = getPlatformMeta(row.platform);

          if (landing) {
            return (
              <tr
                key={row.catalogId}
                onClick={() => onSelect(row)}
                className={`cursor-pointer border-b border-[#E2E8F0] transition-colors duration-150 ${
                  isSelected ? "bg-[#EFF6FF]/80" : "hover:bg-[#F8FAFC]"
                } ${isDeprecated ? "opacity-65" : ""}`}
              >
                <td className="whitespace-nowrap px-6 py-4">
                  <span
                    className="inline-flex items-center rounded px-2 py-1 text-xs font-bold"
                    style={{ color: ACCENT, backgroundColor: ACCENT_BG }}
                  >
                    {meta.displayName}
                  </span>
                </td>
                <td className="max-w-[320px] px-6 py-4">
                  <div className={`font-semibold text-[#0F172A] ${isDeprecated ? "line-through" : ""}`}>
                    {row.pipelineName}
                  </div>
                  <div className="mt-0.5 font-mono text-[11px] text-[#64748B]">{pipelineSubtitle(row)}</div>
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-[#475569]">{row.businessSegment ?? "\u2014"}</td>
                <td className="whitespace-nowrap px-6 py-4">
                  {isActive ? (
                    <div className="flex items-center gap-1.5 font-semibold" style={{ color: "#085041" }}>
                      <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: "#085041" }} />
                      ACTIVE
                    </div>
                  ) : (
                    <span
                      className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase"
                      style={{
                        backgroundColor: statusCfg.bg,
                        color: statusCfg.text,
                        border: `1px solid ${statusCfg.border}`,
                      }}
                    >
                      <StatusIcon size={11} />
                      {row.catalogStatus}
                    </span>
                  )}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-[#64748B]">
                  {row.refreshFrequency ?? "\u2014"}
                </td>
              </tr>
            );
          }

          return (
            <tr
              key={row.catalogId}
              onClick={() => onSelect(row)}
              className={`cursor-pointer border-b border-border-default transition-all duration-200 ${
                isSelected
                  ? "border-l-2 border-l-accent bg-accent-muted"
                  : "hover:-translate-y-px hover:bg-bg-primary/50 hover:shadow-[0_2px_12px_rgba(0,0,0,0.04)]"
              } ${isDeprecated ? "opacity-60" : ""}`}
            >
              <td className="whitespace-nowrap px-4 py-3.5">
                <PlatformBadge platform={row.platform} />
              </td>
              <td className="whitespace-nowrap px-4 py-3.5 text-sm text-text-secondary">
                {row.dataProvider ?? "\u2014"}
              </td>
              <td className="max-w-[240px] px-4 py-3.5">
                <p className={`truncate text-sm font-medium text-text-primary ${isDeprecated ? "line-through" : ""}`}>
                  {row.pipelineName}
                </p>
              </td>
              <td className="max-w-[260px] px-4 py-3.5">
                <p className="truncate text-sm text-text-secondary">{row.pipelineDescription ?? "\u2014"}</p>
              </td>
              <td className="whitespace-nowrap px-4 py-3.5 text-sm text-text-secondary">
                {row.businessSegment ?? "\u2014"}
              </td>
              <td className="whitespace-nowrap px-4 py-3.5 text-sm text-text-secondary">
                {row.connectionType ?? "\u2014"}
              </td>
              <td className="whitespace-nowrap px-4 py-3.5">
                <span
                  className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase"
                  style={{ backgroundColor: statusCfg.bg, color: statusCfg.text, border: `1px solid ${statusCfg.border}` }}
                >
                  {isActive && (
                    <span
                      className="h-1.5 w-1.5 animate-pulse-dot rounded-full"
                      style={{ backgroundColor: statusCfg.text }}
                    />
                  )}
                  <StatusIcon size={11} />
                  {row.catalogStatus}
                </span>
              </td>
              <td className="whitespace-nowrap px-4 py-3.5 text-sm text-text-secondary">
                {row.refreshFrequency ?? "\u2014"}
              </td>
              <td className="px-4 py-3.5">
                <div className="flex flex-col gap-0.5">
                  <span className="flex items-center gap-1.5">
                    {row.isDocumented ? (
                      <CheckCircle2 size={14} className="text-success" />
                    ) : (
                      <AlertTriangle size={14} className="text-danger" />
                    )}
                    {isStale && (
                      <span className="inline-flex items-center gap-0.5 rounded-full border border-warning/20 bg-warning-muted px-1.5 py-0.5 text-[9px] font-bold uppercase text-warning">
                        <Clock size={9} />
                        Stale
                      </span>
                    )}
                  </span>
                  {isDeprecated && row.deprecationDate && (
                    <span className="text-[10px] text-danger/70">
                      Sunset{" "}
                      {new Date(row.deprecationDate).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  )}
                  {!isStale && row.lastCatalogUpdate && (
                    <span className="text-[10px] text-text-muted">Updated {timeAgo(row.lastCatalogUpdate)}</span>
                  )}
                </div>
              </td>
              <td className="px-4 py-3.5">
                <QualityScoreRing score={score} size={32} />
              </td>
            </tr>
          );
        })}
        {!loading && sorted.length === 0 && (
          <tr>
            <td colSpan={colCount} className="px-6 py-10 text-center text-sm text-[#64748B]">
              No catalog entries found
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );

  if (landing) {
    return <div className="overflow-x-auto">{table}</div>;
  }

  return (
    <div className="overflow-hidden rounded-[14px] border border-white/80 bg-white/75 shadow-[var(--shadow-card)] backdrop-blur-md">
      <div className="overflow-x-auto">{table}</div>
    </div>
  );
}
