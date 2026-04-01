"""Snowflake connection manager with query execution.

Authentication is selected via SNOWFLAKE_AUTH_METHOD env var:
  1. keypair (default) — RSA private key for service account auth
  2. oauth             — Azure AD Service Principal client_credentials grant
"""

from __future__ import annotations

import logging
import os
from contextlib import contextmanager
from decimal import Decimal
from typing import Any, Generator

import snowflake.connector
from snowflake.connector import DictCursor

log = logging.getLogger(__name__)

_cached_connection: snowflake.connector.SnowflakeConnection | None = None
_msal_app: Any = None


def _load_private_key_der() -> bytes:
    """Load RSA private key from PEM file and return DER-encoded PKCS8 bytes."""
    from cryptography.hazmat.primitives.serialization import (
        Encoding,
        NoEncryption,
        PrivateFormat,
        load_pem_private_key,
    )

    key_path = os.environ.get("SNOWFLAKE_PRIVATE_KEY_PATH", "snowflake_rsa_key.p8")
    passphrase_str = os.environ.get("SNOWFLAKE_PRIVATE_KEY_PASSPHRASE", "")
    passphrase = passphrase_str.encode() if passphrase_str else None

    with open(key_path, "rb") as f:
        pem_data = f.read()

    key = load_pem_private_key(pem_data, password=passphrase)
    return key.private_bytes(Encoding.DER, PrivateFormat.PKCS8, NoEncryption())


def _get_oauth_token() -> str:
    """Acquire an OAuth token from Azure AD using the client_credentials grant."""
    import msal

    global _msal_app
    if _msal_app is None:
        _msal_app = msal.ConfidentialClientApplication(
            os.environ["AZURE_CLIENT_ID"],
            authority=f"https://login.microsoftonline.com/{os.environ['AZURE_TENANT_ID']}",
            client_credential=os.environ["AZURE_CLIENT_SECRET"],
        )

    scope = os.environ["SNOWFLAKE_OAUTH_SCOPE"]
    result = _msal_app.acquire_token_silent([scope], account=None)
    if not result:
        log.info("No cached OAuth token; acquiring new token from Azure AD")
        result = _msal_app.acquire_token_for_client(scopes=[scope])

    if "access_token" not in result:
        error_desc = result.get("error_description", result.get("error", "unknown error"))
        raise RuntimeError(f"Failed to acquire OAuth token from Azure AD: {error_desc}")

    log.info("OAuth token acquired successfully")
    return result["access_token"]


def _get_connection() -> snowflake.connector.SnowflakeConnection:
    global _cached_connection
    if _cached_connection is not None and not _cached_connection.is_closed():
        return _cached_connection

    account = os.environ["SNOWFLAKE_ACCOUNT"].replace(".snowflakecomputing.com", "")
    timeout = int(os.environ.get("QUERY_TIMEOUT", "120"))
    auth_method = os.environ.get("SNOWFLAKE_AUTH_METHOD", "keypair").lower()

    conn_params: dict[str, Any] = {
        "account": account,
        "client_session_keep_alive": True,
        "network_timeout": timeout,
    }

    if auth_method == "oauth":
        token = _get_oauth_token()
        conn_params["authenticator"] = "oauth"
        conn_params["token"] = token
        user = os.environ.get("SNOWFLAKE_USER", "")
        if user:
            conn_params["user"] = user
        auth_label = "OAuth"
    else:
        conn_params["user"] = os.environ["SNOWFLAKE_USER"]
        conn_params["private_key"] = _load_private_key_der()
        auth_label = "KeyPair"

    warehouse = os.environ.get("SNOWFLAKE_WAREHOUSE", "")
    database = os.environ.get("SNOWFLAKE_DATABASE", "")
    schema = os.environ.get("SNOWFLAKE_SCHEMA", "")
    role = os.environ.get("SNOWFLAKE_ROLE", "")

    if warehouse:
        conn_params["warehouse"] = warehouse
    if database:
        conn_params["database"] = database
    if schema:
        conn_params["schema"] = schema
    if role:
        conn_params["role"] = role

    log.info("Connecting to Snowflake account=%s user=%s role=%s (%s)",
             account, conn_params.get("user", "(from token)"), role, auth_label)
    _cached_connection = snowflake.connector.connect(**conn_params)
    log.info("Snowflake connection established successfully (%s)", auth_label)
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
        elif isinstance(value, Decimal):
            value = float(value)
        out[camel] = value
    return out


def _snake_to_camel(name: str) -> str:
    parts = name.split("_")
    return parts[0] + "".join(p.capitalize() for p in parts[1:])
