import { NextRequest, NextResponse } from 'next/server'
import { executeSQL } from '../../../../lib/api/sql-executor'

export async function GET(request: NextRequest) {
  try {
    // SQL query to get top 5 selling items per location TODAY (by revenue)
    const sql = `WITH item_sales AS (
  SELECT
    l."squareLocationId",
    l."name" as location_name,
    li."name" as item_name,
    SUM(li."quantity") as total_quantity,
    SUM(li."totalPriceAmount") as total_revenue,
    ROW_NUMBER() OVER (PARTITION BY l."squareLocationId" ORDER BY SUM(li."totalPriceAmount") DESC) as rank
  FROM locations l
  INNER JOIN orders o ON l."squareLocationId" = o."locationId"
  INNER JOIN line_items li ON o."id" = li."orderId"
  WHERE o."state" = 'COMPLETED'
    AND DATE(o."date" AT TIME ZONE COALESCE(l."timezone", 'UTC')) = CURRENT_DATE
  GROUP BY l."squareLocationId", l."name", li."name"
)
SELECT
  "squareLocationId" as location_id,
  location_name,
  item_name,
  total_quantity,
  total_revenue,
  rank as rank_position
FROM item_sales
WHERE rank <= 5
ORDER BY "squareLocationId", rank`

    const data = await executeSQL(sql)
    return NextResponse.json({ data })
  } catch (err) {
    console.error('Error in top-items route:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
