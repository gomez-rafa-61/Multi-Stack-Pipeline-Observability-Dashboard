import { useEffect, useCallback, useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { SearchInput } from "@/components/ui/SearchInput";
import { api } from "@/services/api-client";
import { usePolling } from "@/hooks/use-polling";
import { useRefresh } from "@/context/refresh-context";
import { getPlatformMeta } from "@/config/platform-meta";
import type { JobRegistryRecord } from "@/types/pipeline";
import {
  ChevronRight,
  ChevronDown,
  Clock,
  AlertTriangle,
  Loader2,
  CircleCheck,
  CircleOff,
  FolderOpen,
} from "lucide-react";

const POLL_INTERVAL = 60_000;

function priorityColor(priority: string): { bg: string; text: string } {
  switch (priority.toLowerCase()) {
    case "critical":
      return { bg: "rgba(192,57,43,0.15)", text: "#e74c3c" };
    case "high":
      return { bg: "rgba(231,76,60,0.1)", text: "var(--color-danger)" };
    case "medium":
      return { bg: "rgba(245,166,35,0.1)", text: "var(--color-warning)" };
    case "low":
      return { bg: "rgba(46,173,110,0.1)", text: "var(--color-success)" };
    default:
      return { bg: "rgba(158,168,181,0.12)", text: "var(--color-text-muted)" };
  }
}

function categoryColor(cat: string): string {
  switch (cat) {
    case "orchestration": return "#e8822a";
    case "data_movement": return "#3b82f6";
    case "validation":    return "#a855f7";
    case "archival":      return "#6b7280";
    case "transformation": return "#14b8a6";
    case "ingestion":     return "#22c55e";
    case "reporting":     return "#f59e0b";
    default:              return "#9ca3af";
  }
}

function formatSla(hours: number): string {
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  if (hours >= 24) return `${(hours / 24).toFixed(0)}d`;
  return `${hours}h`;
}

interface SolutionGroup {
  solutionId: string;
  solutionName: string;
  jobs: JobRegistryRecord[];
}

function groupBySolution(jobs: JobRegistryRecord[]): SolutionGroup[] {
  const map = new Map<string, SolutionGroup>();
  for (const job of jobs) {
    const id = job.solutionId ?? "_ungrouped";
    const name = job.solutionName ?? "Ungrouped Flows";
    if (!map.has(id)) {
      map.set(id, { solutionId: id, solutionName: name, jobs: [] });
    }
    map.get(id)!.jobs.push(job);
  }
  return [...map.values()].sort((a, b) => a.solutionName.localeCompare(b.solutionName));
}

export function JobRegistry() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { register, unregister, reportUpdate } = useRefresh();
  const [search, setSearch] = useState("");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const urlPlatform = searchParams.get("platform")?.toUpperCase() ?? null;

  const registry = usePolling(api.getJobRegistry, POLL_INTERVAL);

  const refreshAll = useCallback(
    () => registry.refresh().then(() => undefined),
    [registry.refresh],
  );

  useEffect(() => {
    register("job-registry", refreshAll);
    return () => unregister("job-registry");
  }, [register, unregister, refreshAll]);

  useEffect(() => {
    if (registry.lastUpdated) reportUpdate(registry.lastUpdated);
  }, [registry.lastUpdated, reportUpdate]);

  const data = registry.data ?? [];

  const grouped = useMemo(() => {
    const map = new Map<string, JobRegistryRecord[]>();
    for (const job of data) {
      const key = job.platform;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(job);
    }
    return new Map([...map.entries()].sort(([a], [b]) => a.localeCompare(b)));
  }, [data]);

  const platforms = useMemo(() => [...grouped.keys()], [grouped]);

  const activePlatform = urlPlatform && platforms.includes(urlPlatform)
    ? urlPlatform
    : platforms[0] ?? null;

  const setActivePlatform = useCallback(
    (platform: string) => {
      setSearchParams({ platform }, { replace: true });
      setCollapsed(new Set());
    },
    [setSearchParams],
  );

  useEffect(() => {
    if (platforms.length > 0 && !urlPlatform) {
      setSearchParams({ platform: platforms[0] }, { replace: true });
    }
  }, [platforms, urlPlatform, setSearchParams]);

  const visibleJobs = useMemo(() => {
    const jobs = activePlatform ? grouped.get(activePlatform) ?? [] : [];
    if (!search) return jobs;
    const q = search.toLowerCase();
    return jobs.filter(
      (j) =>
        j.jobName.toLowerCase().includes(q) ||
        j.description.toLowerCase().includes(q) ||
        j.businessFunction.toLowerCase().includes(q) ||
        (j.solutionName ?? "").toLowerCase().includes(q),
    );
  }, [grouped, activePlatform, search]);

  const isPowerAutomate = activePlatform === "POWER_AUTOMATE";
  const solutionGroups = useMemo(
    () => (isPowerAutomate ? groupBySolution(visibleJobs) : []),
    [isPowerAutomate, visibleJobs],
  );

  function toggleGroup(solutionId: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(solutionId)) next.delete(solutionId);
      else next.add(solutionId);
      return next;
    });
  }

  if (registry.loading && !registry.data) {
    return (
      <div className="flex items-center justify-center h-64 text-text-muted">
        <Loader2 size={20} className="animate-spin mr-2" />
        Loading job registry...
      </div>
    );
  }

  const colCount = isPowerAutomate ? 7 : 6;

  return (
    <div className="flex gap-5 h-[calc(100vh-7rem)]">
      {/* Platform sidebar */}
      <div className="w-56 shrink-0 bg-bg-surface border border-border-default rounded-xl overflow-hidden flex flex-col">
        <div className="px-4 py-3 border-b border-border-default">
          <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-text-muted">
            Platforms
          </p>
          <p className="text-xs text-text-muted mt-0.5">
            {data.length} registered jobs
          </p>
          <p className="text-[10px] text-text-muted mt-0.5">
            {data.filter((j) => j.enabled).length} enabled
          </p>
        </div>
        <nav className="flex-1 overflow-y-auto py-2 px-2">
          {platforms.map((key) => {
            const meta = getPlatformMeta(key);
            const Icon = meta.icon;
            const count = grouped.get(key)?.length ?? 0;
            const isActive = activePlatform === key;
            return (
              <button
                key={key}
                onClick={() => setActivePlatform(key)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-colors duration-200 mb-0.5 ${
                  isActive
                    ? "bg-accent-muted text-accent"
                    : "text-text-secondary hover:bg-surface-hover hover:text-text-primary"
                }`}
              >
                <Icon size={16} />
                <span className="flex-1 text-left truncate">{meta.displayName}</span>
                <span
                  className={`text-xs tabular-nums ${
                    isActive ? "text-accent" : "text-text-muted"
                  }`}
                >
                  {count}
                </span>
                <ChevronRight
                  size={14}
                  className={`transition-transform duration-200 ${
                    isActive
                      ? "rotate-90 text-accent"
                      : "text-text-muted"
                  }`}
                />
              </button>
            );
          })}
        </nav>
      </div>

      {/* Jobs table */}
      <div className="flex-1 bg-bg-surface border border-border-default rounded-xl overflow-hidden flex flex-col min-w-0">
        <div className="flex items-center justify-between p-4 border-b border-border-default shrink-0">
          <div>
            <h3 className="text-sm font-semibold text-text-primary">
              {activePlatform
                ? getPlatformMeta(activePlatform).displayName
                : "Select a platform"}
            </h3>
            <p className="text-xs text-text-muted mt-0.5">
              {visibleJobs.length} job{visibleJobs.length !== 1 ? "s" : ""} registered
              {isPowerAutomate && solutionGroups.length > 0 && (
                <span> across {solutionGroups.length} solutions</span>
              )}
            </p>
          </div>
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Filter jobs..."
          />
        </div>

        <div className="flex-1 overflow-y-auto">
          <table className="w-full">
            <thead className="sticky top-0 bg-bg-surface z-10">
              <tr className="border-b border-border-default">
                <th className="text-left text-[10px] font-bold uppercase tracking-[0.1em] text-text-muted px-4 py-3">
                  Job Name
                </th>
                <th className="text-left text-[10px] font-bold uppercase tracking-[0.1em] text-text-muted px-4 py-3">
                  Status
                </th>
                {isPowerAutomate && (
                  <th className="text-left text-[10px] font-bold uppercase tracking-[0.1em] text-text-muted px-4 py-3">
                    Category
                  </th>
                )}
                <th className="text-left text-[10px] font-bold uppercase tracking-[0.1em] text-text-muted px-4 py-3">
                  Priority
                </th>
                <th className="text-left text-[10px] font-bold uppercase tracking-[0.1em] text-text-muted px-4 py-3">
                  Description
                </th>
                <th className="text-left text-[10px] font-bold uppercase tracking-[0.1em] text-text-muted px-4 py-3">
                  Business Function
                </th>
                <th className="text-left text-[10px] font-bold uppercase tracking-[0.1em] text-text-muted px-4 py-3">
                  <span className="flex items-center gap-1">
                    <Clock size={12} />
                    SLA
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {isPowerAutomate ? (
                solutionGroups.map((group) => {
                  const isOpen = !collapsed.has(group.solutionId);
                  const enabledCount = group.jobs.filter((j) => j.enabled).length;
                  return (
                    <SolutionGroupRows
                      key={group.solutionId}
                      group={group}
                      isOpen={isOpen}
                      enabledCount={enabledCount}
                      colCount={colCount}
                      onToggle={() => toggleGroup(group.solutionId)}
                    />
                  );
                })
              ) : (
                visibleJobs.map((job) => (
                  <JobRow key={`${job.platform}-${job.jobName}`} job={job} showCategory={false} />
                ))
              )}
              {visibleJobs.length === 0 && (
                <tr>
                  <td
                    colSpan={colCount}
                    className="px-4 py-12 text-center text-sm text-text-muted"
                  >
                    {activePlatform
                      ? "No jobs match your search"
                      : "Select a platform to view registered jobs"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function SolutionGroupRows({
  group,
  isOpen,
  enabledCount,
  colCount,
  onToggle,
}: {
  group: SolutionGroup;
  isOpen: boolean;
  enabledCount: number;
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
        <td colSpan={colCount} className="px-4 py-2.5">
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
            <span className="text-xs text-text-muted ml-auto tabular-nums">
              {enabledCount}/{group.jobs.length} flows enabled
            </span>
          </div>
        </td>
      </tr>
      {isOpen &&
        group.jobs.map((job) => (
          <JobRow key={`${job.platform}-${job.jobName}`} job={job} showCategory />
        ))}
    </>
  );
}

function JobRow({ job, showCategory }: { job: JobRegistryRecord; showCategory: boolean }) {
  const pColor = priorityColor(job.priority);
  const slaUrgent = job.slaHours != null && job.slaHours <= 4;
  return (
    <tr
      className={`border-b border-border-default transition-colors duration-200 hover:bg-surface-hover ${
        !job.enabled ? "opacity-60" : ""
      }`}
    >
      <td className="px-4 py-3 text-sm text-text-primary font-medium max-w-xs truncate">
        {showCategory && <span className="inline-block w-4" />}
        {job.jobName}
      </td>
      <td className="px-4 py-3">
        {job.enabled ? (
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold"
            style={{ backgroundColor: "rgba(46,173,110,0.1)", color: "var(--color-success)" }}
          >
            <CircleCheck size={12} />
            Enabled
          </span>
        ) : (
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold"
            style={{ backgroundColor: "rgba(158,168,181,0.1)", color: "var(--color-text-muted)" }}
          >
            <CircleOff size={12} />
            Disabled
          </span>
        )}
      </td>
      {showCategory && (
        <td className="px-4 py-3">
          {job.category && (
            <span
              className="inline-block px-2 py-0.5 rounded text-xs font-semibold"
              style={{
                backgroundColor: `${categoryColor(job.category)}18`,
                color: categoryColor(job.category),
              }}
            >
              {job.category.replace("_", " ")}
            </span>
          )}
        </td>
      )}
      <td className="px-4 py-3">
        <span
          className="inline-block px-2 py-0.5 rounded text-xs font-semibold capitalize"
          style={{ backgroundColor: pColor.bg, color: pColor.text }}
        >
          {job.priority}
        </span>
      </td>
      <td className="px-4 py-3 text-sm text-text-secondary max-w-sm truncate">
        {job.description}
      </td>
      <td className="px-4 py-3 text-sm text-text-secondary whitespace-nowrap">
        {job.businessFunction}
      </td>
      <td className="px-4 py-3 text-sm tabular-nums whitespace-nowrap">
        {job.slaHours != null ? (
          <span
            className={`flex items-center gap-1 ${
              slaUrgent ? "text-warning" : "text-text-secondary"
            }`}
          >
            {slaUrgent && <AlertTriangle size={12} />}
            {formatSla(job.slaHours)}
          </span>
        ) : (
          <span className="text-text-muted">—</span>
        )}
      </td>
    </tr>
  );
}
