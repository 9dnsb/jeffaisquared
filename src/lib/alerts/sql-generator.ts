import type { AlertCondition } from './types'

export function generateAlertSQL(condition: AlertCondition): string {
  if (condition.type === 'daily_sales_threshold') {
    return `SELECT COALESCE(SUM("totalAmount") / 100.0, 0) as total_sales, COUNT(*) as order_count FROM orders WHERE date >= CURRENT_DATE AND date < CURRENT_DATE + INTERVAL '1 day' AND state = 'COMPLETED' AND "totalAmount" > 0`
  }

  if (condition.type === 'item_sales_threshold' && condition.itemName) {
    const metricColumn =
      condition.metric === 'quantity'
        ? 'SUM(li."quantity")'
        : 'SUM(li."totalPriceAmount") / 100.0'

    return `SELECT i.name, ${metricColumn} as metric_value FROM line_items li JOIN items i ON li."itemId" = i.id JOIN orders o ON li."orderId" = o.id WHERE o.date >= CURRENT_DATE AND o.date < CURRENT_DATE + INTERVAL '1 day' AND o.state = 'COMPLETED' AND i.name = '${condition.itemName.replace(/'/g, "''")}' GROUP BY i.id, i.name`
  }

  if (
    condition.type === 'location_sales_threshold' &&
    condition.locationName
  ) {
    return `SELECT l.name, COALESCE(SUM(o."totalAmount") / 100.0, 0) as location_sales FROM orders o JOIN locations l ON o."locationId" = l."squareLocationId" WHERE o.date >= CURRENT_DATE AND o.date < CURRENT_DATE + INTERVAL '1 day' AND o.state = 'COMPLETED' AND l.name = '${condition.locationName.replace(/'/g, "''")}' GROUP BY l.id, l.name`
  }

  throw new Error(`Unsupported condition type: ${condition.type}`)
}

export function extractMetricValue(
  result: Record<string, unknown>,
  condition: AlertCondition
): number {
  switch (condition.type) {
    case 'daily_sales_threshold':
      return (result['total_sales'] as number) || 0
    case 'item_sales_threshold':
      return (result['metric_value'] as number) || 0
    case 'location_sales_threshold':
      return (result['location_sales'] as number) || 0
    default:
      return 0
  }
}

export function meetsCondition(
  value: number,
  condition: AlertCondition
): boolean {
  const threshold = condition.value

  switch (condition.operator) {
    case '>=':
      return value >= threshold
    case '>':
      return value > threshold
    case '<=':
      return value <= threshold
    case '<':
      return value < threshold
    case '=':
      return Math.abs(value - threshold) < 0.01
    default:
      return false
  }
}

export function formatAlertMessage(
  alert: { description?: string; conditionData: AlertCondition },
  currentValue: number
): string {
  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(currentValue)

  return `${alert.description} Current value: ${formatted}`
}
