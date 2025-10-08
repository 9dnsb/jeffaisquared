-- 2024 only
UPDATE orders SET "date" = ("date" AT TIME ZONE 'America/Toronto') AT TIME ZONE 'UTC' WHERE "date" >= '2024-01-01'::timestamptz AND "date" < '2024-02-01'::timestamptz;
UPDATE orders SET "date" = ("date" AT TIME ZONE 'America/Toronto') AT TIME ZONE 'UTC' WHERE "date" >= '2024-02-01'::timestamptz AND "date" < '2024-03-01'::timestamptz;
UPDATE orders SET "date" = ("date" AT TIME ZONE 'America/Toronto') AT TIME ZONE 'UTC' WHERE "date" >= '2024-03-01'::timestamptz AND "date" < '2024-04-01'::timestamptz;
UPDATE orders SET "date" = ("date" AT TIME ZONE 'America/Toronto') AT TIME ZONE 'UTC' WHERE "date" >= '2024-04-01'::timestamptz AND "date" < '2024-05-01'::timestamptz;
UPDATE orders SET "date" = ("date" AT TIME ZONE 'America/Toronto') AT TIME ZONE 'UTC' WHERE "date" >= '2024-05-01'::timestamptz AND "date" < '2024-06-01'::timestamptz;
UPDATE orders SET "date" = ("date" AT TIME ZONE 'America/Toronto') AT TIME ZONE 'UTC' WHERE "date" >= '2024-06-01'::timestamptz AND "date" < '2024-07-01'::timestamptz;
UPDATE orders SET "date" = ("date" AT TIME ZONE 'America/Toronto') AT TIME ZONE 'UTC' WHERE "date" >= '2024-07-01'::timestamptz AND "date" < '2024-08-01'::timestamptz;
UPDATE orders SET "date" = ("date" AT TIME ZONE 'America/Toronto') AT TIME ZONE 'UTC' WHERE "date" >= '2024-08-01'::timestamptz AND "date" < '2024-09-01'::timestamptz;
UPDATE orders SET "date" = ("date" AT TIME ZONE 'America/Toronto') AT TIME ZONE 'UTC' WHERE "date" >= '2024-09-01'::timestamptz AND "date" < '2024-10-01'::timestamptz;
UPDATE orders SET "date" = ("date" AT TIME ZONE 'America/Toronto') AT TIME ZONE 'UTC' WHERE "date" >= '2024-10-01'::timestamptz AND "date" < '2024-11-01'::timestamptz;
UPDATE orders SET "date" = ("date" AT TIME ZONE 'America/Toronto') AT TIME ZONE 'UTC' WHERE "date" >= '2024-11-01'::timestamptz AND "date" < '2024-12-01'::timestamptz;
UPDATE orders SET "date" = ("date" AT TIME ZONE 'America/Toronto') AT TIME ZONE 'UTC' WHERE "date" >= '2024-12-01'::timestamptz AND "date" < '2025-01-01'::timestamptz;
SELECT '2024 reverted' as status;
