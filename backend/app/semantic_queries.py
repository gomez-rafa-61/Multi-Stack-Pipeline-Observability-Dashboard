"""SQL against Snowflake semantic views (SEMANTIC_VIEW) for Cortex-aligned metrics.

Enable with USE_SEMANTIC_VIEWS=true. Logical tables use lowercase identifiers
(events, cycles) per Snowflake semantic view query syntax.
"""

from __future__ import annotations

import os

_DB = os.environ.get("SNOWFLAKE_DATABASE", "PRD_EDW_STG")
_SCHEMA = os.environ.get("SNOWFLAKE_SCHEMA", "UAM_MONITORING")


def _sv(name: str) -> str:
    return f"{_DB}.{_SCHEMA}.{name}"


_SV_EVENT = _sv("SV_PIPELINE_EVENT_ANALYTICS")
_SV_CYCLE = _sv("SV_CYCLE_ANALYTICS")

HEALTH_SUMMARY = f"""
SELECT * FROM SEMANTIC_VIEW(
  {_SV_EVENT}
  METRICS events.total_runs,
          events.successful_runs,
          events.failed_runs,
          events.cancelled_runs,
          events.success_rate_pct,
          events.avg_duration_seconds,
          events.active_platforms,
          events.unique_jobs,
          events.earliest_event,
          events.latest_event
  WHERE events.event_time >= DATEADD(hour, -24, CURRENT_TIMESTAMP())
)
"""

STATUS_TREND = f"""
SELECT
  period,
  platform,
  status,
  run_count,
  COALESCE(avg_duration_seconds, 0) AS avg_duration_seconds
FROM (
  SELECT * FROM SEMANTIC_VIEW(
    {_SV_EVENT}
    DIMENSIONS events.event_hour AS period, events.platform, events.status
    METRICS events.total_runs AS run_count, events.avg_duration_seconds
    WHERE events.event_time >= DATEADD(day, -7, CURRENT_TIMESTAMP())
  )
) q
ORDER BY period DESC
"""

PLATFORM_BREAKDOWN = f"""
SELECT
  platform,
  status,
  run_count,
  COALESCE(avg_duration_seconds, 0) AS avg_duration_seconds,
  success_rate_pct,
  unique_jobs,
  last_run_time
FROM (
  SELECT * FROM SEMANTIC_VIEW(
    {_SV_EVENT}
    DIMENSIONS events.platform, events.status
    METRICS events.total_runs AS run_count, events.avg_duration_seconds,
            events.success_rate_pct, events.unique_jobs, events.latest_event AS last_run_time
    WHERE events.event_time >= DATEADD(day, -7, CURRENT_TIMESTAMP())
  )
) q
ORDER BY platform, status
"""

RECENT_FAILURES = f"""
SELECT
  event_time,
  platform,
  job_name,
  run_id,
  status,
  COALESCE(duration_seconds, 0) AS duration_seconds,
  error_message,
  log_url,
  correlation_id,
  minutes_ago
FROM SEMANTIC_VIEW(
  {_SV_EVENT}
  DIMENSIONS events.event_time, events.platform, events.job_name, events.run_id, events.status,
            events.error_message, events.log_url, events.correlation_id
  FACTS events.duration_seconds, events.minutes_ago
  WHERE events.event_time >= DATEADD(day, -7, CURRENT_TIMESTAMP())
    AND events.status = 'FAILED'
)
ORDER BY event_time DESC
LIMIT 50
"""

CYCLE_PERFORMANCE = f"""
SELECT
  cycle_timestamp,
  correlation_id,
  UPPER(cycle_status) AS status,
  cycle_duration_seconds AS duration_seconds,
  total_runs,
  successful_adapters,
  failed_adapters,
  stored_runs,
  storage_failures,
  notifications_sent,
  ROUND(
    successful_adapters * 100.0
    / NULLIF(successful_adapters + failed_adapters, 0),
    1
  ) AS adapter_success_rate_pct
FROM SEMANTIC_VIEW(
  {_SV_CYCLE}
  DIMENSIONS cycles.cycle_timestamp, cycles.correlation_id, cycles.cycle_status
  FACTS cycles.cycle_duration_seconds, cycles.total_runs, cycles.successful_adapters,
        cycles.failed_adapters, cycles.stored_runs, cycles.storage_failures, cycles.notifications_sent
  WHERE cycles.cycle_timestamp >= DATEADD(day, -7, CURRENT_TIMESTAMP())
)
ORDER BY cycle_timestamp DESC
LIMIT 100
"""

JOB_PERFORMANCE = f"""
SELECT * FROM SEMANTIC_VIEW(
  {_SV_EVENT}
  DIMENSIONS events.platform, events.job_name
  METRICS events.total_runs, events.successful_runs, events.failed_runs, events.success_rate_pct,
          events.avg_duration_seconds, events.max_duration_seconds,
          events.latest_event AS last_run_time, events.earliest_event AS first_seen
  WHERE events.event_time >= DATEADD(day, -30, CURRENT_TIMESTAMP())
)
ORDER BY failed_runs DESC, total_runs DESC
"""
