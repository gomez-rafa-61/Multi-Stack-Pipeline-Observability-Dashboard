# Pipeline Catalog Portal — Design Spec

**Date:** 2026-04-20
**Status:** Approved
**Author:** AI-assisted design session

## Overview

A central catalog portal for the Multi-Stack Pipeline Observability Dashboard where all team members can browse data pipeline documentation, explore lineage as an interactive DAG, link to architecture diagrams, and onboard new pipelines via a wizard or bulk import. The catalog enriches the existing `JOB_REGISTRY` with documentation, ownership, lineage, and governance metadata stored in Snowflake.

## Goals

- Provide a single entry point for pipeline discovery, documentation, and lineage
- Support mixed audiences: approachable summaries for business stakeholders, drill-down for engineers
- Enable onboarding via a guided wizard and bulk CSV import (migration from SharePoint)
- Cross-link catalog entries with existing monitoring/observability views
- Build in governance (ownership, classification, freshness, deprecation) from day one

## Non-Goals (v1)

- Automated lineage parsing from SQL/configs
- Role-based access control or authentication
- Full versioning / diff history of catalog entries
- Lineage bulk import via CSV

---

## 1. Database Schema

Four new tables in `PRD_EDW_STG.UAM_MONITORING`, alongside the existing `JOB_REGISTRY` and `MONITORING_EVENTS`.

### 1.1 PIPELINE_CATALOG

Rich catalog metadata. Links to `JOB_REGISTRY` via `(PLATFORM, JOB_NAME)`.

| Column | Type | Constraint | Notes |
|--------|------|------------|-------|
| CATALOG_ID | VARCHAR | PK, UUID | Generated on insert |
| PLATFORM | VARCHAR | NOT NULL | Soft reference to JOB_REGISTRY (not enforced — allows entries for planned or external pipelines) |
| JOB_NAME | VARCHAR | NOT NULL | Soft reference to JOB_REGISTRY (not enforced) |
| BUSINESS_SEGMENT | VARCHAR | | Organizational grouping |
| DATA_PROVIDER | VARCHAR | | External provider / contractor name |
| DESCRIPTION | TEXT | | Extended description |
| DATABASE_DETAILS | VARCHAR | | Target database/schema/table |
| DATA_DIRECTION | VARCHAR | | INGESTION, EGRESS, TRANSFORMATION |
| CONNECTION_TYPE | VARCHAR | | API, JDBC, FILE, SFTP, etc. |
| URI | VARCHAR | | Connection endpoint |
| DATA_ENVIRONMENT | VARCHAR | | DEV, STAGING, PROD |
| OWNER_NAME | VARCHAR | | Primary steward |
| OWNER_EMAIL | VARCHAR | | Contact email |
| ENGINEER_NAME | VARCHAR | | Implementing engineer |
| ENGINEER_EMAIL | VARCHAR | | Contact email |
| IS_DOCUMENTED | BOOLEAN | DEFAULT FALSE | Documentation completeness flag (external docs now stored in CATALOG_DOCUMENTS table) |
| TAGS | VARIANT | | JSON array for flexible tagging |
| DATA_CLASSIFICATION | VARCHAR | DEFAULT 'INTERNAL' | PUBLIC, INTERNAL, CONFIDENTIAL, RESTRICTED |
| REFRESH_FREQUENCY | VARCHAR | | HOURLY, DAILY, WEEKLY, ON_DEMAND |
| CATALOG_STATUS | VARCHAR | DEFAULT 'ACTIVE' | ACTIVE, DEPRECATED, PLANNED |
| DEPRECATION_DATE | DATE | | Nullable sunset date |
| LAST_CATALOG_UPDATE | TIMESTAMP | | When docs were last reviewed |
| UPDATED_BY | VARCHAR | | Who last updated |
| CREATED_AT | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP() | |
| CREATED_BY | VARCHAR | | |

**Unique constraint:** `(PLATFORM, JOB_NAME)` — one catalog entry per registry job.

### 1.2 CATALOG_LINEAGE

Junction table for DAG edges. Each row is a directed relationship between two catalog entries.

| Column | Type | Constraint | Notes |
|--------|------|------------|-------|
| LINEAGE_ID | VARCHAR | PK, UUID | |
| SOURCE_CATALOG_ID | VARCHAR | NOT NULL, FK | Upstream pipeline |
| TARGET_CATALOG_ID | VARCHAR | NOT NULL, FK | Downstream pipeline |
| RELATIONSHIP_TYPE | VARCHAR | NOT NULL | FEEDS, TRIGGERS, DEPENDS_ON |
| DESCRIPTION | VARCHAR | | Optional edge label |
| CREATED_AT | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP() | |
| CREATED_BY | VARCHAR | | |

**Unique constraint:** `(SOURCE_CATALOG_ID, TARGET_CATALOG_ID)` — no duplicate edges.

### 1.3 CATALOG_DIAGRAMS

Diagram links per catalog entry. Supports embedded previews via thumbnail/iframe URLs.

| Column | Type | Constraint | Notes |
|--------|------|------------|-------|
| DIAGRAM_ID | VARCHAR | PK, UUID | |
| CATALOG_ID | VARCHAR | NOT NULL, FK | Parent catalog entry |
| TITLE | VARCHAR | NOT NULL | Display name |
| URL | VARCHAR | NOT NULL | Link to external diagram |
| DIAGRAM_TYPE | VARCHAR | | ARCHITECTURE, DATA_FLOW, SEQUENCE, ERD |
| THUMBNAIL_URL | VARCHAR | | For embedded preview |
| DESCRIPTION | VARCHAR | | Optional |
| CREATED_AT | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP() | |
| CREATED_BY | VARCHAR | | |

### 1.4 CATALOG_DOCUMENTS

External documentation links per catalog entry. Supports multiple links to SharePoint folders, SharePoint lists, Confluence pages, Teams channels, wikis, or any URL.

| Column | Type | Constraint | Notes |
|--------|------|------------|-------|
| DOCUMENT_ID | VARCHAR | PK, UUID | |
| CATALOG_ID | VARCHAR | NOT NULL, FK | Parent catalog entry |
| TITLE | VARCHAR | NOT NULL | Display name (e.g., "SharePoint Ingestion List", "Confluence Runbook") |
| URL | VARCHAR | NOT NULL | Link to external doc |
| DOC_TYPE | VARCHAR | | SHAREPOINT_FOLDER, SHAREPOINT_LIST, CONFLUENCE, WIKI, TEAMS_CHANNEL, RUNBOOK, SOP, OTHER |
| DESCRIPTION | VARCHAR | | Optional context (e.g., "Contains mapping specs and SLA agreements") |
| CREATED_AT | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP() | |
| CREATED_BY | VARCHAR | | |

### 1.5 Relationship to JOB_REGISTRY

`PIPELINE_CATALOG` is a documentation layer, not a replacement for `JOB_REGISTRY`. The registry remains the operational source of truth (what jobs exist, SLAs, enabled/disabled, priority). The catalog adds documentation, ownership, lineage, and governance. When displaying catalog entries, the API LEFT JOINs with `JOB_REGISTRY` to include operational fields (priority, SLA, enabled status) when available. Catalog entries are allowed without a matching JOB_REGISTRY row — this supports planned pipelines, external data providers, and bulk imports from SharePoint where not all entries have been registered yet.

---

## 2. API Endpoints

New endpoints added to the FastAPI backend. This is the first write-capable surface — all existing endpoints are read-only.

### 2.1 Read Endpoints

| Method | Path | Response | Notes |
|--------|------|----------|-------|
| GET | `/api/catalog` | `CatalogEntry[]` | All entries joined with JOB_REGISTRY; supports `?platform=`, `?status=`, `?search=` query params |
| GET | `/api/catalog/{id}` | `CatalogEntry` | Single entry with full details |
| GET | `/api/catalog/lineage` | `LineageEdge[]` | All edges for DAG rendering |
| GET | `/api/catalog/{id}/diagrams` | `CatalogDiagram[]` | Diagrams for one entry |
| GET | `/api/catalog/{id}/documents` | `CatalogDocument[]` | External doc links for one entry |

### 2.2 Write Endpoints

| Method | Path | Body | Notes |
|--------|------|------|-------|
| POST | `/api/catalog` | `CreateCatalogEntry` | Creates entry, generates UUID |
| PUT | `/api/catalog/{id}` | `UpdateCatalogEntry` | Partial update, sets LAST_CATALOG_UPDATE and UPDATED_BY |
| POST | `/api/catalog/bulk` | `BulkImportPayload` | CSV-parsed rows; returns inserted/skipped/error counts |
| POST | `/api/catalog/lineage` | `CreateLineageEdge` | Creates one edge |
| DELETE | `/api/catalog/lineage/{id}` | — | Removes one edge |
| POST | `/api/catalog/{id}/diagrams` | `CreateDiagram` | Adds a diagram link |
| DELETE | `/api/catalog/diagrams/{id}` | — | Removes a diagram link |
| POST | `/api/catalog/{id}/documents` | `CreateDocument` | Adds an external doc link |
| DELETE | `/api/catalog/documents/{id}` | — | Removes an external doc link |

### 2.3 SQL Execution for Writes

New function `execute_write(sql, params)` in `snowflake_client.py` alongside existing `execute_query()`. Uses parameterized queries to prevent injection. Returns affected row count.

---

## 3. Frontend Architecture

### 3.1 Route

`/catalog` — new page, child of `DashboardLayout` (same as all existing pages).

### 3.2 Page Structure

```
CatalogPortal (page)
├── CatalogSummaryBar        — total entries, % documented, % stale, avg quality score
├── TabBar                   — "All Pipelines" | "Lineage" | "Onboard"
├── Tab: AllPipelines
│   ├── CatalogFilters       — platform, segment, direction, classification, status, search
│   └── CatalogTable         — sortable, paginated table of catalog entries
├── Tab: Lineage
│   └── LineageGraph          — React Flow DAG
├── Tab: Onboard
│   ├── OnboardWizard         — 5-step form
│   └── BulkImportPanel       — CSV upload with column mapping
└── CatalogDetailPanel        — slide-out panel (shared across tabs)
    ├── DescriptionSection
    ├── TechnicalDetailsSection
    ├── OwnershipSection
    ├── DiagramCardsSection    — thumbnail previews / link cards
    ├── DocumentLinksSection   — external doc links (SharePoint, Confluence, etc.)
    ├── LineageMiniView        — immediate upstream/downstream neighbors
    ├── QualityScoreRing
    └── CrossLinkButtons       — "View Performance" / "View Status"
```

### 3.3 New TypeScript Types

Added to `src/types/pipeline.ts`:

```typescript
export interface CatalogEntry {
  catalogId: string;
  platform: string;
  jobName: string;
  businessSegment: string | null;
  dataProvider: string | null;
  description: string | null;
  databaseDetails: string | null;
  dataDirection: string | null;
  connectionType: string | null;
  uri: string | null;
  dataEnvironment: string | null;
  ownerName: string | null;
  ownerEmail: string | null;
  engineerName: string | null;
  engineerEmail: string | null;
  isDocumented: boolean;
  tags: string[];
  dataClassification: string;
  refreshFrequency: string | null;
  catalogStatus: string;
  deprecationDate: string | null;
  lastCatalogUpdate: string | null;
  updatedBy: string | null;
  createdAt: string;
  createdBy: string | null;
  // Joined from JOB_REGISTRY
  priority: string | null;
  slaHours: number | null;
  enabled: boolean | null;
  businessFunction: string | null;
}

export interface LineageEdge {
  lineageId: string;
  sourceCatalogId: string;
  targetCatalogId: string;
  relationshipType: string;
  description: string | null;
}

export interface CatalogDiagram {
  diagramId: string;
  catalogId: string;
  title: string;
  url: string;
  diagramType: string | null;
  thumbnailUrl: string | null;
  description: string | null;
}

export interface CatalogDocument {
  documentId: string;
  catalogId: string;
  title: string;
  url: string;
  docType: string | null;
  description: string | null;
}
```

### 3.4 New Components

| Component | Location | Purpose |
|-----------|----------|---------|
| CatalogPortal | `src/pages/CatalogPortal.tsx` | Page with tabs |
| CatalogSummaryBar | `src/components/catalog/CatalogSummaryBar.tsx` | KPI strip at top |
| CatalogFilters | `src/components/catalog/CatalogFilters.tsx` | Filter controls |
| CatalogTable | `src/components/tables/CatalogTable.tsx` | Main data table |
| CatalogDetailPanel | `src/components/catalog/CatalogDetailPanel.tsx` | Slide-out detail view |
| LineageGraph | `src/components/catalog/LineageGraph.tsx` | React Flow DAG |
| OnboardWizard | `src/components/catalog/OnboardWizard.tsx` | 5-step form |
| BulkImportPanel | `src/components/catalog/BulkImportPanel.tsx` | CSV upload + mapping |
| DiagramCard | `src/components/catalog/DiagramCard.tsx` | Thumbnail + link card |
| QualityScoreRing | `src/components/catalog/QualityScoreRing.tsx` | Completeness indicator |

### 3.5 New Dependency

**React Flow** (`@xyflow/react`) for the lineage DAG. This is the standard React library for interactive node-based graphs. Supports custom node/edge rendering, zoom/pan, minimap, and layout algorithms.

### 3.6 Navigation Changes

Sidebar updated to add "Catalog" under "Main Menu":

```
Main Menu
  - Overview       (/overview)
  - Catalog        (/catalog)       <-- NEW
Analytics
  - Job Performance (/jobs)
  - Job Status      (/job-status)
  - Cycle Monitor   (/overview#cycles)
  - Job Registry    (/registry)
```

### 3.7 Seed Data

New seed data arrays in `src/data/seed-data.ts` for `CatalogEntry[]`, `LineageEdge[]`, and `CatalogDiagram[]` so the frontend works without the backend (matching existing fallback pattern).

---

## 4. Onboarding Framework

### 4.1 Wizard (5 Steps)

1. **General Info** — name, platform, business segment, data provider, description, owner, engineer. Auto-suggests from JOB_REGISTRY entries not yet in catalog.
2. **Technical Details** — database details, connection type, URI, data direction, environment, refresh frequency, data classification.
3. **Lineage** — searchable multi-select for upstream sources and downstream targets from existing catalog entries. Relationship type per edge. Mini graph preview.
4. **Diagrams & Documents** — two sections: (a) Diagrams: repeatable rows with title, URL, type, optional thumbnail URL, iframe preview for supported hosts. (b) External Docs: repeatable rows with title, URL, doc type (SharePoint Folder, SharePoint List, Confluence, Wiki, Teams Channel, Runbook, SOP, Other), optional description.
5. **Review & Submit** — summary, validation warnings, quality score preview. Submit calls POST endpoints.

### 4.2 Bulk CSV Import

1. **Upload** — drag-and-drop or file picker for CSV/Excel.
2. **Column Mapping** — auto-maps by name matching SharePoint headers, with manual override dropdowns.
3. **Preview** — paginated table with inline validation (green/amber/red row status).
4. **Confirm** — calls POST `/api/catalog/bulk`.
5. **Results** — inserted count, skipped duplicates, errors.

Lineage and diagrams are not included in bulk import (v1). They are added per-entry after import.

### 4.3 Edit Flow

Clicking "Edit" in the detail panel opens the same wizard fields inline (not a separate page). PUT `/api/catalog/{id}` saves changes. `LAST_CATALOG_UPDATE` and `UPDATED_BY` are set automatically.

---

## 5. Catalog Maintenance Factors

### 5.1 Data Ownership & Stewardship
Every entry has an owner and engineer with contact info, displayed prominently in the detail panel.

### 5.2 Quality Score
Computed completeness percentage per entry (description +10, owner +10, engineer +10, lineage +15, diagrams +10, external docs +10, classification +10, refresh frequency +10, database details +10, data direction +5 = 100%). Displayed as a progress ring. Table sortable/filterable by score. Entries below 50% show a warning badge.

### 5.3 Freshness & Staleness Tracking
`LAST_CATALOG_UPDATE` tracks when docs were last reviewed. Entries not updated in 90+ days get a "Stale" badge. Summary bar shows total entries, % documented, % stale, average quality score.

### 5.4 Deprecation Workflow
Entries set to `DEPRECATED` with optional sunset date. Visual treatment: strikethrough in table, faded/dashed nodes in DAG. Downstream dependents of deprecated entries show an impact warning. Toggle to show/hide deprecated entries (hidden by default).

### 5.5 Impact Analysis
Selecting a node in the lineage DAG and choosing "Show Impact" highlights all downstream dependents recursively. Answers "what breaks if this pipeline fails?"

### 5.6 Cross-Linking with Monitoring
Detail panel includes:
- "View Performance" links to `/jobs?platform=X` filtered to that job
- "View Status" links to `/job-status` filtered to that job
- Mini sparkline of recent success rate from existing job performance data (only shown when there is matching data in MONITORING_EVENTS; hidden for planned or undiscovered pipelines)

### 5.7 Data Classification
Color-coded badges: PUBLIC (green), INTERNAL (blue), CONFIDENTIAL (amber), RESTRICTED (red).

### 5.8 Search & Discovery
Full-text search across name, description, tags, business function, data provider, owner. Faceted filters: platform, segment, direction, classification, status.

### 5.9 Audit Trail
`CREATED_BY`, `UPDATED_BY`, and timestamps on all three tables. Sufficient for accountability in v1.

### 5.10 Review Cadence (Organizational)
Recommend quarterly catalog review. Staleness tracking and quality scores provide data to drive reviews. Filter for stale + low-quality entries and assign reviews to owners.

---

## 6. Implementation Scope

This is a large feature. Recommended phased delivery:

**Phase 1 — Foundation**
- Snowflake DDL for 4 tables
- Backend CRUD endpoints (catalog, lineage, diagrams)
- Frontend: CatalogPortal page with AllPipelines table + detail panel
- Seed data for offline development
- Sidebar navigation update

**Phase 2 — Onboarding**
- Onboard wizard (5 steps)
- Bulk CSV import
- JOB_REGISTRY auto-linking

**Phase 3 — Lineage DAG**
- React Flow integration
- LineageGraph component
- Impact analysis highlight
- Lineage mini-view in detail panel

**Phase 4 — Polish**
- Quality score computation and display
- Freshness/staleness badges
- Deprecation workflow and visual treatment
- Cross-linking with monitoring (sparklines, deep links)
- Diagram embedded previews (iframe for supported hosts)
