"""Pipeline Observability Dashboard — FastAPI backend.

Serves the 6 analytics endpoints by running the view SQL directly
against PRD_EDW_STG.UAM_MONITORING tables in Snowflake.
"""

from __future__ import annotations

import logging
from typing import Any

import os

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app import queries
from app.snowflake_client import execute_query

load_dotenv()

logging.basicConfig(level=logging.INFO)
log = logging.getLogger(__name__)

_default_origins = [
    "http://localhost:5173",
    "http://localhost:4173",
    "https://dev-uam-app.azurewebsites.net",
]
_extra = os.environ.get("CORS_ORIGINS", "")
_origins = _default_origins + [o.strip() for o in _extra.split(",") if o.strip()]

app = FastAPI(
    title="Pipeline Observability API",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_methods=["GET"],
    allow_headers=["*"],
)


def _run(sql: str) -> list[dict[str, Any]]:
    try:
        return execute_query(sql)
    except Exception as exc:
        log.exception("Snowflake query failed")
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@app.get("/api/health-summary")
def health_summary() -> dict[str, Any]:
    rows = _run(queries.HEALTH_SUMMARY)
    return rows[0] if rows else {}


@app.get("/api/status-trend")
def status_trend() -> list[dict[str, Any]]:
    return _run(queries.STATUS_TREND)


@app.get("/api/platform-breakdown")
def platform_breakdown() -> list[dict[str, Any]]:
    return _run(queries.PLATFORM_BREAKDOWN)


@app.get("/api/recent-failures")
def recent_failures() -> list[dict[str, Any]]:
    return _run(queries.RECENT_FAILURES)


@app.get("/api/cycle-performance")
def cycle_performance() -> list[dict[str, Any]]:
    return _run(queries.CYCLE_PERFORMANCE)


@app.get("/api/job-performance")
def job_performance() -> list[dict[str, Any]]:
    return _run(queries.JOB_PERFORMANCE)


@app.get("/api/platforms")
def platforms() -> list[str]:
    rows = _run(queries.PLATFORMS)
    return [r["platform"] for r in rows]


@app.get("/api/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}
