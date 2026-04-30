import { useState, useMemo } from "react";
import { ExternalLink } from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { SearchInput } from "@/components/ui/SearchInput";
import { PlatformBadge } from "@/components/ui/PlatformBadge";
import { JobNameText } from "@/components/ui/JobNameText";
import type { RecentFailure } from "@/types/pipeline";

interface Props {
  data: RecentFailure[];
}

function formatTimeAgo(minutes: number): string {
  if (minutes < 60) return `${minutes} min ago`;
  if (minutes < 1440) return `${Math.round(minutes / 60)} hr ago`;
  return `${Math.round(minutes / 1440)}d ago`;
}

export function RecentFailuresTable({ data }: Props) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search) return data;
    const q = search.toLowerCase();
    return data.filter(
      (r) =>
        r.jobName.toLowerCase().includes(q) ||
        r.platform.toLowerCase().includes(q) ||
        r.errorMessage.toLowerCase().includes(q)
    );
  }, [data, search]);

  return (
    <div className="bg-bg-surface border border-border-default rounded-[14px] shadow-[var(--shadow-card)]">
      <div className="flex items-center justify-between p-4 border-b border-border-default">
        <h3 className="text-sm font-semibold tracking-[-0.01em] text-text-primary">
          Recent Failures
          <span className="text-text-muted font-normal ml-2 text-xs">
            {filtered.length} events
          </span>
        </h3>
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search failures..."
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border-default bg-bg-primary/50">
              <th className="text-left text-[10px] font-medium uppercase tracking-[0.06em] text-text-muted px-4 py-3">
                Time
              </th>
              <th className="text-left text-[10px] font-medium uppercase tracking-[0.06em] text-text-muted px-4 py-3">
                Platform
              </th>
              <th className="text-left text-[10px] font-medium uppercase tracking-[0.06em] text-text-muted px-4 py-3">
                Job Name
              </th>
              <th className="text-left text-[10px] font-medium uppercase tracking-[0.06em] text-text-muted px-4 py-3">
                Status
              </th>
              <th className="text-left text-[10px] font-medium uppercase tracking-[0.06em] text-text-muted px-4 py-3">
                Error Message
              </th>
              <th className="text-left text-[10px] font-medium uppercase tracking-[0.06em] text-text-muted px-4 py-3">
                Log
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => (
              <tr
                key={row.runId}
                className="border-b border-border-default transition-colors duration-150 hover:bg-bg-primary/50"
              >
                <td className="px-4 py-3 text-sm text-text-muted font-mono tabular-nums whitespace-nowrap">
                  {formatTimeAgo(row.minutesAgo)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <PlatformBadge platform={row.platform} />
                </td>
                <td className="px-4 py-3 whitespace-nowrap max-w-[220px]">
                  <JobNameText title={row.jobName}>{row.jobName}</JobNameText>
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={row.status} />
                </td>
                <td className="px-4 py-3 text-sm text-text-secondary max-w-xs truncate">
                  {row.errorMessage}
                </td>
                <td className="px-4 py-3">
                  <a
                    href={row.logUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent hover:text-accent/80 transition-colors duration-200"
                  >
                    <ExternalLink size={14} />
                  </a>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-8 text-center text-sm text-text-muted"
                >
                  No failures found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
