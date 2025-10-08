-- 2025 only
UPDATE orders SET "date" = ("date" AT TIME ZONE 'America/Toronto') AT TIME ZONE 'UTC' WHERE "date" >= '2025-01-01'::timestamptz AND "date" < '2025-02-01'::timestamptz;
UPDATE orders SET "date" = ("date" AT TIME ZONE 'America/Toronto') AT TIME ZONE 'UTC' WHERE "date" >= '2025-02-01'::timestamptz AND "date" < '2025-03-01'::timestamptz;
UPDATE orders SET "date" = ("date" AT TIME ZONE 'America/Toronto') AT TIME ZONE 'UTC' WHERE "date" >= '2025-03-01'::timestamptz AND "date" < '2025-04-01'::timestamptz;
UPDATE orders SET "date" = ("date" AT TIME ZONE 'America/Toronto') AT TIME ZONE 'UTC' WHERE "date" >= '2025-04-01'::timestamptz AND "date" < '2025-05-01'::timestamptz;
UPDATE orders SET "date" = ("date" AT TIME ZONE 'America/Toronto') AT TIME ZONE 'UTC' WHERE "date" >= '2025-05-01'::timestamptz AND "date" < '2025-06-01'::timestamptz;
UPDATE orders SET "date" = ("date" AT TIME ZONE 'America/Toronto') AT TIME ZONE 'UTC' WHERE "date" >= '2025-06-01'::timestamptz AND "date" < '2025-07-01'::timestamptz;
UPDATE orders SET "date" = ("date" AT TIME ZONE 'America/Toronto') AT TIME ZONE 'UTC' WHERE "date" >= '2025-07-01'::timestamptz AND "date" < '2025-08-01'::timestamptz;
UPDATE orders SET "date" = ("date" AT TIME ZONE 'America/Toronto') AT TIME ZONE 'UTC' WHERE "date" >= '2025-08-01'::timestamptz AND "date" < '2025-09-01'::timestamptz;
UPDATE orders SET "date" = ("date" AT TIME ZONE 'America/Toronto') AT TIME ZONE 'UTC' WHERE "date" >= '2025-09-01'::timestamptz AND "date" < '2025-10-01'::timestamptz;
UPDATE orders SET "date" = ("date" AT TIME ZONE 'America/Toronto') AT TIME ZONE 'UTC' WHERE "date" >= '2025-10-01'::timestamptz AND "date" < '2025-11-01'::timestamptz;
SELECT '2025 reverted' as status;
