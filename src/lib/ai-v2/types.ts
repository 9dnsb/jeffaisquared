/**
 * Core types for the rebuilt AI querying system
 * Designed to pass all test cases with proper typing
 */

export interface QueryParameters {
  // Date filtering
  startDate?: Date
  endDate?: Date

  // Location filtering
  locationIds: string[]

  // Item filtering
  itemNames: string[]

  // Metrics to calculate
  metrics: Metric[]

  // Group by dimensions
  groupBy: GroupBy[]

  // Special calculation types for complex queries
  calculationType?: CalculationType

  // Sorting
  sortBy?: string
  sortDirection?: 'asc' | 'desc'
  limit?: number
}

export type Metric =
  | 'revenue'              // Sum of sales/prices
  | 'count'               // Number of transactions/items
  | 'quantity'            // Sum of quantities
  | 'transaction_count'   // Number of transactions/orders
  | 'average_order_value' // Average order value
  | 'avg_transaction'     // Average transaction value (legacy)
  | 'avg_item_price'      // Average item price

export type GroupBy =
  | 'location'         // Group by location
  | 'item'            // Group by item
  | 'month'           // Group by month
  | 'date'            // Group by date

export type CalculationType =
  | 'daily_average'    // Calculate daily average (total / days)
  | 'monthly_average'  // Calculate monthly average (total / months)
  | 'percentage'       // Calculate percentage of total
  | 'location_sum'     // Sum multiple specific locations
  | 'location_compare' // Compare specific locations side by side

export interface QueryResult {
  success: boolean
  data: QueryResultRow[]
  summary: string
  metadata: {
    recordCount: number
    processingTime: number
    queryPlan: string
    extractedParams: QueryParameters
  }
  error?: string
}

export interface QueryResultRow {
  // Dimensions (grouping keys)
  location?: string
  locationId?: string
  item?: string
  itemId?: string
  month?: string
  date?: string

  // Metrics (calculated values)
  revenue?: number
  count?: number
  quantity?: number
  transaction_count?: number
  average_order_value?: number
  avg_transaction?: number
  avg_item_price?: number
  percentage?: number
}

export interface LocationMapping {
  id: string
  name: string
  keywords: string[]
}

export interface ParameterExtractionResult {
  success: boolean
  parameters: QueryParameters
  confidence: number
  reasoning: string
  error?: string
}

export interface OpenAIResponse {
  success: boolean
  content: string
  model: string
  tokens: number
  cost: number
  error?: string
}