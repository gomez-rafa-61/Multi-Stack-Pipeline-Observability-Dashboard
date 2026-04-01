# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Full-stack observability dashboard for monitoring data pipelines across Databricks, Airbyte, Snowflake, and Power Automate. React/TypeScript frontend with a Python FastAPI backend connected to Snowflake.

## Commands

### Frontend (from project root)
- **Dev server:** `npm run dev` (http://localhost:5173, proxies `/api` to backend)
- **Build:** `npm run build` (runs `tsc -b && vite build`, outputs to `dist/`)
- **Preview:** `npm run preview` (http://localhost:4173)

### Backend (from `backend/` directory)
- **Start API:** `python -m uvicorn app.main:app --port 8000`
- **Test Snowflake connection:** `python test_connection.py`

### Full-stack development
Start backend first (`uvicorn` on port 8000), then frontend (`npm run dev`). Vite proxies `/api` requests to the backend automatically via `vite.config.ts`.

## Architecture

### Frontend (`src/`)
- **React 19 + TypeScript 5.9 + Vite 7** with Tailwind CSS 4 dark theme
- **Path alias:** `@/` maps to `./src/` (configured in both `vite.config.ts` and `tsconfig.json`)
- **Routing:** React Router with two pages — `Overview` (main dashboard) and `JobPerformance` (analytics), both wrapped in `DashboardLayout`
- **Charts:** Recharts library for all visualizations (stacked bars, line charts, sparklines)
- **API client** (`src/services/api-client.ts`): Fetches from 7 REST endpoints. Falls back to procedurally generated seed data (`src/data/seed-data.ts`) when the backend is unavailable. Normalizes Snowflake's UPPER_SNAKE_CASE columns to camelCase.
- **Platform metadata** (`src/config/platform-meta.tsx`): Maps platform keys to display names and Lucide icons

### Backend (`backend/app/`)
- **FastAPI** with 7 API endpoints under `/api/` prefix, plus `/api/health`
- **No ORM:** Raw SQL queries defined as constants in `queries.py`, executed against Snowflake analytics views in `PRD_EDW_STG.UAM_MONITORING`
- **Snowflake auth** (`snowflake_client.py`): Service principal auth via `SNOWFLAKE_AUTH_METHOD` env var — key pair (RSA `.p8` file, default) or Azure AD OAuth (MSAL client_credentials). Caches a global connection and auto-reconnects on failure.
- **CORS:** Allows `localhost:5173` (dev) and `localhost:4173` (preview)

### Data flow
Snowflake views -> FastAPI queries (`queries.py`) -> `execute_query()` normalizes rows to camelCase dicts -> JSON API -> `api-client.ts` fetches & transforms -> React components render with Recharts

### Key types
All shared data shapes are in `src/types/pipeline.ts`: `PipelineHealthSummary`, `PipelineStatusTrend`, `PlatformBreakdown`, `RecentFailure`, `CyclePerformance`, `JobPerformanceRecord`.

## Conventions

- **Status values:** Always uppercase `SUCCESS`, `FAILED`, `CANCELLED` — normalized on both frontend and backend
- **Platform keys:** Uppercase strings (e.g., `SNOWFLAKE`, `DATABRICKS`, `POWER_AUTOMATE`) with alias normalization in the API client
- **Styling:** Dark theme with accent color `#e8822a` (warm orange). Custom CSS variables in `src/index.css`. All components use Tailwind utility classes.
- **Backend env:** Snowflake credentials configured via `backend/.env` (see `backend/.env.example` for template)
