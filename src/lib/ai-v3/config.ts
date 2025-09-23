/**
 * AI v3 Configuration - Optimized for performance with 1M+ records
 */

import type { AIv3Config } from './types'

export const AI_V3_CONFIG: AIv3Config = {
  openai: {
    apiKey: process.env['OPENAI_API_KEY'] || '',
    model: 'gpt-4o', // Latest model for best parameter extraction
    maxTokens: 800,   // Sufficient for complex parameter extraction
    temperature: 0.1, // Low temperature for consistent parameter extraction
    timeout: 15000,   // 15 second timeout for OpenAI requests
  },

  performance: {
    queryTimeout: 10000,      // 10 second max query time (user requirement)
    maxRecords: 100000,       // Max records to process in memory
    cacheEnabled: true,       // Enable query result caching
    cacheTTL: 300000,        // 5 minute cache TTL for dynamic data
    rawSQLThreshold: 50000,   // Use raw SQL for queries expecting >50k records
  },

  optimization: {
    enableBulkQueries: true,        // Use bulk operations where possible
    enableIndexHints: true,         // Add database index hints
    enablePrecomputation: true,     // Use precomputed aggregates
    parallelQueryLimit: 5,          // Max parallel database queries
  },
}

// Performance thresholds for query optimization decisions
export const PERFORMANCE_THRESHOLDS = {
  // Query complexity classification
  SIMPLE_QUERY_THRESHOLD: 1000,     // Records
  MODERATE_QUERY_THRESHOLD: 10000,  // Records
  COMPLEX_QUERY_THRESHOLD: 100000,  // Records

  // Optimization trigger points
  RAW_SQL_THRESHOLD: 50000,         // Switch to raw SQL
  INDEX_HINT_THRESHOLD: 10000,      // Add index hints
  BATCH_QUERY_THRESHOLD: 5000,      // Use batch operations
  CACHE_THRESHOLD: 1000,            // Cache results

  // Time-based limits
  PARAMETER_EXTRACTION_TIMEOUT: 5000,  // 5 seconds for OpenAI
  DATABASE_QUERY_TIMEOUT: 8000,       // 8 seconds for database
  TOTAL_PROCESSING_TIMEOUT: 10000,    // 10 seconds total (user requirement)

  // Result limits
  MAX_GROUPED_RESULTS: 1000,        // Max grouped result rows
  MAX_RAW_RESULTS: 10000,           // Max raw result rows
  DEFAULT_LIMIT: 100,               // Default result limit
} as const

// Query optimization strategies based on expected complexity
export const OPTIMIZATION_STRATEGIES = {
  simple: {
    useRawSQL: false,
    useBulkOperations: false,
    enableCaching: true,
    useIndexHints: false,
    batchQueries: false,
    limitResultSet: true,
    precomputeAggregates: false,
  },
  moderate: {
    useRawSQL: false,
    useBulkOperations: true,
    enableCaching: true,
    useIndexHints: true,
    batchQueries: true,
    limitResultSet: true,
    precomputeAggregates: true,
  },
  complex: {
    useRawSQL: true,
    useBulkOperations: true,
    enableCaching: true,
    useIndexHints: true,
    batchQueries: true,
    limitResultSet: true,
    precomputeAggregates: true,
  },
} as const

// Cache configuration
export const CACHE_CONFIG = {
  // Cache keys for different query types
  SIMPLE_AGGREGATE: 'agg',
  LOCATION_GROUP: 'loc',
  ITEM_GROUP: 'item',
  TIME_GROUP: 'time',
  COMPLEX_QUERY: 'complex',

  // TTL by query type (in milliseconds)
  TTL_STATIC: 3600000,      // 1 hour for historical data
  TTL_DAILY: 300000,        // 5 minutes for daily data
  TTL_HOURLY: 60000,        // 1 minute for hourly data
  TTL_REALTIME: 10000,      // 10 seconds for real-time data

  // Cache size limits
  MAX_ENTRIES: 1000,        // Max cached queries
  MAX_ENTRY_SIZE: 10000,    // Max records per cache entry
} as const

// Database optimization hints
export const DATABASE_HINTS = {
  // Index hints for common query patterns
  LOCATION_REVENUE: '/*+ INDEX(orders idx_orders_location_date) */',
  TIME_SERIES: '/*+ INDEX(orders idx_orders_date) */',
  ITEM_ANALYSIS: '/*+ INDEX(line_items idx_line_items_item_total) */',
  CROSS_TABLE: '/*+ USE_MERGE(orders line_items) */',

  // Query patterns that should use specific indexes
  INDEX_PATTERNS: {
    'location + date': 'idx_orders_location_date',
    'date only': 'idx_orders_date',
    'location + total': 'idx_orders_location_total',
    'item + total': 'idx_line_items_item_total',
    'order + item': 'idx_line_items_order_item',
  },
} as const

// OpenAI prompt templates for consistent parameter extraction
export const PROMPT_TEMPLATES = {
  SYSTEM_PROMPT: `You are a business analytics assistant that extracts structured parameters from natural language queries about sales data.

Your task is to analyze user queries and extract:
1. Time filters (today, yesterday, last week, last month, date ranges)
2. Location filters (specific stores, location comparisons)
3. Item/product filters (specific items, categories)
4. Metrics needed (revenue, transaction count, quantities, averages)
5. Grouping requirements (by location, item, time period)
6. Analysis type (simple aggregate, comparison, ranking, trends)

Always respond with a JSON object containing these extracted parameters.
Be precise with date interpretations and entity matching.
Consider performance implications - complex queries may need optimization.`,

  PARAMETER_EXTRACTION: `Extract parameters from this sales query: "{query}"

Respond with JSON in this exact format:
{
  "timeframe": "today|yesterday|last_week|last_month|custom",
  "startDate": "YYYY-MM-DD or null",
  "endDate": "YYYY-MM-DD or null",
  "locations": [{"name": "location_name", "exactMatch": true/false}],
  "items": [{"name": "item_name", "exactMatch": true/false}],
  "metrics": ["revenue", "count", "quantity", "avg_transaction"],
  "groupBy": ["location", "item", "date", "month"],
  "analysisType": "simple_aggregate|grouped_analysis|comparative|ranking",
  "requiresRawSQL": true/false,
  "expectedRecordCount": estimated_number
}`,

  RESPONSE_FORMATTING: `Format this data analysis response for a business user:

Query: "{query}"
Data: {data}
Metrics: {metrics}

Provide a clear, concise business summary focusing on insights and actionable information.
Include specific numbers and percentages where relevant.
Highlight key findings and trends.`,
} as const

// Error messages and recovery strategies
export const ERROR_MESSAGES = {
  TIMEOUT: 'Query took too long to process. Try narrowing your request or specifying a smaller date range.',
  NO_DATA: 'No data found matching your criteria. Please check your filters and try again.',
  PARAMETER_EXTRACTION_FAILED: 'I had trouble understanding your request. Could you please rephrase or be more specific?',
  DATABASE_ERROR: 'There was an error accessing the data. Please try again in a moment.',
  INVALID_DATE_RANGE: 'The date range you specified is invalid. Please check the dates and try again.',
  LOCATION_NOT_FOUND: 'The location you mentioned was not found. Available locations include: {locations}',
  ITEM_NOT_FOUND: 'The item you mentioned was not found. Please check the spelling or try a broader search.',
  RATE_LIMIT: 'Too many requests. Please wait a moment and try again.',
} as const

// Validation rules
export const VALIDATION_RULES = {
  MAX_DATE_RANGE_DAYS: 365,        // Max 1 year date range
  MIN_DATE_RANGE_DAYS: 0,          // Allow single day
  MAX_LOCATIONS: 10,               // Max locations per query
  MAX_ITEMS: 20,                   // Max items per query
  MAX_METRICS: 5,                  // Max metrics per query
  MAX_GROUP_DIMENSIONS: 3,         // Max grouping dimensions
  MIN_QUERY_LENGTH: 3,             // Min query length
  MAX_QUERY_LENGTH: 500,           // Max query length
} as const

export default AI_V3_CONFIG