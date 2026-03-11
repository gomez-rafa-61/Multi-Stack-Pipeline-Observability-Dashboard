import { useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { JobPerformanceTable } from "@/components/tables/JobPerformanceTable";
import { CyclePerformanceChart } from "@/components/charts/CyclePerformanceChart";
import { api } from "@/services/api-client";
import { usePolling } from "@/hooks/use-polling";
import { useRefresh } from "@/context/refresh-context";

const POLL_INTERVAL = 30_000;

export function JobPerformance() {
  const [searchParams] = useSearchParams();
  const { register, unregister, reportUpdate } = useRefresh();

  const initialPlatform = searchParams.get("platform") ?? undefined;

  const jobs = usePolling(api.getJobPerformance, POLL_INTERVAL);
  const cycles = usePolling(api.getCyclePerformance, POLL_INTERVAL);

  const refreshAll = useCallback(
    () =>
      Promise.all([jobs.refresh(), cycles.refresh()]).then(() => undefined),
    [jobs.refresh, cycles.refresh],
  );

  useEffect(() => {
    register("job-performance", refreshAll);
    return () => unregister("job-performance");
  }, [register, unregister, refreshAll]);

  useEffect(() => {
    const latest = [jobs.lastUpdated, cycles.lastUpdated]
      .filter(Boolean)
      .sort((a, b) => b!.getTime() - a!.getTime())[0];
    if (latest) reportUpdate(latest);
  }, [jobs.lastUpdated, cycles.lastUpdated, reportUpdate]);

  return (
    <div className="space-y-5">
      <JobPerformanceTable data={jobs.data ?? []} initialPlatform={initialPlatform} />
      <CyclePerformanceChart data={cycles.data ?? []} />
    </div>
  );
}
