import { NextRequest, NextResponse } from 'next/server'
import { executeSQL } from '../../../../lib/api/sql-executor'

export async function GET(request: NextRequest) {
  try {
    // SQL query to get today's sales by location
    const sql = `SELECT
  l."squareLocationId" as location_id,
  l."name" as location_name,
  COALESCE(SUM(o."totalAmount"), 0) as total_sales,
  COUNT(o."id") as order_count
FROM locations l
LEFT JOIN orders o ON l."squareLocationId" = o."locationId"
  AND DATE(o."date" AT TIME ZONE COALESCE(l."timezone", 'UTC')) = CURRENT_DATE
  AND o."state" = 'COMPLETED'
GROUP BY l."squareLocationId", l."name"
ORDER BY total_sales DESC`

    const data = await executeSQL(sql)
    return NextResponse.json({ data })
  } catch (err) {
    console.error('Error in today-sales route:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
