# Multi-Stack Pipeline Observability Dashboard

Real-time observability dashboard for monitoring data pipelines across Databricks, Airbyte, Snowflake, and Power Automate. Surfaces health metrics, failure trends, and job performance from a unified Snowflake data warehouse.

<!-- Replace with an actual screenshot of the Overview page -->
![Dashboard Overview](docs/screenshots/overview.png)

## Tech Stack

| Layer    | Technology                              |
| -------- | --------------------------------------- |
| Frontend | React 19, TypeScript 5.9, Vite 7       |
| Styling  | Tailwind CSS 4 (custom dark theme)      |
| Charts   | Recharts 3                              |
| Backend  | Python, FastAPI, Uvicorn                |
| Database | Snowflake (DirectQuery against views)   |

## Prerequisites

- **Node.js** >= 18
- **Python** >= 3.10
- **Snowflake** account with access to `PRD_EDW_STG.UAM_MONITORING` views

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

### 3. Verify Snowflake connection

```bash
cd backend
python test_connection.py
```

### 4. Start the application

```bash
# Terminal 1 — Backend (from backend/ directory)
python -m uvicorn app.main:app --port 8000

# Terminal 2 — Frontend (from project root)
npm run dev
```

Open **http://localhost:5173**. The Vite dev server proxies all `/api` requests to the backend.

> **No Snowflake access?** The frontend falls back to procedurally generated seed data when the API is unavailable, so you can still develop UI components without a backend.

## Project Structure

```
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app — 7 API endpoints
│   │   ├── snowflake_client.py  # Connection management & auth
│   │   └── queries.py           # SQL query constants
│   ├── test_connection.py       # Snowflake connectivity test
│   ├── requirements.txt
│   └── .env.example
├── src/
│   ├── pages/                   # Overview, JobPerformance
│   ├── components/
│   │   ├── layout/              # DashboardLayout, Header, Sidebar
│   │   ├── charts/              # Recharts visualizations
│   │   ├── tables/              # Data tables with search/filter
│   │   ├── metrics/             # KPI cards with sparklines
│   │   └── ui/                  # StatusBadge, SearchInput, etc.
│   ├── services/api-client.ts   # API client with seed data fallback
│   ├── types/pipeline.ts        # Shared TypeScript interfaces
│   ├── config/platform-meta.tsx # Platform icons & display names
│   └── data/seed-data.ts        # Mock data generator
├── doc/
│   └── POWERBI-DASHBOARD-GUIDE.md
├── vite.config.ts
├── tsconfig.json
└── package.json
```

## API Endpoints

All endpoints are `GET` requests under the `/api` prefix.

| Endpoint               | Description                                  | Window |
| ---------------------- | -------------------------------------------- | ------ |
| `/api/health-summary`  | Aggregate KPIs (total, success, failed runs)  | 24h    |
| `/api/status-trend`    | Hourly run counts by platform and status     | 7d     |
| `/api/platform-breakdown` | Platform-level success rates and run counts | 7d    |
| `/api/recent-failures` | Latest 50 pipeline failures with error messages | 7d  |
| `/api/cycle-performance` | UAM cycle duration and adapter success rates | 7d   |
| `/api/job-performance` | Job-level aggregated statistics               | 30d    |
| `/api/platforms`       | List of available pipeline platforms          | —      |
| `/api/health`          | Backend health check                          | —      |

## Architecture

```
┌─────────────┐       GET /api/*       ┌──────────────┐      SQL Queries      ┌────────────┐
│   React UI  │ ◄───────────────────── │   FastAPI    │ ◄──────────────────── │ Snowflake  │
│  (Vite dev  │   JSON (camelCase)     │  (Uvicorn)   │   UPPER_SNAKE_CASE   │   Views    │
│   server)   │                        │              │   → camelCase norm   │            │
└─────────────┘                        └──────────────┘                       └────────────┘
       │                                                                            │
       │  fallback when                                              PRD_EDW_STG.UAM_MONITORING
       ▼  API unavailable                                           ┌───────────────────────┐
┌─────────────┐                                                     │ MONITORING_EVENTS      │
│  Seed Data  │                                                     │ JOB_REGISTRY           │
│ (generated) │                                                     │ 6 analytics views      │
└─────────────┘                                                     └───────────────────────┘
```

## Build

```bash
npm run build      # TypeScript check + Vite production build → dist/
npm run preview    # Serve production build locally on port 4173
```

<!-- Replace with an actual screenshot of the Job Performance page -->
![Job Performance](docs/screenshots/job-performance.png)
