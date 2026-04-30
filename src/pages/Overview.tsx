import { useEffect, useCallback } from "react";
import { MetricCard } from "@/components/metrics/MetricCard";
import { PipelineHealthTrend } from "@/components/charts/PipelineHealthTrend";
import { PlatformBreakdown } from "@/components/charts/PlatformBreakdown";
import { RecentFailuresTable } from "@/components/tables/RecentFailuresTable";
import { CurrentActivitiesFeed } from "@/components/ui/CurrentActivitiesFeed";
import { api } from "@/services/api-client";
import { usePolling } from "@/hooks/use-polling";
import { useRefresh } from "@/context/refresh-context";

const POLL_INTERVAL = 30_000;

export function Overview() {
  const { register, unregister, reportUpdate } = useRefresh();

  const health = usePolling(api.getHealthSummary, POLL_INTERVAL);
  const trend = usePolling(api.getStatusTrend, POLL_INTERVAL);
  const platforms = usePolling(api.getPlatformBreakdown, POLL_INTERVAL);
  const allPlatforms = usePolling(api.getPlatforms, POLL_INTERVAL);
  const failures = usePolling(api.getRecentFailures, POLL_INTERVAL);
  const activities = usePolling(api.getJobStatus, POLL_INTERVAL);

  const refreshAll = useCallback(
    () =>
      Promise.all([
        health.refresh(),
        trend.refresh(),
        platforms.refresh(),
        allPlatforms.refresh(),
        failures.refresh(),
        activities.refresh(),
      ]).then(() => undefined),
    [health.refresh, trend.refresh, platforms.refresh, failures.refresh, activities.refresh],
  );

  useEffect(() => {
    register("overview", refreshAll);
    return () => unregister("overview");
  }, [register, unregister, refreshAll]);

  useEffect(() => {
    const latest = [health.lastUpdated, trend.lastUpdated, platforms.lastUpdated, failures.lastUpdated, activities.lastUpdated]
      .filter(Boolean)
      .sort((a, b) => b!.getTime() - a!.getTime())[0];
    if (latest) reportUpdate(latest);
  }, [health.lastUpdated, trend.lastUpdated, platforms.lastUpdated, failures.lastUpdated, activities.lastUpdated, reportUpdate]);

  if (!health.data) {
    return (
      <div className="flex items-center justify-center h-64 text-text-muted text-sm">
        Loading dashboard...
      </div>
    );
  }

  const successRate = Number(health.data.successRatePct);
  const totalRuns = Number(health.data.totalRuns);
  const failedRuns = Number(health.data.failedRuns);
  const avgDuration = Number(health.data.avgDurationSeconds);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-4 gap-4">
        <MetricCard
          label="Success Rate"
          value={`${successRate}%`}
          change="+0.3% from yesterday"
          changeType={successRate >= 95 ? "positive" : "negative"}
          sparkHeights={[65, 70, 60, 85, 95]}
          category="rate"
        />
        <MetricCard
          label="Total Runs"
          value={totalRuns.toLocaleString()}
          change="+12 from yesterday"
          changeType="positive"
          sparkHeights={[40, 55, 50, 70, 80]}
          category="count"
        />
        <MetricCard
          label="Active Failures"
          value={String(failedRuns)}
          change={
            failedRuns === 0
              ? "All clear"
              : `${failedRuns} need attention`
          }
          changeType={failedRuns === 0 ? "positive" : "negative"}
          sparkHeights={[90, 60, 40, 30, 20]}
          category="count"
        />
        <MetricCard
          label="Avg Duration"
          value={`${(avgDuration / 60).toFixed(1)} min`}
          change="-0.2 min from yesterday"
          changeType="positive"
          sparkHeights={[50, 45, 55, 40, 35]}
          category="time"
        />
      </div>

      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-8">
          <PipelineHealthTrend data={trend.data ?? []} />
        </div>
        <div className="col-span-4">
          <PlatformBreakdown data={platforms.data ?? []} allPlatforms={allPlatforms.data ?? []} />
        </div>
      </div>

      <RecentFailuresTable data={failures.data ?? []} />

      <CurrentActivitiesFeed events={activities.data ?? []} />
    </div>
  );
}
