"""Compare legacy table SQL vs semantic view SQL for the health summary row.

Requires a working backend/.env Snowflake connection. Run from repo root:
  cd backend && set PYTHONPATH=. && python scripts/validate_semantic_parity.py
"""

from __future__ import annotations

from dotenv import load_dotenv

load_dotenv()

from app import semantic_queries as sem
from app.queries import LEGACY_HEALTH_SUMMARY
from app.snowflake_client import execute_query


def main() -> None:
    legacy = execute_query(LEGACY_HEALTH_SUMMARY)[0]
    semantic = execute_query(sem.HEALTH_SUMMARY)[0]
    keys = [
        "totalRuns",
        "successfulRuns",
        "failedRuns",
        "cancelledRuns",
        "successRatePct",
        "avgDurationSeconds",
        "activePlatforms",
        "uniqueJobs",
    ]
    print("Legacy:", {k: legacy.get(k) for k in keys})
    print("Semantic:", {k: semantic.get(k) for k in keys})
    close = True
    for k in keys:
        a, b = legacy.get(k), semantic.get(k)
        if a == b:
            continue
        if isinstance(a, (int, float)) and isinstance(b, (int, float)):
            if abs(float(a) - float(b)) < 0.25:
                continue
        close = False
    print("Parity (health KPIs):" if close else "Parity check:", "OK" if close else "review differences")


if __name__ == "__main__":
    main()
