import { z } from 'zod'

// Location IDs - hard-coded as specified by user
export const LOCATION_IDS = [
  'LZEVY2P88KZA8', // HQ/Main
  'LAH170A0KK47P', // Yonge Street
  'LPSSMJYZX8X7P', // Bloor Street
  'LT8YK4FBNGH17', // The Well/Spadina
  'LDPNNFWBTFB26', // Broadway
  'LYJ3TVBQ23F5V'  // Kingston/Brock Street
] as const

export const LOCATION_KEYWORDS = {
  'LZEVY2P88KZA8': ['hq', 'main', 'head office', 'headquarters'],
  'LAH170A0KK47P': ['yonge', 'yonge street'],
  'LPSSMJYZX8X7P': ['bloor', 'bloor street'],
  'LT8YK4FBNGH17': ['well', 'the well', 'spadina'],
  'LDPNNFWBTFB26': ['broadway'],
  'LYJ3TVBQ23F5V': ['kingston', 'brock street']
} as const

// Zod schemas for parameter validation
export const DateRangeSchema = z.object({
  period: z.string(),
  start: z.date(),
  end: z.date()
})

export const QueryParametersSchema = z.object({
  // Date filtering
  dateRanges: z.array(DateRangeSchema).min(1),

  // Location filtering
  locationIds: z.array(z.enum(LOCATION_IDS)).default([]),

  // Item filtering
  items: z.array(z.string()).default([]),

  // Metrics to calculate
  metrics: z.array(z.enum([
    'revenue',           // Sum of totalSales or price*quantity
    'quantity',          // Sum of item quantities sold
    'count',            // Number of transactions
    'avg_transaction',   // Average sale amount
    'items_per_sale',   // Average items per transaction
    'avg_item_price',   // Average price per item
    'unique_items'      // Count of distinct items sold
  ])).min(1),

  // Grouping dimensions
  groupBy: z.array(z.enum([
    'location',         // Group by store location
    'item',            // Group by product
    'day',             // Group by day
    'week',            // Group by week
    'month',           // Group by month
    'quarter',         // Group by quarter
    'year',            // Group by year
    'day_of_week',     // Group by day of week (Mon, Tue, etc.)
    'hour'             // Group by hour of day
  ])).default([]),

  // Aggregation method
  aggregation: z.enum(['sum', 'avg', 'count', 'max', 'min']).default('sum'),

  // Sorting and limiting
  orderBy: z.object({
    field: z.string(),
    direction: z.enum(['asc', 'desc'])
  }).optional(),

  limit: z.number().int().min(1).max(1000).optional(),

  // Comparison settings
  comparison: z.object({
    type: z.enum(['period', 'location', 'item']),
    baseline: z.string()
  }).optional()
})

export type QueryParameters = z.infer<typeof QueryParametersSchema>

// Standardized query result structure
export const QueryResultRowSchema = z.object({
  dimensions: z.record(z.string(), z.union([z.string(), z.number(), z.date()])),
  metrics: z.record(z.string(), z.number()),
  rawData: z.record(z.string(), z.unknown()).optional()
})

export const StandardizedQueryResultSchema = z.object({
  data: z.array(QueryResultRowSchema),
  metadata: z.object({
    groupBy: z.array(z.string()),
    metrics: z.array(z.string()),
    totalRecords: z.number(),
    processingTime: z.number(),
    queryPlan: z.string(),
    parameters: QueryParametersSchema
  })
})

export type QueryResultRow = z.infer<typeof QueryResultRowSchema>
export type StandardizedQueryResult = z.infer<typeof StandardizedQueryResultSchema>

// Validation result with repair capabilities
export interface ValidationResult<T> {
  success: boolean
  data?: T
  error?: string
  fallback?: T
  repairAttempted?: boolean
}

// AI extraction result structure
export const AIExtractionResultSchema = z.object({
  parameters: QueryParametersSchema.partial(), // Allow partial parameters from AI
  confidence: z.number().min(0).max(1),
  reasoning: z.string().optional(),
  extractedDates: z.array(z.string()).optional(), // Raw date strings from user
  extractedLocations: z.array(z.string()).optional(), // Raw location strings from user
  extractedItems: z.array(z.string()).optional() // Raw item strings from user
})

export type AIExtractionResult = z.infer<typeof AIExtractionResultSchema>

// Query execution strategies
export type QueryStrategy = 'simple' | 'grouped' | 'comparison' | 'complex'

export interface QueryExecutionPlan {
  strategy: QueryStrategy
  requiresMultipleQueries: boolean
  estimatedComplexity: 'low' | 'medium' | 'high'
  fallbackAvailable: boolean
}

// Error types for better error handling
export class QueryValidationError extends Error {
  constructor(
    message: string,
    public validationErrors: z.ZodError,
    public originalInput: unknown
  ) {
    super(message)
    this.name = 'QueryValidationError'
  }
}

export class QueryExecutionError extends Error {
  constructor(
    message: string,
    public queryPlan: string,
    public parameters: QueryParameters
  ) {
    super(message)
    this.name = 'QueryExecutionError'
  }
}

// Helper function to create safe fallback parameters
export function createFallbackParameters(_originalInput?: unknown): QueryParameters {
  const today = new Date()

  return {
    dateRanges: [{
      period: 'all_time',
      start: new Date('2024-01-01'), // Start of our data
      end: today
    }],
    locationIds: [], // All locations
    items: [], // All items
    metrics: ['revenue', 'count'],
    groupBy: [],
    aggregation: 'sum'
  }
}

// Type guards for runtime type checking
export function isValidQueryParameters(obj: unknown): obj is QueryParameters {
  return QueryParametersSchema.safeParse(obj).success
}

export function isValidAIExtractionResult(obj: unknown): obj is AIExtractionResult {
  return AIExtractionResultSchema.safeParse(obj).success
}