import { useMemo } from "react";
import { AIInsightBar } from "@/components/ui/AIInsightBar";
import { PlatformBadge } from "@/components/ui/PlatformBadge";
import type { PlatformBreakdown as PlatformBreakdownType } from "@/types/pipeline";

interface Props {
  data: PlatformBreakdownType[];
  allPlatforms?: string[];
}

interface PlatformSummary {
  platform: string;
  successRatePct: number;
  totalRuns: number;
  successRuns: number;
  failedRuns: number;
}

export function PlatformBreakdown({ data, allPlatforms = [] }: Props) {
  const platforms = useMemo(() => {
    const map = new Map<string, PlatformSummary>();

    // Seed all known platforms first so they always appear, even with 0 runs
    for (const plat of allPlatforms) {
      map.set(plat.toUpperCase(), {
        platform: plat.toUpperCase(),
        successRatePct: 0,
        totalRuns: 0,
        successRuns: 0,
        failedRuns: 0,
      });
    }

    for (const row of data) {
      const key = row.platform.toUpperCase();
      if (!map.has(key)) {
        map.set(key, {
          platform: key,
          successRatePct: 0,
          totalRuns: 0,
          successRuns: 0,
          failedRuns: 0,
        });
      }
      const p = map.get(key)!;
      p.totalRuns += Number(row.runCount);
      if (row.status === "SUCCESS") p.successRuns += Number(row.runCount);
      if (row.status === "FAILED") p.failedRuns += Number(row.runCount);
    }

    // Compute rate from accumulated counts — the per-row successRatePct from the
    // query is scoped to a single status bucket (always 0% for FAILED, 100% for
    // SUCCESS) so we derive the real rate here after all rows are summed.
    for (const p of map.values()) {
      p.successRatePct =
        p.totalRuns > 0
          ? Math.round((p.successRuns / p.totalRuns) * 1000) / 10
          : 0;
    }

    // Sort: platforms with runs first (by volume desc), then zero-run platforms alphabetically
    return Array.from(map.values()).sort((a, b) => {
      if (b.totalRuns !== a.totalRuns) return b.totalRuns - a.totalRuns;
      return a.platform.localeCompare(b.platform);
    });
  }, [data, allPlatforms]);

  return (
    <div className="bg-bg-surface border border-border-default rounded-[14px] p-4 shadow-[var(--shadow-card)]">
      <h3 className="text-sm font-semibold tracking-[-0.01em] text-text-primary mb-4">
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
              <div className="flex items-center justify-between gap-3 mb-1.5 min-w-0">
                <PlatformBadge platform={p.platform} className="max-w-[min(100%,14rem)] shrink" />
                <span className={`text-sm font-semibold font-mono tabular-nums ${rateColor}`}>
                  {p.successRatePct.toFixed(1)}%
                </span>
              </div>
              <div className="h-2 rounded-full overflow-hidden bg-bg-primary">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${p.successRatePct}%`,
                    backgroundColor:
                      p.successRatePct >= 99
                        ? "#16A34A"
                        : p.successRatePct >= 95
                          ? "#D97706"
                          : "#DC2626",
                  }}
                />
              </div>
              <div className="flex gap-3 mt-1">
                {p.totalRuns === 0 ? (
                  <span className="text-[10px] text-text-muted italic">No runs in last 7 days</span>
                ) : (
                  <>
                    <span className="text-[10px] text-text-muted font-mono tabular-nums">
                      {p.totalRuns} runs
                    </span>
                    {p.failedRuns > 0 && (
                      <span className="text-[10px] text-danger font-mono tabular-nums">
                        {p.failedRuns} failed
                      </span>
                    )}
                  </>
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
