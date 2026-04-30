import { useEffect, useCallback, useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { SearchInput } from "@/components/ui/SearchInput";
import { api } from "@/services/api-client";
import { usePolling } from "@/hooks/use-polling";
import { useRefresh } from "@/context/refresh-context";
import { PlatformBadge } from "@/components/ui/PlatformBadge";
import { JobNameText } from "@/components/ui/JobNameText";
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
  Tag,
} from "lucide-react";

const POLL_INTERVAL = 60_000;

function priorityColor(priority: string): { bg: string; text: string } {
  switch (priority.toLowerCase()) {
    case "critical":
      return { bg: "rgba(220,38,38,0.08)", text: "#DC2626" };
    case "high":
      return { bg: "rgba(220,38,38,0.06)", text: "#DC2626" };
    case "medium":
      return { bg: "rgba(217,119,6,0.08)", text: "#D97706" };
    case "low":
      return { bg: "rgba(22,163,74,0.08)", text: "#16A34A" };
    default:
      return { bg: "rgba(161,161,170,0.08)", text: "#A1A1AA" };
  }
}

function categoryColor(cat: string): string {
  switch (cat) {
    case "orchestration": return "#16A34A";
    case "data_movement": return "#2563EB";
    case "validation":    return "#7C3AED";
    case "archival":      return "#6B7280";
    case "transformation": return "#0D9488";
    case "ingestion":     return "#16A34A";
    case "reporting":     return "#D97706";
    default:              return "#A1A1AA";
  }
}

function formatSla(hours: number): string {
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  if (hours >= 24) return `${(hours / 24).toFixed(0)}d`;
  return `${hours}h`;
}

interface RegistryJobGroup {
  id: string;
  title: string;
  subtitle?: string;
  jobs: JobRegistryRecord[];
  kind: "solution" | "tag";
}

function groupPowerAutomateBySolution(jobs: JobRegistryRecord[]): RegistryJobGroup[] {
  const map = new Map<string, RegistryJobGroup>();
  for (const job of jobs) {
    const id = job.solutionId ?? "_ungrouped";
    const name = job.solutionName ?? "Ungrouped flows";
    if (!map.has(id)) {
      map.set(id, { id, title: name, subtitle: id !== "_ungrouped" ? id : undefined, jobs: [], kind: "solution" });
    }
    map.get(id)!.jobs.push(job);
  }
  return [...map.values()].sort((a, b) => a.title.localeCompare(b.title));
}

function groupSnowflakeByTag(jobs: JobRegistryRecord[]): RegistryJobGroup[] {
  const map = new Map<string, RegistryJobGroup>();
  for (const job of jobs) {
    const raw = job.tag?.trim();
    const id = raw ? `tag:${raw}` : "_untagged";
    const title = raw || "Ungrouped jobs";
    if (!map.has(id)) {
      map.set(id, { id, title, jobs: [], kind: "tag" });
    }
    map.get(id)!.jobs.push(job);
  }
  return [...map.values()].sort((a, b) => a.title.localeCompare(b.title));
}

function registryGroupsForPlatform(
  platform: string | null,
  jobs: JobRegistryRecord[],
): RegistryJobGroup[] | null {
  if (!platform) return null;
  if (platform === "POWER_AUTOMATE") return groupPowerAutomateBySolution(jobs);
  if (platform === "SNOWFLAKE" && jobs.some((j) => j.tag?.trim())) {
    return groupSnowflakeByTag(jobs);
  }
  return null;
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
        (j.solutionName ?? "").toLowerCase().includes(q) ||
        (j.tag ?? "").toLowerCase().includes(q),
    );
  }, [grouped, activePlatform, search]);

  const jobGroups = useMemo(
    () => registryGroupsForPlatform(activePlatform, visibleJobs),
    [activePlatform, visibleJobs],
  );
  const isGroupedView = jobGroups != null;
  const showCategoryColumn = activePlatform === "POWER_AUTOMATE" && isGroupedView;

  function toggleGroup(groupId: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
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

  const colCount = showCategoryColumn ? 7 : 6;

  return (
    <div className="flex gap-5 h-[calc(100vh-7rem)]">
      <div className="w-56 shrink-0 bg-bg-surface border border-border-default rounded-[14px] overflow-hidden flex flex-col shadow-[var(--shadow-card)]">
        <div className="px-4 py-3 border-b border-border-default">
          <p className="text-[10px] font-medium uppercase tracking-[0.06em] text-text-muted">
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
            const count = grouped.get(key)?.length ?? 0;
            const isActive = activePlatform === key;
            return (
              <button
                key={key}
                onClick={() => setActivePlatform(key)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors duration-200 mb-0.5 cursor-pointer ${
                  isActive
                    ? "bg-accent-muted ring-1 ring-accent/20"
                    : "hover:bg-bg-primary"
                }`}
              >
                <span className="flex-1 min-w-0 text-left">
                  <PlatformBadge platform={key} />
                </span>
                <span
                  className={`text-xs tabular-nums shrink-0 ${
                    isActive ? "text-accent font-semibold" : "text-text-muted"
                  }`}
                >
                  {count}
                </span>
                <ChevronRight
                  size={14}
                  className={`shrink-0 transition-transform duration-200 ${
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

      <div className="flex-1 bg-bg-surface border border-border-default rounded-[14px] overflow-hidden flex flex-col min-w-0 shadow-[var(--shadow-card)]">
        <div className="flex items-center justify-between p-4 border-b border-border-default shrink-0">
          <div>
            <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2 flex-wrap min-h-[1.75rem]">
              {activePlatform ? (
                <PlatformBadge platform={activePlatform} />
              ) : (
                <span className="text-text-secondary font-medium">Select a platform</span>
              )}
            </h3>
            <p className="text-xs text-text-muted mt-0.5">
              {visibleJobs.length} job{visibleJobs.length !== 1 ? "s" : ""} registered
              {jobGroups && jobGroups.length > 0 && activePlatform === "POWER_AUTOMATE" && (
                <span> across {jobGroups.length} solutions</span>
              )}
              {jobGroups && jobGroups.length > 0 && activePlatform === "SNOWFLAKE" && (
                <span> across {jobGroups.length} tags</span>
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
                <th className="text-left text-[10px] font-medium uppercase tracking-[0.06em] text-text-muted px-4 py-3">
                  Job Name
                </th>
                <th className="text-left text-[10px] font-medium uppercase tracking-[0.06em] text-text-muted px-4 py-3">
                  Status
                </th>
                {showCategoryColumn && (
                  <th className="text-left text-[10px] font-medium uppercase tracking-[0.06em] text-text-muted px-4 py-3">
                    Category
                  </th>
                )}
                <th className="text-left text-[10px] font-medium uppercase tracking-[0.06em] text-text-muted px-4 py-3">
                  Priority
                </th>
                <th className="text-left text-[10px] font-medium uppercase tracking-[0.06em] text-text-muted px-4 py-3">
                  Description
                </th>
                <th className="text-left text-[10px] font-medium uppercase tracking-[0.06em] text-text-muted px-4 py-3">
                  Business Function
                </th>
                <th className="text-left text-[10px] font-medium uppercase tracking-[0.06em] text-text-muted px-4 py-3">
                  <span className="flex items-center gap-1">
                    <Clock size={12} />
                    SLA
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {jobGroups ? (
                jobGroups.map((group) => {
                  const isOpen = !collapsed.has(group.id);
                  const enabledCount = group.jobs.filter((j) => j.enabled).length;
                  return (
                    <JobGroupSection
                      key={group.id}
                      group={group}
                      isOpen={isOpen}
                      enabledCount={enabledCount}
                      colCount={colCount}
                      showCategoryColumn={showCategoryColumn}
                      onToggle={() => toggleGroup(group.id)}
                    />
                  );
                })
              ) : (
                visibleJobs.map((job) => (
                  <JobRow key={`${job.platform}-${job.jobName}`} job={job} showCategory={false} indent={false} />
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

function JobGroupSection({
  group,
  isOpen,
  enabledCount,
  colCount,
  showCategoryColumn,
  onToggle,
}: {
  group: RegistryJobGroup;
  isOpen: boolean;
  enabledCount: number;
  colCount: number;
  showCategoryColumn: boolean;
  onToggle: () => void;
}) {
  const headerTitle =
    group.kind === "solution"
      ? group.title.replace(/^ADO\d+[\w/]*-\s*/, "")
      : group.title;
  const GroupIcon = group.kind === "solution" ? FolderOpen : Tag;
  const countLabel = group.kind === "solution" ? "flows" : "jobs";

  return (
    <>
      <tr
        onClick={onToggle}
        className="border-b border-border-default bg-bg-primary/40 cursor-pointer hover:bg-bg-primary/70 transition-colors duration-150"
      >
        <td colSpan={colCount} className="px-4 py-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            {isOpen ? (
              <ChevronDown size={14} className="text-accent shrink-0" />
            ) : (
              <ChevronRight size={14} className="text-text-muted shrink-0" />
            )}
            <GroupIcon size={14} className="text-accent shrink-0" />
            <JobNameText className="font-semibold min-w-0 shrink">{headerTitle}</JobNameText>
            {group.subtitle && (
              <span className="text-[10px] font-mono text-text-muted shrink-0">
                {group.subtitle}
              </span>
            )}
            <span className="text-xs text-text-muted ml-auto tabular-nums shrink-0">
              {enabledCount}/{group.jobs.length} {countLabel} enabled
            </span>
          </div>
        </td>
      </tr>
      {isOpen &&
        group.jobs.map((job) => (
          <JobRow
            key={`${job.platform}-${job.jobName}`}
            job={job}
            showCategory={showCategoryColumn}
            indent
          />
        ))}
    </>
  );
}

function JobRow({
  job,
  showCategory,
  indent,
}: {
  job: JobRegistryRecord;
  showCategory: boolean;
  indent: boolean;
}) {
  const pColor = priorityColor(job.priority);
  const slaUrgent = job.slaHours != null && job.slaHours <= 4;
  return (
    <tr
      className={`border-b border-border-default transition-colors duration-150 hover:bg-bg-primary/50 ${
        !job.enabled ? "opacity-60" : ""
      }`}
    >
      <td
        className={`py-3 pr-4 max-w-xs ${indent ? "pl-6 border-l-2 border-accent/25 ml-3" : "pl-4"}`}
      >
        <JobNameText title={job.jobName} className="max-w-[min(100%,20rem)] align-middle">
          {job.jobName}
        </JobNameText>
      </td>
      <td className="px-4 py-3">
        {job.enabled ? (
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold"
            style={{ backgroundColor: "rgba(22,163,74,0.08)", color: "#16A34A" }}
          >
            <CircleCheck size={12} />
            Enabled
          </span>
        ) : (
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold"
            style={{ backgroundColor: "rgba(161,161,170,0.08)", color: "#A1A1AA" }}
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
                backgroundColor: `${categoryColor(job.category)}12`,
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
      <td className="px-4 py-3 text-sm font-mono tabular-nums whitespace-nowrap">
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
