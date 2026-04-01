import { useState, useMemo } from "react";
import { ExternalLink } from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { SearchInput } from "@/components/ui/SearchInput";
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
    <div className="bg-bg-surface border border-border-default rounded-xl">
      <div className="flex items-center justify-between p-4 border-b border-border-default">
        <h3 className="text-sm font-semibold text-text-primary">
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
            <tr className="border-b border-border-default">
              <th className="text-left text-[10px] font-bold uppercase tracking-[0.1em] text-text-muted px-4 py-3">
                Time
              </th>
              <th className="text-left text-[10px] font-bold uppercase tracking-[0.1em] text-text-muted px-4 py-3">
                Platform
              </th>
              <th className="text-left text-[10px] font-bold uppercase tracking-[0.1em] text-text-muted px-4 py-3">
                Job Name
              </th>
              <th className="text-left text-[10px] font-bold uppercase tracking-[0.1em] text-text-muted px-4 py-3">
                Status
              </th>
              <th className="text-left text-[10px] font-bold uppercase tracking-[0.1em] text-text-muted px-4 py-3">
                Error Message
              </th>
              <th className="text-left text-[10px] font-bold uppercase tracking-[0.1em] text-text-muted px-4 py-3">
                Log
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row, i) => (
              <tr
                key={row.runId}
                className={`border-b border-border-default transition-colors duration-200 hover:bg-surface-hover ${
                  i % 2 === 1 ? "bg-[rgba(0,0,0,0.02)]" : ""
                }`}
              >
                <td className="px-4 py-3 text-sm text-text-muted whitespace-nowrap">
                  {formatTimeAgo(row.minutesAgo)}
                </td>
                <td className="px-4 py-3 text-sm text-text-secondary whitespace-nowrap">
                  {row.platform}
                </td>
                <td className="px-4 py-3 text-sm text-text-primary font-medium whitespace-nowrap">
                  {row.jobName}
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
