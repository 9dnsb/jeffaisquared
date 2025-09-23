/**
 * AI v3 Type Definitions - Complete rewrite optimized for performance
 * Designed to pass all 100 comprehensive tests with <10 second response times
 */

// ===== CORE QUERY TYPES =====

export interface QueryRequest {
  userMessage: string
  conversationHistory: ChatMessage[]
  intent: 'data_query' | 'general_chat'
  userId?: string
}

export interface QueryResponse {
  success: boolean
  data: QueryResultRow[]
  summary: string
  metadata: QueryMetadata
  error?: string
}

export interface QueryMetadata {
  processingTime: number
  queryComplexity: 'simple' | 'moderate' | 'complex'
  cacheHit: boolean
  queryPlan: string
  recordCount: number
  optimizationStrategy: string
  extractedParameters: QueryParameters
}

// ===== PARAMETER EXTRACTION =====

export interface QueryParameters {
  // Time filters
  timeframe: TimeFrame
  startDate?: Date
  endDate?: Date

  // Entity filters
  locations: LocationFilter[]
  items: ItemFilter[]
  categories: string[]

  // Metrics to calculate
  metrics: MetricType[]

  // Grouping and aggregation
  groupBy: GroupByDimension[]
  orderBy: OrderByClause[]
  limit?: number

  // Analysis type
  analysisType: AnalysisType

  // Performance hints
  requiresRawSQL: boolean
  expectedRecordCount: number
}

export type TimeFrame =
  | 'today'
  | 'yesterday'
  | 'last_week'
  | 'last_month'
  | 'last_30_days'
  | 'last_90_days'
  | 'last_year'
  | 'all_time'
  | 'custom'

export interface LocationFilter {
  id?: string
  name: string
  keywords: string[]
  exactMatch: boolean
}

export interface ItemFilter {
  id?: string
  name: string
  category?: string
  exactMatch: boolean
}

export type MetricType =
  | 'revenue'          // Total sales amount
  | 'count'           // Number of transactions
  | 'quantity'        // Total items sold
  | 'avg_transaction' // Average transaction value
  | 'avg_item_price'  // Average price per item
  | 'unique_items'    // Count of unique items
  | 'market_share'    // Percentage of total
  | 'growth_rate'     // Period-over-period growth
  | 'efficiency'      // Revenue per transaction ratio

export type GroupByDimension =
  | 'location'
  | 'item'
  | 'category'
  | 'date'
  | 'month'
  | 'week'
  | 'hour'
  | 'day_of_week'

export interface OrderByClause {
  field: string
  direction: 'asc' | 'desc'
}

export type AnalysisType =
  | 'simple_aggregate'    // Single value calculation
  | 'grouped_analysis'    // Group by single dimension
  | 'comparative'         // Compare entities
  | 'trend_analysis'      // Time-based patterns
  | 'ranking'            // Top/bottom performers
  | 'market_share'       // Percentage calculations
  | 'cross_dimensional'  // Multiple groupings
  | 'correlation'        // Relationship analysis

// ===== QUERY RESULT STRUCTURE =====

export interface QueryResultRow {
  // Dimension values (grouping keys)
  location?: string
  locationId?: string
  item?: string
  itemId?: string
  category?: string
  date?: string
  month?: string
  week?: string
  hour?: string
  dayOfWeek?: string

  // Metric values
  revenue?: number
  count?: number
  quantity?: number
  avg_transaction?: number
  avg_item_price?: number
  unique_items?: number
  market_share?: number
  growth_rate?: number
  efficiency?: number

  // Business overview metrics
  total_revenue?: number
  total_transactions?: number
  avg_daily_revenue?: number
  avg_weekly_revenue?: number
  avg_monthly_revenue?: number

  // Calculated fields
  percentage?: number
  rank?: number
  trend?: 'up' | 'down' | 'stable'
  metric?: string
}

// ===== CHAT INTEGRATION =====

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp?: Date // Make optional for backwards compatibility
  metadata?: {
    queryType?: string
    processingTime?: number
  }
}

// ===== OPTIMIZATION STRATEGIES =====

export interface OptimizationStrategy {
  useRawSQL: boolean
  useBulkOperations: boolean
  enableCaching: boolean
  useIndexHints: boolean
  batchQueries: boolean
  limitResultSet: boolean
  precomputeAggregates: boolean
}

export interface CacheEntry {
  key: string
  data: QueryResultRow[]
  metadata: QueryMetadata
  timestamp: Date
  expiresAt: Date
  parameters: QueryParameters
}

// ===== PERFORMANCE MONITORING =====

export interface PerformanceMetrics {
  queryStartTime: number
  parameterExtractionTime: number
  databaseQueryTime: number
  resultProcessingTime: number
  responseFormattingTime: number
  totalTime: number
  recordsProcessed: number
  cacheHitRate: number
  optimizationUsed: string[]
}

// ===== ERROR HANDLING =====

export interface AIError {
  type: 'parameter_extraction' | 'database_query' | 'processing' | 'timeout' | 'validation'
  message: string
  details?: Record<string, unknown>
  recoverable: boolean
  suggestedRetry?: boolean
}

// ===== VALIDATION SCHEMAS =====

export interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  normalizedParameters?: QueryParameters
}

// ===== OPENAI INTEGRATION =====

export interface OpenAIRequest {
  messages: Array<{
    role: 'system' | 'user' | 'assistant'
    content: string
  }>
  model: string
  temperature: number
  maxTokens: number
  timeout?: number
}

export interface OpenAIResponse {
  success: boolean
  content: string
  model: string
  tokens: number
  cost: number
  processingTime: number
  error?: string
}

// ===== CONFIGURATION =====

export interface AIv3Config {
  openai: {
    apiKey: string
    model: string
    maxTokens: number
    temperature: number
    timeout: number
  }
  performance: {
    queryTimeout: number
    maxRecords: number
    cacheEnabled: boolean
    cacheTTL: number
    rawSQLThreshold: number
  }
  optimization: {
    enableBulkQueries: boolean
    enableIndexHints: boolean
    enablePrecomputation: boolean
    parallelQueryLimit: number
  }
}

// ===== TYPE GUARDS =====

export function isQueryRequest(obj: unknown): obj is QueryRequest {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'userMessage' in obj &&
    typeof (obj as QueryRequest).userMessage === 'string'
  )
}

export function isValidMetricType(metric: string): metric is MetricType {
  const validMetrics: MetricType[] = [
    'revenue', 'count', 'quantity', 'avg_transaction',
    'avg_item_price', 'unique_items', 'market_share',
    'growth_rate', 'efficiency'
  ]
  return validMetrics.includes(metric as MetricType)
}

export function isValidGroupBy(dimension: string): dimension is GroupByDimension {
  const validDimensions: GroupByDimension[] = [
    'location', 'item', 'category', 'date', 'month',
    'week', 'hour', 'day_of_week'
  ]
  return validDimensions.includes(dimension as GroupByDimension)
}

// ===== UTILITY TYPES =====

export type RequiredKeys<T, K extends keyof T> = T & Required<Pick<T, K>>

export type PartialExcept<T, K extends keyof T> = Partial<T> & Pick<T, K>

export type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P]
}