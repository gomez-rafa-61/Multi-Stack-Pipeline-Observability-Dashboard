import { useState, useMemo, useEffect } from "react";
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
  if (rate >= 99) return "rgba(74,222,128,0.1)";
  if (rate >= 95) return "rgba(251,191,36,0.1)";
  return "rgba(248,113,113,0.1)";
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
  const diff = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return "Just now";
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function JobPerformanceTable({ data, initialPlatform }: Props) {
  const [search, setSearch] = useState("");
  const [platformFilter, setPlatformFilter] = useState<string>(
    initialPlatform ?? "ALL"
  );
  const [sortKey, setSortKey] = useState<SortKey>("successRatePct");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  useEffect(() => {
    setPlatformFilter(initialPlatform ?? "ALL");
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
          r.platform.toLowerCase().includes(q)
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

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  function sortIndicator(key: SortKey) {
    if (sortKey !== key) return "";
    return sortDir === "asc" ? " ↑" : " ↓";
  }

  const columns: Array<{ key: SortKey; label: string }> = [
    { key: "platform", label: "Platform" },
    { key: "jobName", label: "Job Name" },
    { key: "totalRuns", label: "Runs" },
    { key: "successRatePct", label: "Success Rate" },
    { key: "avgDurationSeconds", label: "Avg Duration" },
    { key: "maxDurationSeconds", label: "Max Duration" },
    { key: "failedRuns", label: "Failures" },
    { key: "lastRunTime", label: "Last Run" },
  ];

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
            className="h-8 px-3 bg-border-default border border-border-input rounded-lg text-sm text-text-primary outline-none focus:border-accent transition-colors duration-200 appearance-none cursor-pointer"
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
            {filtered.map((row) => (
              <tr
                key={`${row.platform}-${row.jobName}`}
                className="border-b border-border-default transition-colors duration-200 hover:bg-surface-hover"
              >
                <td className="px-4 py-3 text-sm text-text-secondary whitespace-nowrap">
                  {getPlatformDisplayName(row.platform)}
                </td>
                <td className="px-4 py-3 text-sm text-text-primary font-medium whitespace-nowrap">
                  {row.jobName}
                </td>
                <td className="px-4 py-3 text-sm text-text-secondary tabular-nums">
                  {Number(row.totalRuns)}
                </td>
                <td className="px-4 py-3">
                  <span
                    className="inline-block px-2 py-0.5 rounded text-xs font-semibold tabular-nums"
                    style={{
                      backgroundColor: rateBackground(Number(row.successRatePct)),
                      color: rateColor(Number(row.successRatePct)),
                    }}
                  >
                    {Number(row.successRatePct).toFixed(1)}%
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-text-secondary tabular-nums">
                  {formatDuration(Number(row.avgDurationSeconds))}
                </td>
                <td className="px-4 py-3 text-sm text-text-secondary tabular-nums">
                  {formatDuration(Number(row.maxDurationSeconds))}
                </td>
                <td className="px-4 py-3 text-sm tabular-nums">
                  <span
                    className={
                      Number(row.failedRuns) > 0 ? "text-danger" : "text-text-muted"
                    }
                  >
                    {Number(row.failedRuns)}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-text-muted whitespace-nowrap">
                  {formatRelativeTime(row.lastRunTime)}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={8}
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
