import { useMemo } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { PlatformBadge } from "@/components/ui/PlatformBadge";
import type { MonitoringEvent } from "@/types/pipeline";

const MAX_ITEMS = 8;

function statusStyle(status: string): { bg: string; text: string } {
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

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

interface Props {
  events: MonitoringEvent[];
}

export function CurrentActivitiesFeed({ events }: Props) {
  const recent = useMemo(() => {
    return [...events]
      .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
      .slice(0, MAX_ITEMS);
  }, [events]);

  return (
    <section className="bg-bg-surface border border-border-default rounded-[14px] shadow-[var(--shadow-card)]">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-default">
        <h3 className="text-sm font-semibold tracking-[-0.01em] text-text-primary">Current Activities</h3>
        <Link
          to="/job-status"
          className="flex items-center gap-1 text-xs text-accent hover:text-accent/80 font-medium transition-colors duration-200"
        >
          View All <ArrowRight size={12} />
        </Link>
      </div>

      {recent.length === 0 ? (
        <div className="px-4 py-8 text-center text-sm text-text-muted">
          No recent activities
        </div>
      ) : (
        <ul>
          {recent.map((ev, i) => {
            const sc = statusStyle(ev.status);
            return (
              <li
                key={`${ev.platform}-${ev.jobName}-${ev.startTime}-${i}`}
                className="flex items-center gap-3 px-4 py-2.5 border-b border-border-default last:border-b-0 hover:bg-bg-primary/50 transition-colors duration-150"
              >
                <PlatformBadge platform={ev.platform} />
                <span className="flex-1 text-sm text-text-primary truncate min-w-0">
                  {ev.jobName}
                </span>
                <span
                  className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase shrink-0"
                  style={{ backgroundColor: sc.bg, color: sc.text }}
                >
                  {ev.status}
                </span>
                <span className="text-[11px] text-text-muted font-mono tabular-nums shrink-0 w-14 text-right">
                  {timeAgo(ev.startTime)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
