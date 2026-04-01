"""Pipeline Observability Dashboard — FastAPI backend.

Serves analytics from Snowflake (legacy table SQL or semantic views when
USE_SEMANTIC_VIEWS=true) and optionally proxies Cortex Analyst.
"""

from __future__ import annotations

import logging
from typing import Any

import os

import requests
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ConfigDict, Field

from app import queries
from app.cortex_analyst import post_message as cortex_post_message
from app.snowflake_client import execute_query

load_dotenv(override=True)

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
    allow_methods=["GET", "POST"],
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


@app.get("/api/job-registry")
def job_registry() -> list[dict[str, Any]]:
    return _run(queries.JOB_REGISTRY)


@app.get("/api/platforms")
def platforms() -> list[str]:
    rows = _run(queries.PLATFORMS)
    return [r["platform"] for r in rows]


@app.get("/api/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}


class CortexAnalystRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    message: str = Field(..., min_length=1, max_length=8000)
    semantic_view: str | None = Field(None, alias="semanticView")


@app.post("/api/cortex-analyst/message")
def cortex_analyst_message(body: CortexAnalystRequest) -> dict[str, Any]:
    try:
        return cortex_post_message(
            question=body.message, semantic_view=body.semantic_view
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except requests.HTTPError as exc:
        detail = exc.response.text if exc.response is not None else str(exc)
        raise HTTPException(status_code=502, detail=detail) from exc
    except Exception as exc:
        log.exception("Cortex Analyst request failed")
        raise HTTPException(status_code=502, detail=str(exc)) from exc
