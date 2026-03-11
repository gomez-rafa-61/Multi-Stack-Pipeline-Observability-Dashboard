# UAM Pipeline Monitor — Power BI Dashboard Guide

A comprehensive guide for building a live Power BI dashboard that displays pipeline health, performance metrics, and failure analysis across Databricks, Airbyte, Power Automate, and Snowflake.

---

## 1. Overview

**Purpose:** Provide at-a-glance visibility into pipeline health across all four data platforms monitored by UAM, with live data that updates on every page load.

**Architecture:**

```
UAM Azure Function (every 15 min)
    │
    ▼
Snowflake Tables (MONITORING_EVENTS, CYCLE_STATUS_LOGS)
    │
    ▼
Analytics Views (6 pre-computed views)
    │
    ▼
Power BI DirectQuery (live queries on page load)
    │
    ▼
Dashboard (KPIs, trends, failures, job stats)
```

**Why DirectQuery (not Import):**
- Live data on every page load — no scheduled refresh needed
- Data is always current (within 15 minutes of UAM cycle)
- No Power BI dataset storage costs
- Views handle all aggregation — Power BI only renders

**Data freshness:** Updates every 15 minutes (UAM monitoring cycle interval).

---

## 2. Prerequisites

| Requirement | Details |
|-------------|---------|
| Power BI Desktop | Latest version (free download from Microsoft) |
| Snowflake connector | Built into Power BI Desktop — no separate driver needed |
| Snowflake access | READ privilege on `PRD_EDW_STG.UAM_MONITORING` schema |
| Analytics views deployed | Run `python scripts/deploy-dashboard-views.py` |
| Data flowing | UAM Azure Function running and ingesting to Snowflake |

---

## 3. Snowflake DirectQuery Connection Setup

### Step 1: Open Power BI Desktop

File > New Report (or open existing)

### Step 2: Get Data

1. Click **Get Data** on the Home ribbon
2. Search for **Snowflake** in the connector list
3. Click **Snowflake** > **Connect**

### Step 3: Enter Connection Details

| Field | Value |
|-------|-------|
| Server | `zb45354.east-us-2.azure.snowflakecomputing.com` |
| Warehouse | `WH_POWERAPP_PRD` |
| Database | `PRD_EDW_STG` (optional — can select later) |
| Schema | `UAM_MONITORING` (optional — can select later) |

**CRITICAL:** Under **Data Connectivity mode**, select **DirectQuery** (not Import). This is what enables live data.

### Step 4: Authenticate

- Select **Database** authentication
- Enter Snowflake username and password
- Click **Connect**

### Step 5: Select Views

In the Navigator panel:
1. Expand `PRD_EDW_STG` > `UAM_MONITORING`
2. Select all 6 views:
   - `V_PIPELINE_HEALTH_SUMMARY`
   - `V_PIPELINE_STATUS_TREND`
   - `V_PLATFORM_BREAKDOWN`
   - `V_RECENT_FAILURES`
   - `V_CYCLE_PERFORMANCE`
   - `V_JOB_PERFORMANCE`
3. Click **Load** (no Transform needed — views are pre-computed)

---

## 4. Data Model

All 6 views are **independent** — no relationships needed between them. Each view is self-contained at its own grain level.

| View | Grain | Purpose | Key Columns |
|------|-------|---------|-------------|
| `V_PIPELINE_HEALTH_SUMMARY` | Single row (last 24h) | KPI cards | `SUCCESS_RATE_PCT`, `TOTAL_RUNS`, `FAILED_RUNS`, `AVG_DURATION_SECONDS` |
| `V_PIPELINE_STATUS_TREND` | Hour x Platform x Status (7d) | Trend line/area chart | `PERIOD`, `PLATFORM`, `STATUS`, `RUN_COUNT` |
| `V_PLATFORM_BREAKDOWN` | Platform x Status (7d) | Stacked bar chart | `PLATFORM`, `STATUS`, `RUN_COUNT`, `SUCCESS_RATE_PCT` |
| `V_RECENT_FAILURES` | Individual failure events (7d) | Detail table | `EVENT_TIME`, `PLATFORM`, `JOB_NAME`, `ERROR_MESSAGE`, `LOG_URL` |
| `V_CYCLE_PERFORMANCE` | Individual UAM cycles (7d) | Cycle trend chart | `CYCLE_TIMESTAMP`, `DURATION_SECONDS`, `TOTAL_RUNS` |
| `V_JOB_PERFORMANCE` | Job (30d aggregate) | Job stats table | `PLATFORM`, `JOB_NAME`, `SUCCESS_RATE_PCT`, `FAILED_RUNS` |

**Storage mode:** Confirm all tables show **DirectQuery** in the Model view (not Import).

---

## 5. DAX Measures

Create a dedicated **Measures** table in Power BI (Modeling > New Table > `Measures = {0}`), then add these measures:

### KPI Measures

```dax
Success Rate = 
    MAX(V_PIPELINE_HEALTH_SUMMARY[SUCCESS_RATE_PCT])
```

```dax
Total Runs = 
    MAX(V_PIPELINE_HEALTH_SUMMARY[TOTAL_RUNS])
```

```dax
Active Failures = 
    MAX(V_PIPELINE_HEALTH_SUMMARY[FAILED_RUNS])
```

```dax
Avg Duration = 
    FORMAT(
        MAX(V_PIPELINE_HEALTH_SUMMARY[AVG_DURATION_SECONDS]) / 60,
        "0.0"
    ) & " min"
```

```dax
Active Platforms = 
    MAX(V_PIPELINE_HEALTH_SUMMARY[ACTIVE_PLATFORMS]) & " / 4"
```

### Conditional Formatting Measures

```dax
Success Rate Color = 
    VAR rate = MAX(V_PIPELINE_HEALTH_SUMMARY[SUCCESS_RATE_PCT])
    RETURN
        IF(rate >= 99, "#2D8B4E",
        IF(rate >= 95, "#E8913A",
        "#D64045"))
```

```dax
Failure Color = 
    VAR fails = MAX(V_PIPELINE_HEALTH_SUMMARY[FAILED_RUNS])
    RETURN
        IF(fails = 0, "#2D8B4E",
        IF(fails <= 3, "#E8913A",
        "#D64045"))
```

### Trend Measures

```dax
Hourly Success Runs = 
    CALCULATE(
        SUM(V_PIPELINE_STATUS_TREND[RUN_COUNT]),
        V_PIPELINE_STATUS_TREND[STATUS] = "SUCCESS"
    )
```

```dax
Hourly Failed Runs = 
    CALCULATE(
        SUM(V_PIPELINE_STATUS_TREND[RUN_COUNT]),
        V_PIPELINE_STATUS_TREND[STATUS] = "FAILED"
    )
```

### Table Display Measures

```dax
Time Ago = 
    VAR mins = MIN(V_RECENT_FAILURES[MINUTES_AGO])
    RETURN
        IF(mins < 60, mins & " min ago",
        IF(mins < 1440, ROUND(mins / 60, 0) & " hr ago",
        ROUND(mins / 1440, 0) & " days ago"))
```

---

## 6. Report Pages and Visual Layout

### Page 1: Pipeline Health Overview (Main Page)

Set page size to **1920 x 1080** (Format > Page size > Custom).

```
┌─────────────────────────────────────────────────────────────────────────┐
│  UAM Pipeline Monitor                       Last Refresh: <timestamp>   │
├──────────┬──────────┬──────────┬──────────┬─────────────────────────────┤
│ SUCCESS  │ TOTAL    │ FAILURES │ AVG      │ PLATFORMS                   │
│ RATE     │ RUNS     │          │ DURATION │                             │
│ 99.2%    │ 342      │ 3        │ 4.5 min  │ 4 / 4                      │
│ [Card]   │ [Card]   │ [Card]   │ [Card]   │ [Card]                     │
├──────────┴──────────┴──────────┴──────────┴─────────────────────────────┤
│                                                                         │
│  Pipeline Health Trend (7 Days)             │ Platform Success Rates    │
│  ┌────────────────────────────────┐         │ ┌────────────────────────┐│
│  │ Stacked area chart             │         │ │ Databricks    99.1%    ││
│  │ X: PERIOD                      │         │ │ Airbyte       97.3%    ││
│  │ Y: RUN_COUNT                   │         │ │ Snowflake     100.0%   ││
│  │ Legend: STATUS                  │         │ │ Power Auto    95.0%    ││
│  │ (from V_PIPELINE_STATUS_TREND) │         │ │ (V_PLATFORM_BREAKDOWN) ││
│  └────────────────────────────────┘         │ └────────────────────────┘│
│                                                                         │
├─────────────────────────────────────────────────────────────────────────┤
│  Runs by Platform (7 Days)                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │ Stacked bar chart (horizontal)                                      ││
│  │ Y: PLATFORM    Values: RUN_COUNT    Legend: STATUS                  ││
│  │ Colors: SUCCESS=#2D8B4E  FAILED=#D64045  CANCELLED=#E8913A         ││
│  │ (from V_PLATFORM_BREAKDOWN)                                         ││
│  └─────────────────────────────────────────────────────────────────────┘│
│                                                                         │
├─────────────────────────────────────────────────────────────────────────┤
│  Recent Failures                                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │ Table visual                                                        ││
│  │ Columns: Time Ago | PLATFORM | JOB_NAME | ERROR_MESSAGE | LOG_URL  ││
│  │ From: V_RECENT_FAILURES                                            ││
│  │ Sort: EVENT_TIME descending                                        ││
│  │ Top N: 20 rows                                                      ││
│  │ Alternate row colors: white / #FFF5F0                               ││
│  └─────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────┘
```

**Visual configurations:**

| Visual | Type | Data Source | Key Settings |
|--------|------|-------------|--------------|
| KPI Cards (5) | Card | V_PIPELINE_HEALTH_SUMMARY | Use DAX measures; conditional format Success Rate and Failures with color measures |
| Health Trend | Stacked Area | V_PIPELINE_STATUS_TREND | X=PERIOD, Y=RUN_COUNT, Legend=STATUS |
| Platform Rates | Table / Card list | V_PLATFORM_BREAKDOWN | Show PLATFORM, SUCCESS_RATE_PCT; conditional format background |
| Platform Bars | Stacked Bar | V_PLATFORM_BREAKDOWN | Y=PLATFORM, Values=RUN_COUNT, Legend=STATUS |
| Failures Table | Table | V_RECENT_FAILURES | Time Ago measure, LOG_URL as Web URL |

### Page 2: Job Performance Detail

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Job Performance (30 Days)              [Platform Slicer: All ▼]        │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │ Table visual                                                        ││
│  │ Columns: PLATFORM | JOB_NAME | TOTAL_RUNS | SUCCESS_RATE_PCT       ││
│  │          | AVG_DURATION_SECONDS | MAX_DURATION_SECONDS              ││
│  │          | FAILED_RUNS | LAST_RUN_TIME                              ││
│  │ From: V_JOB_PERFORMANCE                                            ││
│  │ Conditional format: SUCCESS_RATE_PCT background by value            ││
│  │ Sortable by all columns                                            ││
│  └─────────────────────────────────────────────────────────────────────┘│
│                                                                         │
├─────────────────────────────────────────────────────────────────────────┤
│  UAM Cycle Performance (7 Days)                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │ Line chart                                                          ││
│  │ X: CYCLE_TIMESTAMP   Y: DURATION_SECONDS                           ││
│  │ Reference line at 300 (5-minute target)                              ││
│  │ Tooltips: TOTAL_RUNS, ADAPTER_SUCCESS_RATE_PCT                      ││
│  │ From: V_CYCLE_PERFORMANCE                                          ││
│  └─────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 7. Design System

### Color Palette

Inspired by the warm, information-dense aesthetic of financial dashboards.

| Role | Hex | Sample | Usage |
|------|-----|--------|-------|
| Success | `#2D8B4E` | Green | Successful runs, high success rates |
| Failure | `#D64045` | Coral | Failed runs, critical alerts |
| Warning | `#E8913A` | Amber | Cancelled runs, degraded metrics |
| Info | `#4A90D9` | Blue | Running jobs, informational |
| Background | `#FFFFFF` | White | Main page background |
| Surface | `#FFF5F0` | Warm white | Alternate table rows, card backgrounds |
| Header | `#2C2C2C` | Dark gray | Section headers, title text |
| Body | `#4A4A4A` | Gray | Regular body text |
| Subtle | `#8C8C8C` | Light gray | Timestamps, secondary labels |
| Border | `#E8E0DB` | Warm gray | Card borders, dividers |

### Typography

| Element | Font | Size | Weight | Color |
|---------|------|------|--------|-------|
| Page title | Segoe UI | 20pt | Semibold | `#2C2C2C` |
| Section headers | Segoe UI | 14pt | Semibold | `#2C2C2C` |
| KPI values | Segoe UI | 28pt | Bold | Dynamic (color measure) |
| KPI labels | Segoe UI | 10pt | Light | `#8C8C8C` |
| Table headers | Segoe UI | 11pt | Semibold | `#4A4A4A` |
| Table body | Segoe UI | 10pt | Regular | `#4A4A4A` |

### Card Style

- Background: `#FFFFFF`
- Border: 1px solid `#E8E0DB`
- Border radius: 4px
- Shadow: None (flat design)
- Padding: 16px

### Conditional Formatting Rules

| Column | Condition | Background Color |
|--------|-----------|-----------------|
| Success Rate | >= 99% | `#E8F5E9` (light green) |
| Success Rate | 95% - 99% | `#FFF3E0` (light amber) |
| Success Rate | < 95% | `#FFEBEE` (light coral) |
| Failed Runs | 0 | `#E8F5E9` |
| Failed Runs | 1-3 | `#FFF3E0` |
| Failed Runs | > 3 | `#FFEBEE` |

### Best Practices

- Set `LOG_URL` column data category to **Web URL** so it renders as a clickable link
- Add **tooltip pages** for bar chart segments (show top 5 failing jobs on hover)
- Use **bookmarks** + buttons for time filter toggles ("Last 24h" / "7 Days" / "30 Days")
- Set page background to `#FFFFFF` (not transparent) for consistent appearance
- Add a **last refresh timestamp** text box in the header: `"Last Refresh: " & FORMAT(NOW(), "MMM DD, YYYY h:mm AM/PM")`

---

## 8. Publishing and Sharing

1. **Publish to Power BI Service:**
   - File > Publish > Select your workspace
   - Choose the team workspace (e.g., "Data Engineering")

2. **Configure data source credentials:**
   - In Power BI Service: Settings > Datasets > Data source credentials
   - Enter Snowflake credentials for DirectQuery

3. **Pin to Dashboard:**
   - Open the published report
   - Pin the 5 KPI cards to a Power BI Dashboard for at-a-glance monitoring
   - The dashboard tiles auto-refresh with DirectQuery

4. **Set up alerts:**
   - On the Success Rate KPI tile, click "..." > Manage alerts
   - Alert when Success Rate < 95%
   - Notify via email or Teams

5. **Share with team:**
   - Workspace > Share > Add team members with Viewer role
   - Or embed in a Teams channel tab

---

## 9. Performance Tips for DirectQuery

| Tip | Why |
|-----|-----|
| All views use time-bounded WHERE clauses | Snowflake only scans recent data, not full table |
| Tables clustered on `(PLATFORM, EVENT_TIME)` | Fast filtered queries when using platform slicers |
| No calculated columns in Power BI | All computation in SQL views — Power BI only renders |
| Set "Reduce number of queries" | Power BI Options > DirectQuery > Enable query reduction |
| Set query timeout to 120 seconds | Settings > Options > DirectQuery > Timeout |
| Consider Dual storage for `V_JOB_PERFORMANCE` | Import the 30-day aggregate (small data) for faster page load |
| Minimize visuals per page | Each visual = 1 DirectQuery to Snowflake; aim for < 10 per page |
| Use warehouse auto-suspend | Snowflake warehouse suspends after idle period, resumes on query |

---

## 10. Troubleshooting

| Issue | Solution |
|-------|----------|
| "Views not found" in Power BI | Run `python scripts/deploy-dashboard-views.py` to create views |
| "Schema UAM_MONITORING does not exist" | Ask Snowflake admin: `CREATE SCHEMA IF NOT EXISTS PRD_EDW_STG.UAM_MONITORING` |
| Dashboard shows no data | Verify UAM is running and ingesting: check Application Insights or `SELECT COUNT(*) FROM MONITORING_EVENTS` |
| Slow page load (> 10 seconds) | Check Snowflake warehouse is running (`ALTER WAREHOUSE WH_POWERAPP_PRD RESUME`); verify views have time filters |
| Connection error in Power BI | Verify server name includes `.snowflakecomputing.com`; check credentials; verify VPN if needed |
| Stale data (not updating) | Confirm UAM Azure Function timer is running; check `SELECT MAX(INGESTION_TIMESTAMP) FROM MONITORING_EVENTS` |
| "DirectQuery not available" | Ensure you selected DirectQuery (not Import) during setup; Snowflake connector supports DirectQuery |
| Data mismatch vs Teams alerts | Views filter by time window — old failures may have scrolled out of the 7-day window |

---

## Quick Reference: View to Visual Mapping

| Dashboard Element | View | Visual Type |
|-------------------|------|-------------|
| Success Rate KPI | `V_PIPELINE_HEALTH_SUMMARY` | Card |
| Total Runs KPI | `V_PIPELINE_HEALTH_SUMMARY` | Card |
| Failures KPI | `V_PIPELINE_HEALTH_SUMMARY` | Card |
| Avg Duration KPI | `V_PIPELINE_HEALTH_SUMMARY` | Card |
| Platforms KPI | `V_PIPELINE_HEALTH_SUMMARY` | Card |
| Health Trend Chart | `V_PIPELINE_STATUS_TREND` | Stacked Area |
| Platform Success Rates | `V_PLATFORM_BREAKDOWN` | Table/Cards |
| Runs by Platform | `V_PLATFORM_BREAKDOWN` | Stacked Bar |
| Recent Failures Table | `V_RECENT_FAILURES` | Table |
| Job Performance Table | `V_JOB_PERFORMANCE` | Table |
| Cycle Duration Chart | `V_CYCLE_PERFORMANCE` | Line Chart |
