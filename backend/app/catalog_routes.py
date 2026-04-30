"""Pipeline Catalog Portal — API routes."""

from __future__ import annotations

import json
import logging
import uuid
from typing import Any, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app import catalog_queries as cq
from app.snowflake_client import execute_query, execute_write

log = logging.getLogger(__name__)

router = APIRouter(prefix="/api/catalog", tags=["catalog"])


def _run_read(sql: str, params: dict[str, Any] | None = None) -> list[dict[str, Any]]:
    try:
        if params:
            from app.snowflake_client import get_cursor, _normalize_row
            with get_cursor() as cur:
                cur.execute(sql, params)
                rows = cur.fetchall()
            return [_normalize_row(r) for r in rows]
        return execute_query(sql)
    except Exception as exc:
        log.exception("Catalog read query failed")
        raise HTTPException(status_code=502, detail=str(exc)) from exc


def _run_write(sql: str, params: dict[str, Any]) -> int:
    try:
        return execute_write(sql, params)
    except Exception as exc:
        log.exception("Catalog write query failed")
        raise HTTPException(status_code=502, detail=str(exc)) from exc


def _tags_sql_literal(tags: list) -> str:
    """Build a PARSE_JSON('...') SQL literal for the VARIANT TAGS column.

    The Snowflake Python connector converts INSERT...SELECT to INSERT...VALUES
    internally, and PARSE_JSON() is not valid inside a VALUES clause. By
    embedding the call as a raw SQL literal (not a bind parameter) we avoid
    the connector's rewrite.
    """
    escaped = json.dumps(tags).replace("\\", "\\\\").replace("'", "''")
    return f"PARSE_JSON('{escaped}')"


def _inject_tags(sql: str, tags: list) -> str:
    """Replace the __TAGS__ placeholder with a PARSE_JSON literal."""
    return sql.replace("__TAGS__", _tags_sql_literal(tags))


# ---------------------------------------------------------------------------
# Read endpoints
# ---------------------------------------------------------------------------

@router.get("")
def list_catalog() -> list[dict[str, Any]]:
    return _run_read(cq.SELECT_ALL_CATALOG)


@router.get("/lineage")
def list_lineage() -> list[dict[str, Any]]:
    return _run_read(cq.SELECT_LINEAGE_ALL)


@router.get("/entity-lineage")
def list_entity_lineage() -> list[dict[str, Any]]:
    return _run_read(cq.SELECT_ENTITY_LINEAGE_ALL)


@router.get("/{catalog_id}")
def get_catalog_entry(catalog_id: str) -> dict[str, Any]:
    rows = _run_read(cq.SELECT_CATALOG_BY_ID, {"catalog_id": catalog_id})
    if not rows:
        raise HTTPException(status_code=404, detail="Catalog entry not found")
    return rows[0]


@router.get("/{catalog_id}/entities")
def list_entities(catalog_id: str) -> list[dict[str, Any]]:
    return _run_read(cq.SELECT_ENTITIES_BY_CATALOG, {"catalog_id": catalog_id})


@router.get("/{catalog_id}/diagrams")
def list_diagrams(catalog_id: str) -> list[dict[str, Any]]:
    return _run_read(cq.SELECT_DIAGRAMS_BY_CATALOG, {"catalog_id": catalog_id})


@router.get("/{catalog_id}/documents")
def list_documents(catalog_id: str) -> list[dict[str, Any]]:
    return _run_read(cq.SELECT_DOCUMENTS_BY_CATALOG, {"catalog_id": catalog_id})


# ---------------------------------------------------------------------------
# Write models
# ---------------------------------------------------------------------------

class CreateCatalogEntry(BaseModel):
    platform: str
    pipeline_name: str = Field(..., alias="pipelineName")
    pipeline_description: Optional[str] = Field(None, alias="pipelineDescription")
    business_segment: Optional[str] = Field(None, alias="businessSegment")
    data_provider: Optional[str] = Field(None, alias="dataProvider")
    data_direction: Optional[str] = Field(None, alias="dataDirection")
    connection_type: Optional[str] = Field(None, alias="connectionType")
    data_environment: Optional[str] = Field(None, alias="dataEnvironment")
    owner_name: Optional[str] = Field(None, alias="ownerName")
    owner_email: Optional[str] = Field(None, alias="ownerEmail")
    engineer_name: Optional[str] = Field(None, alias="engineerName")
    engineer_email: Optional[str] = Field(None, alias="engineerEmail")
    is_documented: bool = Field(False, alias="isDocumented")
    tags: list[str] = []
    data_classification: str = Field("INTERNAL", alias="dataClassification")
    refresh_frequency: Optional[str] = Field(None, alias="refreshFrequency")
    catalog_status: str = Field("ACTIVE", alias="catalogStatus")
    deprecation_date: Optional[str] = Field(None, alias="deprecationDate")
    created_by: Optional[str] = Field(None, alias="createdBy")

    model_config = {"populate_by_name": True}


class UpdateCatalogEntry(BaseModel):
    platform: Optional[str] = None
    pipeline_name: Optional[str] = Field(None, alias="pipelineName")
    pipeline_description: Optional[str] = Field(None, alias="pipelineDescription")
    business_segment: Optional[str] = Field(None, alias="businessSegment")
    data_provider: Optional[str] = Field(None, alias="dataProvider")
    data_direction: Optional[str] = Field(None, alias="dataDirection")
    connection_type: Optional[str] = Field(None, alias="connectionType")
    data_environment: Optional[str] = Field(None, alias="dataEnvironment")
    owner_name: Optional[str] = Field(None, alias="ownerName")
    owner_email: Optional[str] = Field(None, alias="ownerEmail")
    engineer_name: Optional[str] = Field(None, alias="engineerName")
    engineer_email: Optional[str] = Field(None, alias="engineerEmail")
    is_documented: Optional[bool] = Field(None, alias="isDocumented")
    tags: Optional[list[str]] = None
    data_classification: Optional[str] = Field(None, alias="dataClassification")
    refresh_frequency: Optional[str] = Field(None, alias="refreshFrequency")
    catalog_status: Optional[str] = Field(None, alias="catalogStatus")
    deprecation_date: Optional[str] = Field(None, alias="deprecationDate")
    updated_by: Optional[str] = Field(None, alias="updatedBy")

    model_config = {"populate_by_name": True}


class BulkCatalogRow(BaseModel):
    platform: str
    pipeline_name: str = Field(..., alias="pipelineName")
    pipeline_description: Optional[str] = Field(None, alias="pipelineDescription")
    business_segment: Optional[str] = Field(None, alias="businessSegment")
    data_provider: Optional[str] = Field(None, alias="dataProvider")
    data_direction: Optional[str] = Field(None, alias="dataDirection")
    connection_type: Optional[str] = Field(None, alias="connectionType")
    data_environment: Optional[str] = Field(None, alias="dataEnvironment")
    owner_name: Optional[str] = Field(None, alias="ownerName")
    owner_email: Optional[str] = Field(None, alias="ownerEmail")
    engineer_name: Optional[str] = Field(None, alias="engineerName")
    engineer_email: Optional[str] = Field(None, alias="engineerEmail")
    is_documented: bool = Field(False, alias="isDocumented")
    tags: list[str] = []
    data_classification: str = Field("INTERNAL", alias="dataClassification")
    refresh_frequency: Optional[str] = Field(None, alias="refreshFrequency")
    catalog_status: str = Field("ACTIVE", alias="catalogStatus")
    created_by: Optional[str] = Field(None, alias="createdBy")
    entities: list["CreateEntity"] = []

    model_config = {"populate_by_name": True}


class BulkImportPayload(BaseModel):
    rows: list[BulkCatalogRow]

    model_config = {"populate_by_name": True}


class CreateEntity(BaseModel):
    entity_name: str = Field(..., alias="entityName")
    entity_description: Optional[str] = Field(None, alias="entityDescription")
    database_details: Optional[str] = Field(None, alias="databaseDetails")
    uri: Optional[str] = None
    created_by: Optional[str] = Field(None, alias="createdBy")

    model_config = {"populate_by_name": True}


class UpdateEntity(BaseModel):
    entity_name: Optional[str] = Field(None, alias="entityName")
    entity_description: Optional[str] = Field(None, alias="entityDescription")
    database_details: Optional[str] = Field(None, alias="databaseDetails")
    uri: Optional[str] = None

    model_config = {"populate_by_name": True}


class CreateLineageEdge(BaseModel):
    source_catalog_id: str = Field(..., alias="sourceCatalogId")
    target_catalog_id: str = Field(..., alias="targetCatalogId")
    relationship_type: str = Field(..., alias="relationshipType")
    description: Optional[str] = None
    created_by: Optional[str] = Field(None, alias="createdBy")

    model_config = {"populate_by_name": True}


class CreateDiagram(BaseModel):
    title: str
    url: str
    diagram_type: Optional[str] = Field(None, alias="diagramType")
    thumbnail_url: Optional[str] = Field(None, alias="thumbnailUrl")
    description: Optional[str] = None
    created_by: Optional[str] = Field(None, alias="createdBy")

    model_config = {"populate_by_name": True}


class CreateDocument(BaseModel):
    title: str
    url: str
    doc_type: Optional[str] = Field(None, alias="docType")
    description: Optional[str] = None
    created_by: Optional[str] = Field(None, alias="createdBy")

    model_config = {"populate_by_name": True}


# ---------------------------------------------------------------------------
# Write endpoints
# ---------------------------------------------------------------------------

@router.post("")
def create_catalog_entry(body: CreateCatalogEntry) -> dict[str, Any]:
    catalog_id = str(uuid.uuid4())
    params = {
        "catalog_id": catalog_id,
        "platform": body.platform.upper(),
        "pipeline_name": body.pipeline_name,
        "pipeline_description": body.pipeline_description,
        "business_segment": body.business_segment,
        "data_provider": body.data_provider,
        "data_direction": body.data_direction,
        "connection_type": body.connection_type,
        "data_environment": body.data_environment,
        "owner_name": body.owner_name,
        "owner_email": body.owner_email,
        "engineer_name": body.engineer_name,
        "engineer_email": body.engineer_email,
        "is_documented": body.is_documented,
        "data_classification": body.data_classification,
        "refresh_frequency": body.refresh_frequency,
        "catalog_status": body.catalog_status,
        "deprecation_date": body.deprecation_date,
        "created_by": body.created_by,
    }
    _run_write(_inject_tags(cq.INSERT_CATALOG, body.tags), params)
    return {"catalogId": catalog_id}


@router.post("/bulk")
def bulk_import(body: BulkImportPayload) -> dict[str, Any]:
    inserted = 0
    skipped = 0
    errors: list[dict[str, str]] = []

    for row in body.rows:
        catalog_id = str(uuid.uuid4())
        params = {
            "catalog_id": catalog_id,
            "platform": row.platform.upper(),
            "pipeline_name": row.pipeline_name,
            "pipeline_description": row.pipeline_description,
            "business_segment": row.business_segment,
            "data_provider": row.data_provider,
            "data_direction": row.data_direction,
            "connection_type": row.connection_type,
            "data_environment": row.data_environment,
            "owner_name": row.owner_name,
            "owner_email": row.owner_email,
            "engineer_name": row.engineer_name,
            "engineer_email": row.engineer_email,
            "is_documented": row.is_documented,
            "data_classification": row.data_classification,
            "refresh_frequency": row.refresh_frequency,
            "catalog_status": row.catalog_status,
            "deprecation_date": None,
            "created_by": row.created_by,
        }
        try:
            _run_write(_inject_tags(cq.INSERT_CATALOG, row.tags), params)
            inserted += 1
            for entity in row.entities:
                entity_id = str(uuid.uuid4())
                entity_params = {
                    "entity_id": entity_id,
                    "catalog_id": catalog_id,
                    "entity_name": entity.entity_name,
                    "entity_description": entity.entity_description,
                    "database_details": entity.database_details,
                    "uri": entity.uri,
                    "created_by": entity.created_by or row.created_by,
                }
                _run_write(cq.INSERT_ENTITY, entity_params)
        except HTTPException as exc:
            detail = exc.detail if isinstance(exc.detail, str) else str(exc.detail)
            if "duplicate" in detail.lower() or "unique" in detail.lower():
                skipped += 1
            else:
                errors.append({"pipelineName": row.pipeline_name, "error": detail})

    return {"inserted": inserted, "skipped": skipped, "errors": errors}


@router.put("/{catalog_id}")
def update_catalog_entry(catalog_id: str, body: UpdateCatalogEntry) -> dict[str, str]:
    existing = _run_read(cq.SELECT_CATALOG_BY_ID, {"catalog_id": catalog_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Catalog entry not found")

    current = existing[0]
    params = {
        "catalog_id": catalog_id,
        "platform": (body.platform or current.get("platform", "")).upper(),
        "pipeline_name": body.pipeline_name or current.get("pipelineName", ""),
        "pipeline_description": body.pipeline_description if body.pipeline_description is not None else current.get("pipelineDescription"),
        "business_segment": body.business_segment if body.business_segment is not None else current.get("businessSegment"),
        "data_provider": body.data_provider if body.data_provider is not None else current.get("dataProvider"),
        "data_direction": body.data_direction if body.data_direction is not None else current.get("dataDirection"),
        "connection_type": body.connection_type if body.connection_type is not None else current.get("connectionType"),
        "data_environment": body.data_environment if body.data_environment is not None else current.get("dataEnvironment"),
        "owner_name": body.owner_name if body.owner_name is not None else current.get("ownerName"),
        "owner_email": body.owner_email if body.owner_email is not None else current.get("ownerEmail"),
        "engineer_name": body.engineer_name if body.engineer_name is not None else current.get("engineerName"),
        "engineer_email": body.engineer_email if body.engineer_email is not None else current.get("engineerEmail"),
        "is_documented": body.is_documented if body.is_documented is not None else current.get("isDocumented", False),
        "data_classification": body.data_classification if body.data_classification is not None else current.get("dataClassification", "INTERNAL"),
        "refresh_frequency": body.refresh_frequency if body.refresh_frequency is not None else current.get("refreshFrequency"),
        "catalog_status": body.catalog_status if body.catalog_status is not None else current.get("catalogStatus", "ACTIVE"),
        "deprecation_date": body.deprecation_date if body.deprecation_date is not None else current.get("deprecationDate"),
        "updated_by": body.updated_by,
    }
    resolved_tags = body.tags if body.tags is not None else (current.get("tags") or [])
    _run_write(_inject_tags(cq.UPDATE_CATALOG, resolved_tags), params)
    return {"status": "updated"}


# ---------------------------------------------------------------------------
# Entity endpoints
# ---------------------------------------------------------------------------

@router.post("/{catalog_id}/entities")
def create_entity(catalog_id: str, body: CreateEntity) -> dict[str, str]:
    entity_id = str(uuid.uuid4())
    params = {
        "entity_id": entity_id,
        "catalog_id": catalog_id,
        "entity_name": body.entity_name,
        "entity_description": body.entity_description,
        "database_details": body.database_details,
        "uri": body.uri,
        "created_by": body.created_by,
    }
    _run_write(cq.INSERT_ENTITY, params)
    return {"entityId": entity_id}


@router.put("/entities/{entity_id}")
def update_entity(entity_id: str, body: UpdateEntity) -> dict[str, str]:
    params = {
        "entity_id": entity_id,
        "entity_name": body.entity_name,
        "entity_description": body.entity_description,
        "database_details": body.database_details,
        "uri": body.uri,
    }
    _run_write(cq.UPDATE_ENTITY, params)
    return {"status": "updated"}


@router.delete("/entities/{entity_id}")
def delete_entity(entity_id: str) -> dict[str, str]:
    _run_write(cq.DELETE_ENTITY, {"entity_id": entity_id})
    return {"status": "deleted"}


# ---------------------------------------------------------------------------
# Lineage endpoints
# ---------------------------------------------------------------------------

@router.post("/lineage")
def create_lineage_edge(body: CreateLineageEdge) -> dict[str, str]:
    lineage_id = str(uuid.uuid4())
    params = {
        "lineage_id": lineage_id,
        "source_catalog_id": body.source_catalog_id,
        "target_catalog_id": body.target_catalog_id,
        "relationship_type": body.relationship_type,
        "description": body.description,
        "created_by": body.created_by,
    }
    _run_write(cq.INSERT_LINEAGE, params)
    return {"lineageId": lineage_id}


@router.delete("/lineage/{lineage_id}")
def delete_lineage_edge(lineage_id: str) -> dict[str, str]:
    _run_write(cq.DELETE_LINEAGE, {"lineage_id": lineage_id})
    return {"status": "deleted"}


# ---------------------------------------------------------------------------
# Diagram endpoints
# ---------------------------------------------------------------------------

@router.post("/{catalog_id}/diagrams")
def create_diagram(catalog_id: str, body: CreateDiagram) -> dict[str, str]:
    diagram_id = str(uuid.uuid4())
    params = {
        "diagram_id": diagram_id,
        "catalog_id": catalog_id,
        "title": body.title,
        "url": body.url,
        "diagram_type": body.diagram_type,
        "thumbnail_url": body.thumbnail_url,
        "description": body.description,
        "created_by": body.created_by,
    }
    _run_write(cq.INSERT_DIAGRAM, params)
    return {"diagramId": diagram_id}


@router.delete("/diagrams/{diagram_id}")
def delete_diagram(diagram_id: str) -> dict[str, str]:
    _run_write(cq.DELETE_DIAGRAM, {"diagram_id": diagram_id})
    return {"status": "deleted"}


# ---------------------------------------------------------------------------
# Document endpoints
# ---------------------------------------------------------------------------

@router.post("/{catalog_id}/documents")
def create_document(catalog_id: str, body: CreateDocument) -> dict[str, str]:
    document_id = str(uuid.uuid4())
    params = {
        "document_id": document_id,
        "catalog_id": catalog_id,
        "title": body.title,
        "url": body.url,
        "doc_type": body.doc_type,
        "description": body.description,
        "created_by": body.created_by,
    }
    _run_write(cq.INSERT_DOCUMENT, params)
    return {"documentId": document_id}


@router.delete("/documents/{document_id}")
def delete_document(document_id: str) -> dict[str, str]:
    _run_write(cq.DELETE_DOCUMENT, {"document_id": document_id})
    return {"status": "deleted"}
