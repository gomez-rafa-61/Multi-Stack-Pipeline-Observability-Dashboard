"""Run this script directly to test Snowflake SSO and cache the token.

Usage:
    cd backend
    python -u test_connection.py

A browser window will open for Microsoft SSO. Complete the login.
After that, the token is cached and the FastAPI backend reuses it.
"""

import sys
from dotenv import load_dotenv

load_dotenv()

from app.snowflake_client import execute_query  # noqa: E402

print("=" * 60, flush=True)
print("Snowflake SSO Test — a browser window will open.", flush=True)
print("Complete the Microsoft login to continue.", flush=True)
print("=" * 60, flush=True)

try:
    rows = execute_query("SELECT CURRENT_USER() AS u, CURRENT_WAREHOUSE() AS w")
    print(f"\nConnected as: {rows}", flush=True)
except Exception as e:
    print(f"\nConnection failed: {e}", file=sys.stderr, flush=True)
    sys.exit(1)

print("\nQuerying MONITORING_EVENTS...", flush=True)
try:
    rows = execute_query(
        "SELECT COUNT(*) AS total FROM MONITORING_EVENTS"
    )
    print(f"MONITORING_EVENTS row count: {rows}", flush=True)
except Exception as e:
    print(f"Query failed: {e}", file=sys.stderr, flush=True)
    sys.exit(1)

print("\nQuerying health summary (last 24h)...", flush=True)
try:
    from app.queries import HEALTH_SUMMARY

    rows = execute_query(HEALTH_SUMMARY)
    if rows:
        for k, v in rows[0].items():
            print(f"  {k}: {v}", flush=True)
    else:
        print("  (no data in last 24h)", flush=True)
except Exception as e:
    print(f"Query failed: {e}", file=sys.stderr, flush=True)

print("\nDone. You can now start the backend: python -m uvicorn app.main:app --port 8000", flush=True)
