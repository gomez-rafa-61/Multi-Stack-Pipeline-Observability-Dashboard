import { useState, useMemo, useEffect } from "react";
import {
  ChevronRight,
  ChevronDown,
  FolderOpen,
  Tag,
} from "lucide-react";
import { SearchInput } from "@/components/ui/SearchInput";
import { PlatformBadge } from "@/components/ui/PlatformBadge";
import { JobNameText } from "@/components/ui/JobNameText";
import { getPlatformDisplayName } from "@/config/platform-meta";
import type { JobPerformanceRecord, JobRegistryRecord } from "@/types/pipeline";

interface Props {
  data: JobPerformanceRecord[];
  registry?: JobRegistryRecord[];
  initialPlatform?: string;
}

type SortKey = keyof JobPerformanceRecord;
type SortDir = "asc" | "desc";

function rateBackground(rate: number): string {
  if (rate >= 99) return "rgba(22,163,74,0.08)";
  if (rate >= 95) return "rgba(217,119,6,0.08)";
  return "rgba(220,38,38,0.08)";
}

function rateColor(rate: number): string {
  if (rate >= 99) return "#16A34A";
  if (rate >= 95) return "#D97706";
  return "#DC2626";
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

interface PerfJobGroup {
  groupId: string;
  groupTitle: string;
  groupSubtitle?: string;
  kind: "solution" | "tag";
  jobs: JobPerformanceRecord[];
  totalRuns: number;
  failedRuns: number;
  successRatePct: number;
}

function finalizePerfGroups(map: Map<string, PerfJobGroup>): PerfJobGroup[] {
  for (const g of map.values()) {
    const successRuns = g.jobs.reduce((s, r) => s + Number(r.successfulRuns), 0);
    g.successRatePct = g.totalRuns > 0
      ? Math.round((successRuns / g.totalRuns) * 1000) / 10
      : 0;
  }
  return [...map.values()].sort((a, b) => a.groupTitle.localeCompare(b.groupTitle));
}

function groupBySolution(rows: JobPerformanceRecord[]): PerfJobGroup[] {
  const map = new Map<string, PerfJobGroup>();
  for (const row of rows) {
    const id = row.solutionId ?? "_ungrouped";
    const title = row.solutionName ?? "Ungrouped flows";
    if (!map.has(id)) {
      map.set(id, {
        groupId: id,
        groupTitle: title,
        groupSubtitle: id !== "_ungrouped" ? id : undefined,
        kind: "solution",
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
  return finalizePerfGroups(map);
}

function groupBySnowflakeTag(rows: JobPerformanceRecord[]): PerfJobGroup[] {
  const map = new Map<string, PerfJobGroup>();
  for (const row of rows) {
    const raw = row.tag?.trim();
    const id = raw ? `tag:${raw}` : "_untagged";
    const title = raw || "Ungrouped jobs";
    if (!map.has(id)) {
      map.set(id, {
        groupId: id,
        groupTitle: title,
        kind: "tag",
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
  return finalizePerfGroups(map);
}

function jobKey(platform: string, jobName: string): string {
  return `${platform.toUpperCase()}\0${jobName.trim().toUpperCase()}`;
}

function mergeSnowflakeTagsFromRegistry(
  rows: JobPerformanceRecord[],
  registry: JobRegistryRecord[],
): JobPerformanceRecord[] {
  if (registry.length === 0) return rows;
  const tagByJob = new Map<string, string>();
  for (const j of registry) {
    if (j.platform !== "SNOWFLAKE") continue;
    const t = j.tag?.trim();
    if (!t) continue;
    tagByJob.set(jobKey("SNOWFLAKE", j.jobName), t);
  }
  if (tagByJob.size === 0) return rows;
  return rows.map((row) => {
    if (row.platform !== "SNOWFLAKE" || row.tag?.trim()) return row;
    const t = tagByJob.get(jobKey(row.platform, row.jobName));
    return t ? { ...row, tag: t } : row;
  });
}

export function JobPerformanceTable({
  data,
  registry = [],
  initialPlatform,
}: Props) {
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

  const dataWithTags = useMemo(
    () => mergeSnowflakeTagsFromRegistry(data, registry),
    [data, registry],
  );

  const platforms = useMemo(
    () => Array.from(new Set(dataWithTags.map((d) => d.platform))).sort(),
    [dataWithTags],
  );

  const filtered = useMemo(() => {
    let rows = dataWithTags;
    if (platformFilter !== "ALL") {
      rows = rows.filter((r) => r.platform === platformFilter);
    }
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (r) =>
          r.jobName.toLowerCase().includes(q) ||
          r.platform.toLowerCase().includes(q) ||
          (r.solutionName ?? "").toLowerCase().includes(q) ||
          (r.tag ?? "").toLowerCase().includes(q)
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
  }, [dataWithTags, search, platformFilter, sortKey, sortDir]);

  const perfGroups = useMemo(() => {
    if (platformFilter === "POWER_AUTOMATE") return groupBySolution(filtered);
    if (platformFilter === "SNOWFLAKE" && filtered.some((r) => r.tag?.trim())) {
      return groupBySnowflakeTag(filtered);
    }
    return null;
  }, [platformFilter, filtered]);
  const isGroupedLayout = perfGroups != null;

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

  function toggleGroup(groupId: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  }

  const columns: Array<{ key: SortKey; label: string }> = isGroupedLayout
    ? [
        {
          key: "jobName",
          label: platformFilter === "POWER_AUTOMATE" ? "Flow Name" : "Job Name",
        },
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
    <div className="bg-bg-surface border border-border-default rounded-[14px] shadow-[var(--shadow-card)]">
      <div className="flex items-center justify-between p-4 border-b border-border-default">
        <h3 className="text-sm font-semibold tracking-[-0.01em] text-text-primary">
          Job Performance
          <span className="text-text-muted font-normal ml-2 text-xs">
            30 Days
          </span>
        </h3>
        <div className="flex items-center gap-3">
          <select
            value={platformFilter}
            onChange={(e) => setPlatformFilter(e.target.value)}
            className="h-8 px-3 bg-bg-primary border border-border-default rounded-lg text-sm text-text-primary outline-none focus:border-accent transition-colors duration-200 appearance-none cursor-pointer"
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
            <tr className="border-b border-border-default bg-bg-primary/50">
              {columns.map((col) => (
                <th
                  key={col.key}
                  onClick={() => handleSort(col.key)}
                  className="text-left text-[10px] font-medium uppercase tracking-[0.06em] text-text-muted px-4 py-3 cursor-pointer select-none hover:text-text-secondary transition-colors duration-150"
                >
                  {col.label}
                  {sortIndicator(col.key)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {perfGroups ? (
              perfGroups.map((group) => {
                const isOpen = !collapsed.has(group.groupId);
                return (
                  <GroupedPerfSection
                    key={group.groupId}
                    group={group}
                    isOpen={isOpen}
                    colCount={colCount}
                    onToggle={() => toggleGroup(group.groupId)}
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

function GroupedPerfSection({
  group,
  isOpen,
  colCount,
  onToggle,
}: {
  group: PerfJobGroup;
  isOpen: boolean;
  colCount: number;
  onToggle: () => void;
}) {
  const displayName =
    group.kind === "solution"
      ? group.groupTitle.replace(/^ADO\d+[\w/]*-\s*/, "")
      : group.groupTitle;
  const GroupIcon = group.kind === "solution" ? FolderOpen : Tag;
  const jobCountLabel = group.kind === "solution" ? "flows" : "jobs";

  return (
    <>
      <tr
        onClick={onToggle}
        className="border-b border-border-default bg-bg-primary/40 cursor-pointer hover:bg-bg-primary/70 transition-colors duration-150"
      >
        <td className="px-4 py-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            {isOpen ? (
              <ChevronDown size={14} className="text-accent shrink-0" />
            ) : (
              <ChevronRight size={14} className="text-text-muted shrink-0" />
            )}
            <GroupIcon size={14} className="text-accent shrink-0" />
            <JobNameText className="font-semibold min-w-0 shrink">{displayName}</JobNameText>
            {group.groupSubtitle && (
              <span className="text-[10px] font-mono text-text-muted shrink-0">
                {group.groupSubtitle}
              </span>
            )}
          </div>
        </td>
        <td className="px-4 py-2.5 text-sm text-text-secondary font-mono tabular-nums font-semibold">
          {group.totalRuns}
        </td>
        <td className="px-4 py-2.5">
          {group.totalRuns > 0 ? (
            <span
              className="inline-block px-2 py-0.5 rounded text-xs font-semibold font-mono tabular-nums"
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
              style={{ backgroundColor: "rgba(161,161,170,0.1)" }}
            >
              —
            </span>
          )}
        </td>
        <td className="px-4 py-2.5" />
        <td className="px-4 py-2.5" />
        <td className="px-4 py-2.5 text-sm font-mono tabular-nums font-semibold">
          <span className={group.failedRuns > 0 ? "text-danger" : "text-text-muted"}>
            {group.failedRuns}
          </span>
        </td>
        <td className="px-4 py-2.5 text-xs text-text-muted font-mono tabular-nums">
          {group.jobs.length} {jobCountLabel}
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
      className={`border-b border-border-default transition-colors duration-150 hover:bg-bg-primary/50 ${
        noRuns ? "opacity-50" : ""
      }`}
    >
      {showPlatform ? (
        <>
          <td className="px-4 py-3 whitespace-nowrap">
            <PlatformBadge platform={row.platform} />
          </td>
          <td className="px-4 py-3 whitespace-nowrap max-w-[280px]">
            <JobNameText title={row.jobName}>{row.jobName}</JobNameText>
          </td>
        </>
      ) : (
        <td
          className={`py-3 pr-4 whitespace-nowrap max-w-[280px] ${
            indent ? "pl-6 border-l-2 border-accent/25 ml-3" : "pl-4"
          }`}
        >
          <JobNameText title={row.jobName}>{row.jobName}</JobNameText>
        </td>
      )}
      <td className="px-4 py-3 text-sm text-text-secondary font-mono tabular-nums">
        {noRuns ? "—" : Number(row.totalRuns)}
      </td>
      <td className="px-4 py-3">
        {noRuns ? (
          <span
            className="inline-block px-2 py-0.5 rounded text-xs font-semibold text-text-muted"
            style={{ backgroundColor: "rgba(161,161,170,0.1)" }}
          >
            Inactive
          </span>
        ) : (
          <span
            className="inline-block px-2 py-0.5 rounded text-xs font-semibold font-mono tabular-nums"
            style={{
              backgroundColor: rateBackground(Number(row.successRatePct)),
              color: rateColor(Number(row.successRatePct)),
            }}
          >
            {Number(row.successRatePct).toFixed(1)}%
          </span>
        )}
      </td>
      <td className="px-4 py-3 text-sm text-text-secondary font-mono tabular-nums">
        {noRuns ? "—" : formatDuration(Number(row.avgDurationSeconds))}
      </td>
      <td className="px-4 py-3 text-sm text-text-secondary font-mono tabular-nums">
        {noRuns ? "—" : formatDuration(Number(row.maxDurationSeconds))}
      </td>
      <td className="px-4 py-3 text-sm font-mono tabular-nums">
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
