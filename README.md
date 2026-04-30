# Multi-Stack Pipeline Observability Dashboard

Real-time observability dashboard for monitoring data pipelines across Databricks, Airbyte, Snowflake, and Power Automate. Surfaces health metrics, failure trends, job performance, and a full Pipeline Catalog with lineage visualization from a unified Snowflake data warehouse.

## Features

### Observability Dashboard
- **Overview** — KPI cards (success rate, total runs, active failures, avg duration), health trend chart, platform breakdown, recent failures table, and a live Current Activities feed
- **Current Activities** — full monitoring events table with click-to-expand detail panes showing platform metadata, timestamps, and duration
- **Job Performance** — job-level aggregated statistics with sorting/filtering across all platforms
- **Cycle Monitor** — UAM cycle duration and adapter success rates
- **Job Registry** — operational registry of all known pipeline jobs

### Pipeline Catalog Portal
- **Catalog Table** — browse all cataloged pipelines with sortable columns, quality score rings, freshness badges, and data classification badges
- **Detail Panel** — slide-out panel with description, technical details, ownership, diagrams (with iframe previews), external documentation links, lineage mini-view, monitoring sparklines, and inline editing
- **Lineage DAG** — interactive React Flow graph with custom pipeline nodes, directed edges, zoom/pan, minimap, and double-click impact analysis ("what breaks if this pipeline fails?")
- **Onboarding Wizard** — 5-step form (General Info, Technical Details, Lineage, Diagrams & Docs, Review) with JOB_REGISTRY auto-fill for unregistered jobs
- **Bulk CSV Import** — drag-and-drop CSV upload with auto column mapping, validation preview, and batch insert
- **Governance** — quality score computation, staleness tracking (90-day threshold), deprecation workflow with hide-deprecated toggle, data classification badges (Public/Internal/Confidential/Restricted)

## Tech Stack

| Layer    | Technology                                     |
| -------- | ---------------------------------------------- |
| Frontend | React 19, TypeScript 5.9, Vite 7               |
| Styling  | Tailwind CSS 4 (custom dark theme)              |
| Charts   | Recharts 3                                      |
| Lineage  | React Flow (`@xyflow/react`)                    |
| Backend  | Python, FastAPI, Uvicorn                        |
| Database | Snowflake (DirectQuery against views + tables)  |

## Prerequisites

- **Node.js** >= 18
- **Python** >= 3.10
- **Snowflake** account with access to `PRD_EDW_STG.UAM_MONITORING` views and tables

## Getting Started

### 1. Clone and install

```bash
git clone <repo-url>
cd Multi-Stack-Pipeline-Observability-Dashboard

# Frontend dependencies
npm install

# Backend dependencies
pip install -r backend/requirements.txt
```

### 2. Configure Snowflake credentials

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env` with your credentials. The backend supports three auth methods (first match wins):

| Variable                   | Description                            |
| -------------------------- | -------------------------------------- |
| `SNOWFLAKE_ACCOUNT`        | Snowflake account identifier           |
| `SNOWFLAKE_USER`           | Username                               |
| `SNOWFLAKE_WAREHOUSE`      | Warehouse name                         |
| `SNOWFLAKE_DATABASE`       | Database (default: `PRD_EDW_STG`)      |
| `SNOWFLAKE_SCHEMA`         | Schema (default: `UAM_MONITORING`)     |
| `SNOWFLAKE_PAT`            | Programmatic Access Token (preferred)  |
| `SNOWFLAKE_AUTHENTICATOR`  | Set to `externalbrowser` for SSO       |
| `SNOWFLAKE_PASSWORD`       | Password (fallback)                    |

### 3. Create catalog tables

Run the DDL script against your Snowflake warehouse to create the four catalog tables:

```bash
# Execute via SnowSQL or Snowflake web UI
# File: backend/ddl/catalog_tables.sql
```

This creates `PIPELINE_CATALOG`, `CATALOG_LINEAGE`, `CATALOG_DIAGRAMS`, and `CATALOG_DOCUMENTS` in the `PRD_EDW_STG.UAM_MONITORING` schema.

### 4. Verify Snowflake connection

```bash
cd backend
python3 test_connection.py
```

On macOS, the interpreter is usually `python3`; if `python` works on your machine, you can use that instead.

### 5. Start the application

```bash
# Terminal 1 — Backend (from backend/ directory)
python3 -m uvicorn app.main:app --port 8000

# Terminal 2 — Frontend (from project root)
npm run dev
```

Open **http://localhost:5173**. The Vite dev server proxies all `/api` requests to the backend.

> **No Snowflake access?** The frontend falls back to procedurally generated seed data when the API is unavailable, so you can still develop UI components without a backend.

---

## Pipeline Catalog Onboarding

### Single Pipeline (Wizard)

Navigate to **Catalog > Onboard > Single Pipeline**. The 5-step wizard walks you through:

1. **General Info** — select platform, enter pipeline name, business segment, data provider, description, owner, and engineer. If the pipeline exists in JOB_REGISTRY but is not yet cataloged, select it from the auto-fill dropdown to pre-populate fields.
2. **Technical Details** — database target, connection type, URI/endpoint, data direction, environment, refresh frequency, and data classification.
3. **Lineage** — add upstream sources and downstream targets from existing catalog entries with relationship type per edge.
4. **Diagrams & Documents** — attach diagram links (Lucidchart, Miro, Figma, Google Docs) and external documentation links (SharePoint, Confluence, wikis, runbooks).
5. **Review & Submit** — verify all fields and submit. The system creates the catalog entry plus all lineage edges, diagrams, and documents.

### Bulk CSV Import

Navigate to **Catalog > Onboard > Bulk CSV Import** to import multiple pipelines at once.

**Steps:**
1. **Upload** — drag-and-drop or browse for a `.csv` file.
2. **Column Mapping** — the importer auto-maps CSV headers to catalog fields using name matching. You can manually override any mapping via dropdown.
3. **Preview** — review the parsed rows. Valid rows show a green check; rows missing required fields (Platform, Pipeline Name) show a red error and are excluded.
4. **Import** — click "Import N Entries" to submit. The result shows inserted count, skipped duplicates, and any errors.

**CSV Format:**

The two required columns are **Platform** and **Pipeline Name** (or Job Name). All other columns are optional. The importer recognizes many header variations:

| Catalog Field        | Accepted CSV Headers                                                  |
| -------------------- | --------------------------------------------------------------------- |
| Platform *           | `Platform`                                                            |
| Pipeline Name *      | `Pipeline Name`, `Job Name`, `job_name`, `jobname`                    |
| Business Segment     | `Business Segment`, `business_segment`                                |
| Data Provider        | `Data Provider`, `Data Provider/Contractor`, `data_provider`          |
| Description          | `Description`                                                         |
| Database Details     | `Database Details`, `database_details`                                |
| Data Direction       | `Data Direction`, `data_direction`                                    |
| Connection Type      | `Connection Type`, `connection_type`, `Cursor Type`                   |
| URI                  | `URI`                                                                 |
| Data Environment     | `Data Environment`, `data_environment`, `Environment`                 |
| Owner Name           | `Owner Name`, `owner_name`, `Owner`                                   |
| Owner Email          | `Owner Email`, `owner_email`                                          |
| Engineer Name        | `Engineer Name`, `engineer_name`, `Engineer`                          |
| Engineer Email       | `Engineer Email`, `engineer_email`                                    |
| Data Classification  | `Data Classification`, `data_classification`, `Classification`        |
| Refresh Frequency    | `Refresh Frequency`, `refresh_frequency`                              |

**Example CSV:**

```csv
Platform,Pipeline Name,Business Segment,Data Provider,Description,Owner Name,Owner Email,Data Direction,Data Environment
AIRBYTE,Salesforce Accounts Sync,Customer Experience,Salesforce,Full refresh of account objects,Maria Lopez,maria.lopez@company.com,INGESTION,PROD
DATABRICKS,Finance Silver ETL,Finance,Internal,DLT pipeline for finance tables,John Smith,john.smith@company.com,TRANSFORMATION,PROD
SNOWFLAKE,EDW Gold Merge,Data Engineering,Internal,Merges silver tables into star schema,Rafael Gomez,rafael.gomez@company.com,TRANSFORMATION,PROD
```

**Valid values for enumerated fields:**
- **Platform:** `AIRBYTE`, `DATABRICKS`, `DBT_CLOUD`, `POWER_AUTOMATE`, `SNOWFLAKE`
- **Data Direction:** `INGESTION`, `EGRESS`, `TRANSFORMATION`
- **Data Environment:** `DEV`, `STAGING`, `PROD`
- **Refresh Frequency:** `HOURLY`, `DAILY`, `WEEKLY`, `ON_DEMAND`
- **Data Classification:** `PUBLIC`, `INTERNAL`, `CONFIDENTIAL`, `RESTRICTED`

> **Note:** Lineage connections and diagram/document links are not included in bulk import (v1). Add them per-entry after import using the detail panel's edit button or the onboarding wizard.

---

## Project Structure

```
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app entry point
│   │   ├── snowflake_client.py  # Connection management, read & write
│   │   ├── queries.py           # SQL constants (observability)
│   │   ├── catalog_queries.py   # SQL constants (catalog portal)
│   │   └── catalog_routes.py    # Catalog CRUD API routes
│   ├── ddl/
│   │   └── catalog_tables.sql   # DDL for catalog portal tables
│   ├── test_connection.py       # Snowflake connectivity test
│   ├── requirements.txt
│   └── .env.example
├── src/
│   ├── pages/
│   │   ├── Overview.tsx          # Dashboard home with KPIs + activities
│   │   ├── JobStatus.tsx         # Current Activities (monitoring events)
│   │   ├── JobPerformance.tsx    # Job-level analytics
│   │   ├── JobRegistry.tsx       # Operational job registry
│   │   └── CatalogPortal.tsx     # Pipeline Catalog (table, lineage, onboard)
│   ├── components/
│   │   ├── layout/              # DashboardLayout, Header, Sidebar
│   │   ├── charts/              # Recharts visualizations
│   │   ├── tables/              # Data tables with search/filter/expand
│   │   ├── metrics/             # KPI cards with sparklines
│   │   ├── catalog/             # Catalog-specific components
│   │   │   ├── CatalogSummaryBar.tsx
│   │   │   ├── CatalogFilters.tsx
│   │   │   ├── CatalogDetailPanel.tsx
│   │   │   ├── LineageGraph.tsx       # React Flow DAG
│   │   │   ├── OnboardWizard.tsx      # 5-step onboarding form
│   │   │   ├── BulkImportPanel.tsx    # CSV import workflow
│   │   │   ├── QualityScoreRing.tsx
│   │   │   └── DiagramCard.tsx
│   │   └── ui/                  # Shared UI primitives
│   ├── services/api-client.ts   # API client with seed data fallback
│   ├── types/pipeline.ts        # Shared TypeScript interfaces
│   ├── config/platform-meta.tsx # Platform icons & display names
│   └── data/seed-data.ts        # Mock data generator
├── docs/
│   └── superpowers/specs/       # Design specifications
├── vite.config.ts
├── tsconfig.json
└── package.json
```

## API Endpoints

### Observability (read-only)

| Endpoint                  | Method | Description                                    | Window |
| ------------------------- | ------ | ---------------------------------------------- | ------ |
| `/api/health-summary`     | GET    | Aggregate KPIs (total, success, failed runs)    | 24h    |
| `/api/status-trend`       | GET    | Hourly run counts by platform and status       | 7d     |
| `/api/platform-breakdown` | GET    | Platform-level success rates and run counts    | 7d     |
| `/api/recent-failures`    | GET    | Latest 50 pipeline failures with error messages | 7d    |
| `/api/cycle-performance`  | GET    | UAM cycle duration and adapter success rates   | 7d     |
| `/api/job-performance`    | GET    | Job-level aggregated statistics                 | 30d    |
| `/api/job-status`         | GET    | Recent monitoring events                        | 14d    |
| `/api/platforms`          | GET    | List of available pipeline platforms            | —      |
| `/api/health`             | GET    | Backend health check                            | —      |

### Catalog Portal (read + write)

| Endpoint                          | Method | Description                          |
| --------------------------------- | ------ | ------------------------------------ |
| `/api/catalog`                    | GET    | All catalog entries (LEFT JOIN with JOB_REGISTRY) |
| `/api/catalog`                    | POST   | Create a new catalog entry           |
| `/api/catalog/bulk`               | POST   | Bulk import from CSV rows            |
| `/api/catalog/lineage`            | GET    | All lineage edges for DAG            |
| `/api/catalog/lineage`            | POST   | Create a lineage edge                |
| `/api/catalog/lineage/{id}`       | DELETE | Remove a lineage edge                |
| `/api/catalog/{id}`               | GET    | Single catalog entry                 |
| `/api/catalog/{id}`               | PUT    | Update a catalog entry               |
| `/api/catalog/{id}/diagrams`      | GET    | Diagrams for one entry               |
| `/api/catalog/{id}/diagrams`      | POST   | Add a diagram link                   |
| `/api/catalog/diagrams/{id}`      | DELETE | Remove a diagram link                |
| `/api/catalog/{id}/documents`     | GET    | External doc links for one entry     |
| `/api/catalog/{id}/documents`     | POST   | Add an external doc link             |
| `/api/catalog/documents/{id}`     | DELETE | Remove an external doc link          |

## Architecture

```
┌─────────────┐       GET/POST/PUT     ┌──────────────┐      SQL Queries      ┌────────────┐
│   React UI  │ ◄────────────────────► │   FastAPI    │ ◄──────────────────── │ Snowflake  │
│  (Vite dev  │   JSON (camelCase)     │  (Uvicorn)   │   UPPER_SNAKE_CASE   │  Views +   │
│   server)   │                        │              │   → camelCase norm   │  Tables    │
└─────────────┘                        └──────────────┘                       └────────────┘
       │                                                                            │
       │  fallback when                                              PRD_EDW_STG.UAM_MONITORING
       ▼  API unavailable                                           ┌───────────────────────┐
┌─────────────┐                                                     │ MONITORING_EVENTS      │
│  Seed Data  │                                                     │ JOB_REGISTRY           │
│ (generated) │                                                     │ PIPELINE_CATALOG       │
└─────────────┘                                                     │ CATALOG_LINEAGE        │
                                                                    │ CATALOG_DIAGRAMS       │
                                                                    │ CATALOG_DOCUMENTS      │
                                                                    │ 6 analytics views      │
                                                                    └───────────────────────┘
```

## Build

```bash
npm run build      # TypeScript check + Vite production build → dist/
npm run preview    # Serve production build locally on port 4173
```
