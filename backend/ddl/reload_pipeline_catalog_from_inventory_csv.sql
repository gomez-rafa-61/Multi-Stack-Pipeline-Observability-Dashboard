-- =============================================================================
-- Re-populate PIPELINE_CATALOG + PIPELINE_CATALOG_ENTITY
-- from "Data Pipeline Inventory Hub" CSV export (version 4+)
-- =============================================================================
-- Source CSV columns (header row):
--   Platform, Pipeline Name, Pipeline Description, Entity, Entity Description,
--   Business Segment, Data Provider, Database Details, Data Direction,
--   Connection Type, URI, Data Environment, Owner Name, Owner Email,
--   Engineer Name, Engineer Email, Data Classification, Refresh Frequency
--
-- Target: PRD_EDW_STG.UAM_MONITORING
--   PIPELINE_CATALOG         — one row per unique (Platform, Pipeline Name)
--   PIPELINE_CATALOG_ENTITY  — one row per (Pipeline, Entity) pair
--
-- Usage (Snowflake UI or SnowSQL):
--   1. PUT the CSV on your user stage, e.g.:
--        PUT file:///local/path/pipeline_inventory_hub_4.csv @~/catalog_load/ AUTO_COMPRESS=FALSE OVERWRITE=TRUE;
--   2. Edit the COPY PATTERN on line ~85 if your filename differs.
--   3. Run the full script in one session.
-- =============================================================================

USE DATABASE PRD_EDW_STG;
USE SCHEMA UAM_MONITORING;

SET RUN_BY = 'reload_pipeline_catalog_from_inventory_csv';

-- ---------------------------------------------------------------------------
-- 0. File format (idempotent)
-- ---------------------------------------------------------------------------
CREATE FILE FORMAT IF NOT EXISTS FF_PIPELINE_INVENTORY_CSV
    TYPE = CSV
    COMPRESSION = AUTO
    FIELD_OPTIONALLY_ENCLOSED_BY = '"'
    SKIP_HEADER = 1
    EMPTY_FIELD_AS_NULL = TRUE
    TRIM_SPACE = TRUE
    ERROR_ON_COLUMN_COUNT_MISMATCH = TRUE
    ESCAPE = NONE
    ENCODING = UTF8;

-- ---------------------------------------------------------------------------
-- 1. Staging table — column order matches CSV header exactly
-- ---------------------------------------------------------------------------
CREATE OR REPLACE TEMP TABLE STG_PIPELINE_INVENTORY (
    PLATFORM_RAW            VARCHAR(200),
    PIPELINE_NAME           VARCHAR(2000),
    PIPELINE_DESCRIPTION    VARCHAR(8000),
    ENTITY_NAME             VARCHAR(2000),
    ENTITY_DESCRIPTION      VARCHAR(4000),
    BUSINESS_SEGMENT        VARCHAR(500),
    DATA_PROVIDER           VARCHAR(500),
    DATABASE_DETAILS        VARCHAR(2000),
    DATA_DIRECTION          VARCHAR(100),
    CONNECTION_TYPE         VARCHAR(200),
    URI                     VARCHAR(4000),
    DATA_ENVIRONMENT        VARCHAR(100),
    OWNER_NAME              VARCHAR(500),
    OWNER_EMAIL             VARCHAR(500),
    ENGINEER_NAME           VARCHAR(500),
    ENGINEER_EMAIL          VARCHAR(500),
    DATA_CLASSIFICATION     VARCHAR(100),
    REFRESH_FREQUENCY       VARCHAR(500)
);

COPY INTO STG_PIPELINE_INVENTORY (
    PLATFORM_RAW,
    PIPELINE_NAME,
    PIPELINE_DESCRIPTION,
    ENTITY_NAME,
    ENTITY_DESCRIPTION,
    BUSINESS_SEGMENT,
    DATA_PROVIDER,
    DATABASE_DETAILS,
    DATA_DIRECTION,
    CONNECTION_TYPE,
    URI,
    DATA_ENVIRONMENT,
    OWNER_NAME,
    OWNER_EMAIL,
    ENGINEER_NAME,
    ENGINEER_EMAIL,
    DATA_CLASSIFICATION,
    REFRESH_FREQUENCY
)
FROM @~/catalog_load/
FILE_FORMAT = (FORMAT_NAME = 'FF_PIPELINE_INVENTORY_CSV')
PATTERN = '.*[Pp]ipeline.*[Ii]nventory.*\\.csv';

-- ---------------------------------------------------------------------------
-- 2. Clear existing catalog data (child → parent order)
-- ---------------------------------------------------------------------------
DELETE FROM PIPELINE_CATALOG_ENTITY;
DELETE FROM CATALOG_LINEAGE;
DELETE FROM CATALOG_DIAGRAMS;
DELETE FROM CATALOG_DOCUMENTS;
DELETE FROM PIPELINE_CATALOG;

-- ---------------------------------------------------------------------------
-- 3. Insert pipelines (unique per Platform + Pipeline Name)
-- ---------------------------------------------------------------------------
INSERT INTO PIPELINE_CATALOG (
    CATALOG_ID,
    PLATFORM,
    PIPELINE_NAME,
    PIPELINE_DESCRIPTION,
    BUSINESS_SEGMENT,
    DATA_PROVIDER,
    DATA_DIRECTION,
    CONNECTION_TYPE,
    DATA_ENVIRONMENT,
    OWNER_NAME,
    OWNER_EMAIL,
    ENGINEER_NAME,
    ENGINEER_EMAIL,
    IS_DOCUMENTED,
    TAGS,
    DATA_CLASSIFICATION,
    REFRESH_FREQUENCY,
    CATALOG_STATUS,
    DEPRECATION_DATE,
    LAST_CATALOG_UPDATE,
    UPDATED_BY,
    CREATED_AT,
    CREATED_BY
)
WITH base AS (
    SELECT
        TRIM(s.PLATFORM_RAW)                                AS platform_raw,
        TRIM(s.PIPELINE_NAME)                               AS pipeline_name,
        NULLIF(TRIM(s.PIPELINE_DESCRIPTION), '')            AS pipeline_description,
        NULLIF(TRIM(s.BUSINESS_SEGMENT), '')                AS business_segment,
        NULLIF(TRIM(s.DATA_PROVIDER), '')                   AS data_provider,
        NULLIF(TRIM(s.DATA_DIRECTION), '')                  AS data_direction,
        NULLIF(TRIM(s.CONNECTION_TYPE), '')                 AS connection_type,
        NULLIF(TRIM(s.DATA_ENVIRONMENT), '')                AS data_environment,
        NULLIF(TRIM(s.OWNER_NAME), '')                      AS owner_name,
        NULLIF(TRIM(s.OWNER_EMAIL), '')                     AS owner_email,
        NULLIF(TRIM(s.ENGINEER_NAME), '')                   AS engineer_name,
        NULLIF(TRIM(s.ENGINEER_EMAIL), '')                  AS engineer_email,
        NULLIF(TRIM(s.DATA_CLASSIFICATION), '')             AS data_classification_raw,
        NULLIF(TRIM(s.REFRESH_FREQUENCY), '')               AS refresh_frequency
    FROM STG_PIPELINE_INVENTORY s
    WHERE TRIM(s.PLATFORM_RAW)  IS NOT NULL AND TRIM(s.PLATFORM_RAW)  <> ''
      AND TRIM(s.PIPELINE_NAME) IS NOT NULL AND TRIM(s.PIPELINE_NAME) <> ''
),
mapped AS (
    SELECT
        b.*,
        CASE UPPER(b.platform_raw)
            WHEN 'AIRBYTE'         THEN 'AIRBYTE'
            WHEN 'DATABRICKS'      THEN 'DATABRICKS'
            WHEN 'POWER AUTOMATE'  THEN 'POWER_AUTOMATE'
            WHEN 'POWER PLATFORM'  THEN 'POWER_AUTOMATE'
            WHEN 'SNOWFLAKE'       THEN 'SNOWFLAKE'
            WHEN 'AZURE - FUNCTION' THEN 'AZURE_FUNCTION'
            ELSE UPPER(REPLACE(REPLACE(b.platform_raw, ' ', '_'), '-', '_'))
        END AS platform
    FROM base b
),
deduped AS (
    SELECT m.*
    FROM mapped m
    QUALIFY ROW_NUMBER() OVER (
        PARTITION BY m.platform, m.pipeline_name
        ORDER BY m.pipeline_name
    ) = 1
)
SELECT
    UUID_STRING()                                           AS catalog_id,
    d.platform,
    LEFT(d.pipeline_name, 500)                              AS pipeline_name,
    d.pipeline_description,
    LEFT(d.business_segment, 200)                           AS business_segment,
    LEFT(d.data_provider, 300)                              AS data_provider,
    LEFT(d.data_direction, 50)                              AS data_direction,
    LEFT(d.connection_type, 100)                            AS connection_type,
    LEFT(d.data_environment, 50)                            AS data_environment,
    LEFT(d.owner_name, 200)                                 AS owner_name,
    LEFT(d.owner_email, 300)                                AS owner_email,
    LEFT(d.engineer_name, 200)                              AS engineer_name,
    LEFT(d.engineer_email, 300)                             AS engineer_email,
    FALSE                                                   AS is_documented,
    OBJECT_CONSTRUCT('source', 'inventory_hub_csv')         AS tags,
    COALESCE(UPPER(d.data_classification_raw), 'INTERNAL')  AS data_classification,
    LEFT(d.refresh_frequency, 50)                           AS refresh_frequency,
    'ACTIVE'                                                AS catalog_status,
    NULL::DATE                                              AS deprecation_date,
    CURRENT_TIMESTAMP()                                     AS last_catalog_update,
    $RUN_BY                                                 AS updated_by,
    CURRENT_TIMESTAMP()                                     AS created_at,
    $RUN_BY                                                 AS created_by
FROM deduped d;

-- ---------------------------------------------------------------------------
-- 4. Insert entities — join back to PIPELINE_CATALOG for CATALOG_ID
-- ---------------------------------------------------------------------------
INSERT INTO PIPELINE_CATALOG_ENTITY (
    ENTITY_ID,
    CATALOG_ID,
    ENTITY_NAME,
    ENTITY_DESCRIPTION,
    DATABASE_DETAILS,
    URI,
    CREATED_AT,
    CREATED_BY
)
WITH raw AS (
    SELECT
        TRIM(s.PLATFORM_RAW)                            AS platform_raw,
        TRIM(s.PIPELINE_NAME)                           AS pipeline_name,
        NULLIF(TRIM(s.ENTITY_NAME), '')                 AS entity_name,
        NULLIF(TRIM(s.ENTITY_DESCRIPTION), '')          AS entity_description,
        NULLIF(TRIM(s.DATABASE_DETAILS), '')            AS database_details,
        NULLIF(TRIM(s.URI), '')                         AS uri
    FROM STG_PIPELINE_INVENTORY s
    WHERE TRIM(s.PLATFORM_RAW)  IS NOT NULL AND TRIM(s.PLATFORM_RAW)  <> ''
      AND TRIM(s.PIPELINE_NAME) IS NOT NULL AND TRIM(s.PIPELINE_NAME) <> ''
      AND TRIM(s.ENTITY_NAME)   IS NOT NULL AND TRIM(s.ENTITY_NAME)   <> ''
),
with_platform AS (
    SELECT
        r.*,
        CASE UPPER(r.platform_raw)
            WHEN 'AIRBYTE'          THEN 'AIRBYTE'
            WHEN 'DATABRICKS'       THEN 'DATABRICKS'
            WHEN 'POWER AUTOMATE'   THEN 'POWER_AUTOMATE'
            WHEN 'POWER PLATFORM'   THEN 'POWER_AUTOMATE'
            WHEN 'SNOWFLAKE'        THEN 'SNOWFLAKE'
            WHEN 'AZURE - FUNCTION' THEN 'AZURE_FUNCTION'
            ELSE UPPER(REPLACE(REPLACE(r.platform_raw, ' ', '_'), '-', '_'))
        END AS platform
    FROM raw r
)
SELECT
    UUID_STRING()                   AS entity_id,
    c.CATALOG_ID,
    LEFT(e.entity_name, 500)        AS entity_name,
    e.entity_description,
    LEFT(e.database_details, 2000)  AS database_details,
    LEFT(e.uri, 2000)               AS uri,
    CURRENT_TIMESTAMP()             AS created_at,
    $RUN_BY                         AS created_by
FROM with_platform e
JOIN PIPELINE_CATALOG c
    ON  UPPER(c.PLATFORM)       = UPPER(e.platform)
    AND UPPER(TRIM(c.PIPELINE_NAME)) = UPPER(TRIM(e.pipeline_name))
QUALIFY ROW_NUMBER() OVER (
    PARTITION BY c.CATALOG_ID, e.entity_name
    ORDER BY e.entity_name
) = 1;

-- ---------------------------------------------------------------------------
-- 5. Sanity checks
-- ---------------------------------------------------------------------------
SELECT 'PIPELINE_CATALOG row count'        AS metric, COUNT(*) AS value FROM PIPELINE_CATALOG
UNION ALL
SELECT 'PIPELINE_CATALOG_ENTITY row count', COUNT(*) FROM PIPELINE_CATALOG_ENTITY
UNION ALL
SELECT 'CATALOG_LINEAGE row count',         COUNT(*) FROM CATALOG_LINEAGE
UNION ALL
SELECT 'CATALOG_DIAGRAMS row count',        COUNT(*) FROM CATALOG_DIAGRAMS
UNION ALL
SELECT 'CATALOG_DOCUMENTS row count',       COUNT(*) FROM CATALOG_DOCUMENTS;

SELECT PLATFORM, COUNT(*) AS pipelines, SUM(entity_cnt) AS entities
FROM (
    SELECT c.PLATFORM, c.CATALOG_ID, COUNT(e.ENTITY_ID) AS entity_cnt
    FROM PIPELINE_CATALOG c
    LEFT JOIN PIPELINE_CATALOG_ENTITY e ON e.CATALOG_ID = c.CATALOG_ID
    GROUP BY c.PLATFORM, c.CATALOG_ID
)
GROUP BY 1
ORDER BY 2 DESC, 1;
