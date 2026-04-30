"""Snowflake Cortex Analyst REST API client (proxied by FastAPI for the UI)."""

from __future__ import annotations

import logging
import os
from typing import Any, Optional

import requests

from app.snowflake_client import _get_oauth_token

log = logging.getLogger(__name__)


def _account_host() -> str:
    account = os.environ["SNOWFLAKE_ACCOUNT"].replace(".snowflakecomputing.com", "")
    return account


def cortex_analyst_url() -> str:
    override = os.environ.get("SNOWFLAKE_CORTEX_API_URL", "").strip()
    if override:
        return override
    return f"https://{_account_host()}.snowflakecomputing.com/api/v2/cortex/analyst/message"


def _bearer_token() -> str:
    auth = os.environ.get("SNOWFLAKE_AUTH_METHOD", "keypair").lower()
    if auth == "oauth":
        return _get_oauth_token()
    pat = os.environ.get("SNOWFLAKE_CORTEX_PAT") or os.environ.get("SNOWFLAKE_PAT")
    if pat:
        return pat.strip()
    raise RuntimeError(
        "Cortex Analyst requires SNOWFLAKE_CORTEX_PAT (or SNOWFLAKE_PAT) when using "
        "keypair Snowflake auth, or set SNOWFLAKE_AUTH_METHOD=oauth."
    )


def _request_headers() -> dict[str, str]:
    headers: dict[str, str] = {
        "Authorization": f"Bearer {_bearer_token()}",
        "Content-Type": "application/json",
    }
    auth = os.environ.get("SNOWFLAKE_AUTH_METHOD", "keypair").lower()
    if auth == "oauth":
        headers["X-Snowflake-Authorization-Token-Type"] = "OAUTH"
    elif os.environ.get("SNOWFLAKE_CORTEX_PAT") or os.environ.get("SNOWFLAKE_PAT"):
        # Required for programmatic access tokens on Snowflake REST APIs
        headers["X-Snowflake-Authorization-Token-Type"] = "PROGRAMMATIC_ACCESS_TOKEN"
    return headers


def post_message(*, question: str, semantic_view: Optional[str] = None) -> dict[str, Any]:
    """POST a user question to Cortex Analyst using a fully qualified semantic view name."""
    db = os.environ.get("SNOWFLAKE_DATABASE", "PRD_EDW_STG")
    schema = os.environ.get("SNOWFLAKE_SCHEMA", "UAM_MONITORING")
    sv = semantic_view or f"{db}.{schema}.SV_PIPELINE_EVENT_ANALYTICS"
    body: dict[str, Any] = {
        "messages": [
            {
                "role": "user",
                "content": [{"type": "text", "text": question}],
            }
        ],
        "semantic_view": sv,
    }
    url = cortex_analyst_url()
    log.info("Cortex Analyst request semantic_view=%s", sv)
    r = requests.post(url, headers=_request_headers(), json=body, timeout=120)
    r.raise_for_status()
    return r.json()
