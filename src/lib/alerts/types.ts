export interface DailySalesCondition {
  type: 'daily_sales_threshold'
  operator: '>=' | '>' | '<=' | '<' | '='
  value: number // in dollars
  timeframe: 'today' | 'yesterday'
  timezone?: string // "America/New_York"
}

export interface ItemSalesCondition {
  type: 'item_sales_threshold'
  itemName: string
  operator: '>=' | '>' | '<=' | '<' | '='
  value: number
  metric: 'quantity' | 'revenue'
  timeframe: 'today' | 'this_week'
  timezone?: string
}

export interface LocationSalesCondition {
  type: 'location_sales_threshold'
  locationName: string
  operator: '>=' | '>' | '<=' | '<' | '='
  value: number
  timeframe: 'today' | 'this_week'
  timezone?: string
}

export type AlertCondition =
  | DailySalesCondition
  | ItemSalesCondition
  | LocationSalesCondition
