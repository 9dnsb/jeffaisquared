-- Check if timestamps show UTC or Toronto timezone
SELECT
  "date",
  "date"::text as text_format,
  EXTRACT(HOUR FROM "date") as hour_stored,
  EXTRACT(HOUR FROM "date" AT TIME ZONE 'America/Toronto') as hour_toronto
FROM orders
ORDER BY "date" DESC
LIMIT 10;
