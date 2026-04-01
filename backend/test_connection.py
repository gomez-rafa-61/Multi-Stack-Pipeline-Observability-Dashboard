"""Test the Snowflake connection using the configured auth method.

Usage:
    cd backend
    python -u test_connection.py

Auth is controlled by SNOWFLAKE_AUTH_METHOD in .env (keypair or oauth).
"""

import sys
from dotenv import load_dotenv

load_dotenv()

from app.snowflake_client import execute_query  # noqa: E402

print("=" * 60, flush=True)
print("Snowflake Connection Test", flush=True)
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
