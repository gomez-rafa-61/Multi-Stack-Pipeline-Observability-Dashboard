import { useMemo } from "react";
import { AIInsightBar } from "@/components/ui/AIInsightBar";
import { getPlatformDisplayName } from "@/config/platform-meta";
import type { PlatformBreakdown as PlatformBreakdownType } from "@/types/pipeline";

interface Props {
  data: PlatformBreakdownType[];
}

interface PlatformSummary {
  platform: string;
  successRatePct: number;
  totalRuns: number;
  successRuns: number;
  failedRuns: number;
}

export function PlatformBreakdown({ data }: Props) {
  const platforms = useMemo(() => {
    const map = new Map<string, PlatformSummary>();
    for (const row of data) {
      if (!map.has(row.platform)) {
        map.set(row.platform, {
          platform: row.platform,
          successRatePct: Number(row.successRatePct),
          totalRuns: 0,
          successRuns: 0,
          failedRuns: 0,
        });
      }
      const p = map.get(row.platform)!;
      p.totalRuns += Number(row.runCount);
      if (row.status === "SUCCESS") p.successRuns += Number(row.runCount);
      if (row.status === "FAILED") p.failedRuns += Number(row.runCount);
    }
    return Array.from(map.values()).sort((a, b) => b.totalRuns - a.totalRuns);
  }, [data]);

  const maxRuns = Math.max(...platforms.map((p) => p.totalRuns), 1);

  return (
    <div className="bg-bg-surface border border-border-default rounded-xl p-4">
      <h3 className="text-sm font-semibold text-text-primary mb-4">
        Platform Success Rates
        <span className="text-text-muted font-normal ml-2 text-xs">7 Days</span>
      </h3>

      <div className="space-y-4 mb-4">
        {platforms.map((p) => {
          const rateColor =
            p.successRatePct >= 99
              ? "text-success"
              : p.successRatePct >= 95
                ? "text-warning"
                : "text-danger";

          return (
            <div key={p.platform}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm text-text-secondary">
                  {getPlatformDisplayName(p.platform)}
                </span>
                <span className={`text-sm font-semibold ${rateColor}`}>
                  {p.successRatePct.toFixed(1)}%
                </span>
              </div>
              <div className="h-2 bg-border-default rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${(p.totalRuns / maxRuns) * 100}%`,
                    backgroundColor:
                      p.successRatePct >= 99
                        ? "var(--color-accent)"
                        : p.successRatePct >= 95
                          ? "var(--color-warning)"
                          : "var(--color-danger)",
                  }}
                />
              </div>
              <div className="flex gap-3 mt-1">
                <span className="text-[10px] text-text-muted">
                  {p.totalRuns} runs
                </span>
                {p.failedRuns > 0 && (
                  <span className="text-[10px] text-danger">
                    {p.failedRuns} failed
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <AIInsightBar message="Airbyte failure rate trending up 2.1% this week" />
    </div>
  );
}
