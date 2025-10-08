-- ============================================================================
-- STEP 2: Convert Orders Table (LARGEST TABLE - Will take 2-3 minutes)
-- ============================================================================
-- This is the slowest part due to 361k rows
-- ============================================================================

SET TIME ZONE 'America/Toronto';

-- Table: orders (361k rows - this will take time)
ALTER TABLE orders
  ALTER COLUMN "date" TYPE timestamptz USING "date" AT TIME ZONE 'America/Toronto';
ALTER TABLE orders
  ALTER COLUMN "createdAt" TYPE timestamptz USING "createdAt" AT TIME ZONE 'America/Toronto';
ALTER TABLE orders
  ALTER COLUMN "updatedAt" TYPE timestamptz USING "updatedAt" AT TIME ZONE 'America/Toronto';

RESET TIME ZONE;

SELECT 'Orders table converted successfully!' as status;
