-- ============================================================================
-- Understand the Timezone Conversion
-- ============================================================================

-- Let's trace through what conversions do with a known timestamp
SELECT
  '2025-10-07 15:00:00+00'::timestamptz as original_utc_3pm,

  -- What our migration did
  (timezone('America/Toronto', timezone('UTC', '2025-10-07 15:00:00+00'::timestamptz))) as after_our_conversion,

  -- What we want (15:00 Toronto = 19:00 UTC in October)
  '2025-10-07 15:00:00-04'::timestamptz as what_we_want_3pm_toronto,

  -- Show them in text format
  ('2025-10-07 15:00:00+00'::timestamptz)::text as original_text,
  (timezone('America/Toronto', timezone('UTC', '2025-10-07 15:00:00+00'::timestamptz)))::text as converted_text;
