import { useEffect, useCallback } from "react";
import { MonitoringEventsTable } from "@/components/tables/MonitoringEventsTable";
import { api } from "@/services/api-client";
import { usePolling } from "@/hooks/use-polling";
import { useRefresh } from "@/context/refresh-context";

const POLL_INTERVAL = 30_000;

export function CurrentActivities() {
  const { register, unregister, reportUpdate } = useRefresh();

  const events = usePolling(api.getJobStatus, POLL_INTERVAL);

  const refreshAll = useCallback(
    () => events.refresh().then(() => undefined),
    [events.refresh],
  );

  useEffect(() => {
    register("job-status", refreshAll);
    return () => unregister("job-status");
  }, [register, unregister, refreshAll]);

  useEffect(() => {
    if (events.lastUpdated) reportUpdate(events.lastUpdated);
  }, [events.lastUpdated, reportUpdate]);

  return (
    <div className="space-y-5">
      <MonitoringEventsTable data={events.data ?? []} />
    </div>
  );
}
