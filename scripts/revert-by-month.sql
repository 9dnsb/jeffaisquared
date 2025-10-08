-- ============================================================================
-- Revert to Original Timestamps - By Month
-- ============================================================================
-- Run each UPDATE separately to avoid deadlock
-- ============================================================================

-- 2023-06
UPDATE orders
SET "date" = ("date" AT TIME ZONE 'America/Toronto') AT TIME ZONE 'UTC'
WHERE "date" >= '2023-06-01'::timestamptz AND "date" < '2023-07-01'::timestamptz;

-- 2023-07
UPDATE orders
SET "date" = ("date" AT TIME ZONE 'America/Toronto') AT TIME ZONE 'UTC'
WHERE "date" >= '2023-07-01'::timestamptz AND "date" < '2023-08-01'::timestamptz;

-- 2023-08
UPDATE orders
SET "date" = ("date" AT TIME ZONE 'America/Toronto') AT TIME ZONE 'UTC'
WHERE "date" >= '2023-08-01'::timestamptz AND "date" < '2023-09-01'::timestamptz;

-- 2023-09
UPDATE orders
SET "date" = ("date" AT TIME ZONE 'America/Toronto') AT TIME ZONE 'UTC'
WHERE "date" >= '2023-09-01'::timestamptz AND "date" < '2023-10-01'::timestamptz;

-- 2023-10
UPDATE orders
SET "date" = ("date" AT TIME ZONE 'America/Toronto') AT TIME ZONE 'UTC'
WHERE "date" >= '2023-10-01'::timestamptz AND "date" < '2023-11-01'::timestamptz;

-- 2023-11
UPDATE orders
SET "date" = ("date" AT TIME ZONE 'America/Toronto') AT TIME ZONE 'UTC'
WHERE "date" >= '2023-11-01'::timestamptz AND "date" < '2023-12-01'::timestamptz;

-- 2023-12
UPDATE orders
SET "date" = ("date" AT TIME ZONE 'America/Toronto') AT TIME ZONE 'UTC'
WHERE "date" >= '2023-12-01'::timestamptz AND "date" < '2024-01-01'::timestamptz;

-- 2024-01
UPDATE orders
SET "date" = ("date" AT TIME ZONE 'America/Toronto') AT TIME ZONE 'UTC'
WHERE "date" >= '2024-01-01'::timestamptz AND "date" < '2024-02-01'::timestamptz;

-- 2024-02
UPDATE orders
SET "date" = ("date" AT TIME ZONE 'America/Toronto') AT TIME ZONE 'UTC'
WHERE "date" >= '2024-02-01'::timestamptz AND "date" < '2024-03-01'::timestamptz;

-- 2024-03
UPDATE orders
SET "date" = ("date" AT TIME ZONE 'America/Toronto') AT TIME ZONE 'UTC'
WHERE "date" >= '2024-03-01'::timestamptz AND "date" < '2024-04-01'::timestamptz;

-- 2024-04
UPDATE orders
SET "date" = ("date" AT TIME ZONE 'America/Toronto') AT TIME ZONE 'UTC'
WHERE "date" >= '2024-04-01'::timestamptz AND "date" < '2024-05-01'::timestamptz;

-- 2024-05
UPDATE orders
SET "date" = ("date" AT TIME ZONE 'America/Toronto') AT TIME ZONE 'UTC'
WHERE "date" >= '2024-05-01'::timestamptz AND "date" < '2024-06-01'::timestamptz;

-- 2024-06
UPDATE orders
SET "date" = ("date" AT TIME ZONE 'America/Toronto') AT TIME ZONE 'UTC'
WHERE "date" >= '2024-06-01'::timestamptz AND "date" < '2024-07-01'::timestamptz;

-- 2024-07
UPDATE orders
SET "date" = ("date" AT TIME ZONE 'America/Toronto') AT TIME ZONE 'UTC'
WHERE "date" >= '2024-07-01'::timestamptz AND "date" < '2024-08-01'::timestamptz;

-- 2024-08
UPDATE orders
SET "date" = ("date" AT TIME ZONE 'America/Toronto') AT TIME ZONE 'UTC'
WHERE "date" >= '2024-08-01'::timestamptz AND "date" < '2024-09-01'::timestamptz;

-- 2024-09
UPDATE orders
SET "date" = ("date" AT TIME ZONE 'America/Toronto') AT TIME ZONE 'UTC'
WHERE "date" >= '2024-09-01'::timestamptz AND "date" < '2024-10-01'::timestamptz;

-- 2024-10
UPDATE orders
SET "date" = ("date" AT TIME ZONE 'America/Toronto') AT TIME ZONE 'UTC'
WHERE "date" >= '2024-10-01'::timestamptz AND "date" < '2024-11-01'::timestamptz;

-- 2024-11
UPDATE orders
SET "date" = ("date" AT TIME ZONE 'America/Toronto') AT TIME ZONE 'UTC'
WHERE "date" >= '2024-11-01'::timestamptz AND "date" < '2024-12-01'::timestamptz;

-- 2024-12
UPDATE orders
SET "date" = ("date" AT TIME ZONE 'America/Toronto') AT TIME ZONE 'UTC'
WHERE "date" >= '2024-12-01'::timestamptz AND "date" < '2025-01-01'::timestamptz;

-- 2025-01
UPDATE orders
SET "date" = ("date" AT TIME ZONE 'America/Toronto') AT TIME ZONE 'UTC'
WHERE "date" >= '2025-01-01'::timestamptz AND "date" < '2025-02-01'::timestamptz;

-- 2025-02
UPDATE orders
SET "date" = ("date" AT TIME ZONE 'America/Toronto') AT TIME ZONE 'UTC'
WHERE "date" >= '2025-02-01'::timestamptz AND "date" < '2025-03-01'::timestamptz;

-- 2025-03
UPDATE orders
SET "date" = ("date" AT TIME ZONE 'America/Toronto') AT TIME ZONE 'UTC'
WHERE "date" >= '2025-03-01'::timestamptz AND "date" < '2025-04-01'::timestamptz;

-- 2025-04
UPDATE orders
SET "date" = ("date" AT TIME ZONE 'America/Toronto') AT TIME ZONE 'UTC'
WHERE "date" >= '2025-04-01'::timestamptz AND "date" < '2025-05-01'::timestamptz;

-- 2025-05
UPDATE orders
SET "date" = ("date" AT TIME ZONE 'America/Toronto') AT TIME ZONE 'UTC'
WHERE "date" >= '2025-05-01'::timestamptz AND "date" < '2025-06-01'::timestamptz;

-- 2025-06
UPDATE orders
SET "date" = ("date" AT TIME ZONE 'America/Toronto') AT TIME ZONE 'UTC'
WHERE "date" >= '2025-06-01'::timestamptz AND "date" < '2025-07-01'::timestamptz;

-- 2025-07
UPDATE orders
SET "date" = ("date" AT TIME ZONE 'America/Toronto') AT TIME ZONE 'UTC'
WHERE "date" >= '2025-07-01'::timestamptz AND "date" < '2025-08-01'::timestamptz;

-- 2025-08
UPDATE orders
SET "date" = ("date" AT TIME ZONE 'America/Toronto') AT TIME ZONE 'UTC'
WHERE "date" >= '2025-08-01'::timestamptz AND "date" < '2025-09-01'::timestamptz;

-- 2025-09
UPDATE orders
SET "date" = ("date" AT TIME ZONE 'America/Toronto') AT TIME ZONE 'UTC'
WHERE "date" >= '2025-09-01'::timestamptz AND "date" < '2025-10-01'::timestamptz;

-- 2025-10
UPDATE orders
SET "date" = ("date" AT TIME ZONE 'America/Toronto') AT TIME ZONE 'UTC'
WHERE "date" >= '2025-10-01'::timestamptz AND "date" < '2025-11-01'::timestamptz;

-- Verify
SELECT
  EXTRACT(HOUR FROM "date") as hour,
  COUNT(*) as count
FROM orders
WHERE state = 'COMPLETED'
GROUP BY hour
ORDER BY count DESC
LIMIT 10;
