import { useState, useMemo, useEffect } from "react";
import {
  ChevronRight,
  ChevronDown,
  FolderOpen,
} from "lucide-react";
import { SearchInput } from "@/components/ui/SearchInput";
import { getPlatformDisplayName } from "@/config/platform-meta";
import type { JobPerformanceRecord } from "@/types/pipeline";

interface Props {
  data: JobPerformanceRecord[];
  initialPlatform?: string;
}

type SortKey = keyof JobPerformanceRecord;
type SortDir = "asc" | "desc";

function rateBackground(rate: number): string {
  if (rate >= 99) return "rgba(46,173,110,0.1)";
  if (rate >= 95) return "rgba(245,166,35,0.1)";
  return "rgba(231,76,60,0.1)";
}

function rateColor(rate: number): string {
  if (rate >= 99) return "var(--color-success)";
  if (rate >= 95) return "var(--color-warning)";
  return "var(--color-danger)";
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds.toFixed(0)}s`;
  return `${(seconds / 60).toFixed(1)}m`;
}

function formatRelativeTime(iso: string): string {
  if (!iso) return "Never";
  const diff = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return "Just now";
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

interface SolutionPerfGroup {
  solutionId: string;
  solutionName: string;
  jobs: JobPerformanceRecord[];
  totalRuns: number;
  failedRuns: number;
  successRatePct: number;
}

function groupBySolution(rows: JobPerformanceRecord[]): SolutionPerfGroup[] {
  const map = new Map<string, SolutionPerfGroup>();
  for (const row of rows) {
    const id = row.solutionId ?? "_ungrouped";
    const name = row.solutionName ?? "Ungrouped Flows";
    if (!map.has(id)) {
      map.set(id, {
        solutionId: id,
        solutionName: name,
        jobs: [],
        totalRuns: 0,
        failedRuns: 0,
        successRatePct: 0,
      });
    }
    const g = map.get(id)!;
    g.jobs.push(row);
    g.totalRuns += Number(row.totalRuns);
    g.failedRuns += Number(row.failedRuns);
  }
  for (const g of map.values()) {
    const successRuns = g.jobs.reduce((s, r) => s + Number(r.successfulRuns), 0);
    g.successRatePct = g.totalRuns > 0
      ? Math.round((successRuns / g.totalRuns) * 1000) / 10
      : 0;
  }
  return [...map.values()].sort((a, b) => a.solutionName.localeCompare(b.solutionName));
}

export function JobPerformanceTable({ data, initialPlatform }: Props) {
  const [search, setSearch] = useState("");
  const [platformFilter, setPlatformFilter] = useState<string>(
    initialPlatform ?? "ALL"
  );
  const [sortKey, setSortKey] = useState<SortKey>("totalRuns");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  useEffect(() => {
    setPlatformFilter(initialPlatform ?? "ALL");
    setCollapsed(new Set());
  }, [initialPlatform]);

  const platforms = useMemo(
    () => Array.from(new Set(data.map((d) => d.platform))).sort(),
    [data]
  );

  const filtered = useMemo(() => {
    let rows = data;
    if (platformFilter !== "ALL") {
      rows = rows.filter((r) => r.platform === platformFilter);
    }
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (r) =>
          r.jobName.toLowerCase().includes(q) ||
          r.platform.toLowerCase().includes(q) ||
          (r.solutionName ?? "").toLowerCase().includes(q)
      );
    }
    const numericKeys = new Set([
      "totalRuns", "successfulRuns", "failedRuns", "successRatePct",
      "avgDurationSeconds", "maxDurationSeconds",
    ]);
    const sorted = [...rows].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (numericKeys.has(sortKey)) {
        return sortDir === "asc" ? Number(av) - Number(bv) : Number(bv) - Number(av);
      }
      return sortDir === "asc"
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av));
    });
    return sorted;
  }, [data, search, platformFilter, sortKey, sortDir]);

  const isPowerAutomate = platformFilter === "POWER_AUTOMATE";
  const solutionGroups = useMemo(
    () => (isPowerAutomate ? groupBySolution(filtered) : []),
    [isPowerAutomate, filtered],
  );

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
    return sortDir === "asc" ? " ↑" : " ↓";
  }

  function toggleGroup(solutionId: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(solutionId)) next.delete(solutionId);
      else next.add(solutionId);
      return next;
    });
  }

  const columns: Array<{ key: SortKey; label: string }> = isPowerAutomate
    ? [
        { key: "jobName", label: "Flow Name" },
        { key: "totalRuns", label: "Runs" },
        { key: "successRatePct", label: "Success Rate" },
        { key: "avgDurationSeconds", label: "Avg Duration" },
        { key: "maxDurationSeconds", label: "Max Duration" },
        { key: "failedRuns", label: "Failures" },
        { key: "lastRunTime", label: "Last Run" },
      ]
    : [
        { key: "platform", label: "Platform" },
        { key: "jobName", label: "Job Name" },
        { key: "totalRuns", label: "Runs" },
        { key: "successRatePct", label: "Success Rate" },
        { key: "avgDurationSeconds", label: "Avg Duration" },
        { key: "maxDurationSeconds", label: "Max Duration" },
        { key: "failedRuns", label: "Failures" },
        { key: "lastRunTime", label: "Last Run" },
      ];

  const colCount = columns.length;

  return (
    <div className="bg-bg-surface border border-border-default rounded-xl">
      <div className="flex items-center justify-between p-4 border-b border-border-default">
        <h3 className="text-sm font-semibold text-text-primary">
          Job Performance
          <span className="text-text-muted font-normal ml-2 text-xs">
            30 Days
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
                {getPlatformDisplayName(p)}
              </option>
            ))}
          </select>
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search jobs..."
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border-default">
              {columns.map((col) => (
                <th
                  key={col.key}
                  onClick={() => handleSort(col.key)}
                  className="text-left text-[10px] font-bold uppercase tracking-[0.1em] text-text-muted px-4 py-3 cursor-pointer select-none hover:text-text-secondary transition-colors duration-200"
                >
                  {col.label}
                  {sortIndicator(col.key)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isPowerAutomate ? (
              solutionGroups.map((group) => {
                const isOpen = !collapsed.has(group.solutionId);
                return (
                  <SolutionPerfRows
                    key={group.solutionId}
                    group={group}
                    isOpen={isOpen}
                    colCount={colCount}
                    onToggle={() => toggleGroup(group.solutionId)}
                  />
                );
              })
            ) : (
              filtered.map((row) => (
                <PerfRow
                  key={`${row.platform}-${row.jobName}`}
                  row={row}
                  showPlatform
                  indent={false}
                />
              ))
            )}
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={colCount}
                  className="px-4 py-8 text-center text-sm text-text-muted"
                >
                  No jobs found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SolutionPerfRows({
  group,
  isOpen,
  colCount,
  onToggle,
}: {
  group: SolutionPerfGroup;
  isOpen: boolean;
  colCount: number;
  onToggle: () => void;
}) {
  const displayName = group.solutionName.replace(/^ADO\d+[\w/]*-\s*/, "");
  return (
    <>
      <tr
        onClick={onToggle}
        className="border-b border-border-default bg-bg-primary/50 cursor-pointer hover:bg-surface-hover transition-colors duration-200"
      >
        <td className="px-4 py-2.5">
          <div className="flex items-center gap-2.5">
            {isOpen ? (
              <ChevronDown size={14} className="text-accent shrink-0" />
            ) : (
              <ChevronRight size={14} className="text-text-muted shrink-0" />
            )}
            <FolderOpen size={14} className="text-accent shrink-0" />
            <span className="text-sm font-semibold text-text-primary">
              {displayName}
            </span>
            <span className="text-[10px] font-mono text-text-muted">
              {group.solutionId}
            </span>
          </div>
        </td>
        <td className="px-4 py-2.5 text-sm text-text-secondary tabular-nums font-semibold">
          {group.totalRuns}
        </td>
        <td className="px-4 py-2.5">
          {group.totalRuns > 0 ? (
            <span
              className="inline-block px-2 py-0.5 rounded text-xs font-semibold tabular-nums"
              style={{
                backgroundColor: rateBackground(group.successRatePct),
                color: rateColor(group.successRatePct),
              }}
            >
              {group.successRatePct.toFixed(1)}%
            </span>
          ) : (
            <span
              className="inline-block px-2 py-0.5 rounded text-xs font-semibold text-text-muted"
              style={{ backgroundColor: "rgba(158,168,181,0.1)" }}
            >
              —
            </span>
          )}
        </td>
        <td className="px-4 py-2.5" />
        <td className="px-4 py-2.5" />
        <td className="px-4 py-2.5 text-sm tabular-nums font-semibold">
          <span className={group.failedRuns > 0 ? "text-danger" : "text-text-muted"}>
            {group.failedRuns}
          </span>
        </td>
        <td className="px-4 py-2.5 text-xs text-text-muted tabular-nums">
          {group.jobs.length} flows
        </td>
      </tr>
      {isOpen &&
        group.jobs.map((row) => (
          <PerfRow
            key={`${row.platform}-${row.jobName}`}
            row={row}
            showPlatform={false}
            indent
          />
        ))}
    </>
  );
}

function PerfRow({
  row,
  showPlatform,
  indent,
}: {
  row: JobPerformanceRecord;
  showPlatform: boolean;
  indent: boolean;
}) {
  const noRuns = Number(row.totalRuns) === 0;
  return (
    <tr
      className={`border-b border-border-default transition-colors duration-200 hover:bg-surface-hover ${
        noRuns ? "opacity-50" : ""
      }`}
    >
      {showPlatform ? (
        <>
          <td className="px-4 py-3 text-sm text-text-secondary whitespace-nowrap">
            {getPlatformDisplayName(row.platform)}
          </td>
          <td className="px-4 py-3 text-sm text-text-primary font-medium whitespace-nowrap">
            {row.jobName}
          </td>
        </>
      ) : (
        <td className="px-4 py-3 text-sm text-text-primary font-medium whitespace-nowrap">
          {indent && <span className="inline-block w-4" />}
          {row.jobName}
        </td>
      )}
      <td className="px-4 py-3 text-sm text-text-secondary tabular-nums">
        {noRuns ? "—" : Number(row.totalRuns)}
      </td>
      <td className="px-4 py-3">
        {noRuns ? (
          <span
            className="inline-block px-2 py-0.5 rounded text-xs font-semibold text-text-muted"
            style={{ backgroundColor: "rgba(158,168,181,0.1)" }}
          >
            Inactive
          </span>
        ) : (
          <span
            className="inline-block px-2 py-0.5 rounded text-xs font-semibold tabular-nums"
            style={{
              backgroundColor: rateBackground(Number(row.successRatePct)),
              color: rateColor(Number(row.successRatePct)),
            }}
          >
            {Number(row.successRatePct).toFixed(1)}%
          </span>
        )}
      </td>
      <td className="px-4 py-3 text-sm text-text-secondary tabular-nums">
        {noRuns ? "—" : formatDuration(Number(row.avgDurationSeconds))}
      </td>
      <td className="px-4 py-3 text-sm text-text-secondary tabular-nums">
        {noRuns ? "—" : formatDuration(Number(row.maxDurationSeconds))}
      </td>
      <td className="px-4 py-3 text-sm tabular-nums">
        {noRuns ? (
          <span className="text-text-muted">—</span>
        ) : (
          <span
            className={
              Number(row.failedRuns) > 0 ? "text-danger" : "text-text-muted"
            }
          >
            {Number(row.failedRuns)}
          </span>
        )}
      </td>
      <td className="px-4 py-3 text-sm text-text-muted whitespace-nowrap">
        {noRuns ? "Never" : formatRelativeTime(row.lastRunTime)}
      </td>
    </tr>
  );
}
