-- 2023 only
UPDATE orders SET "date" = ("date" AT TIME ZONE 'America/Toronto') AT TIME ZONE 'UTC' WHERE "date" >= '2023-06-01'::timestamptz AND "date" < '2023-07-01'::timestamptz;
UPDATE orders SET "date" = ("date" AT TIME ZONE 'America/Toronto') AT TIME ZONE 'UTC' WHERE "date" >= '2023-07-01'::timestamptz AND "date" < '2023-08-01'::timestamptz;
UPDATE orders SET "date" = ("date" AT TIME ZONE 'America/Toronto') AT TIME ZONE 'UTC' WHERE "date" >= '2023-08-01'::timestamptz AND "date" < '2023-09-01'::timestamptz;
UPDATE orders SET "date" = ("date" AT TIME ZONE 'America/Toronto') AT TIME ZONE 'UTC' WHERE "date" >= '2023-09-01'::timestamptz AND "date" < '2023-10-01'::timestamptz;
UPDATE orders SET "date" = ("date" AT TIME ZONE 'America/Toronto') AT TIME ZONE 'UTC' WHERE "date" >= '2023-10-01'::timestamptz AND "date" < '2023-11-01'::timestamptz;
UPDATE orders SET "date" = ("date" AT TIME ZONE 'America/Toronto') AT TIME ZONE 'UTC' WHERE "date" >= '2023-11-01'::timestamptz AND "date" < '2023-12-01'::timestamptz;
UPDATE orders SET "date" = ("date" AT TIME ZONE 'America/Toronto') AT TIME ZONE 'UTC' WHERE "date" >= '2023-12-01'::timestamptz AND "date" < '2024-01-01'::timestamptz;
SELECT '2023 reverted' as status;
