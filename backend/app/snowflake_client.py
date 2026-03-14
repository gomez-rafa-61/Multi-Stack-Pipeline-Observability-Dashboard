"""Snowflake connection manager with query execution.

Authentication priority (first match wins):
  1. SNOWFLAKE_PAT            – Programmatic Access Token (used as password)
  2. SNOWFLAKE_AUTHENTICATOR  – e.g. 'externalbrowser' for SSO
  3. SNOWFLAKE_PASSWORD       – plain username/password fallback
"""

from __future__ import annotations

import logging
import os
from contextlib import contextmanager
from typing import Any, Generator

import snowflake.connector
from snowflake.connector import DictCursor

log = logging.getLogger(__name__)

_cached_connection: snowflake.connector.SnowflakeConnection | None = None


def _get_connection_params() -> dict[str, Any]:
    account = os.environ["SNOWFLAKE_ACCOUNT"].replace(".snowflakecomputing.com", "")
    params: dict[str, Any] = {
        "account": account,
        "user": os.environ["SNOWFLAKE_USER"],
        "warehouse": os.environ["SNOWFLAKE_WAREHOUSE"],
        "database": os.environ.get("SNOWFLAKE_DATABASE", "PRD_EDW_STG"),
        "schema": os.environ.get("SNOWFLAKE_SCHEMA", "UAM_MONITORING"),
    }

    role = os.environ.get("SNOWFLAKE_ROLE", "")
    if role:
        params["role"] = role

    pat = os.environ.get("SNOWFLAKE_PAT", "")
    authenticator = os.environ.get("SNOWFLAKE_AUTHENTICATOR", "")

    if pat:
        params["password"] = pat
    elif authenticator:
        params["authenticator"] = authenticator
        params["client_store_temporary_credential"] = True
    else:
        params["password"] = os.environ["SNOWFLAKE_PASSWORD"]

    return params


def _get_connection() -> snowflake.connector.SnowflakeConnection:
    global _cached_connection
    if _cached_connection is not None and not _cached_connection.is_closed():
        return _cached_connection
    log.info("Opening new Snowflake connection...")
    _cached_connection = snowflake.connector.connect(**_get_connection_params())
    wh = os.environ.get("SNOWFLAKE_WAREHOUSE", "")
    if wh:
        _cached_connection.cursor().execute(f"USE WAREHOUSE {wh}")
        log.info("Snowflake connected, warehouse=%s", wh)
    db = os.environ.get("SNOWFLAKE_DATABASE", "")
    schema = os.environ.get("SNOWFLAKE_SCHEMA", "")
    if db and schema:
        _cached_connection.cursor().execute(f"USE SCHEMA {db}.{schema}")
    return _cached_connection


@contextmanager
def get_cursor() -> Generator[DictCursor, None, None]:
    conn = _get_connection()
    cur = conn.cursor(DictCursor)
    try:
        yield cur
    finally:
        cur.close()


def execute_query(sql: str) -> list[dict[str, Any]]:
    try:
        with get_cursor() as cur:
            cur.execute(sql)
            rows = cur.fetchall()
        return [_normalize_row(r) for r in rows]
    except Exception:
        global _cached_connection
        _cached_connection = None
        raise


def _normalize_row(row: dict[str, Any]) -> dict[str, Any]:
    """Convert Snowflake column names to camelCase for the frontend."""
    out: dict[str, Any] = {}
    for key, value in row.items():
        camel = _snake_to_camel(key.lower())
        if hasattr(value, "isoformat"):
            value = value.isoformat()
        out[camel] = value
    return out


def _snake_to_camel(name: str) -> str:
    parts = name.split("_")
    return parts[0] + "".join(p.capitalize() for p in parts[1:])
