import { logger } from '../utils/logger'
import { prismaSafeQueryBuilder } from '../prisma/safeQueryBuilder'
import { OpenAIClient } from './intentClassifier'
import { validateDataQueryResult } from '../validation/schemas'
import prisma from '../../../lib/prisma'
import {
  CONTEXT_PREVIEW_LENGTH,
  MESSAGE_SLICE_LENGTH,
  CONTENT_SLICE_LENGTH,
  OPENAI_DATA_QUERY_MAX_TOKENS,
  OPENAI_DATA_QUERY_TEMPERATURE,
  OPENAI_GENERAL_ADVICE_MAX_TOKENS,
  OPENAI_GENERAL_ADVICE_TEMPERATURE,
  RECORD_SLICE_LIMIT,
  SAMPLE_RECORDS_LIMIT,
  DECIMAL_PLACES,
  UNKNOWN_ERROR_MESSAGE
} from '../constants/ai'
import type {
  DataQueryRequest,
  DataQueryResult,
  ChatMessage
} from '../../types/chat'

// Interface for query analysis result
interface QueryAnalysisResult {
  success: boolean
  queryPlan?: string
  queryType?: string
  error?: string
}

// Interface for query execution result
interface QueryExecutionResult {
  success: boolean
  data?: unknown
  recordCount?: number
  error?: string
  metadata?: {
    queryPlan?: string
    filters?: Record<string, string | number | boolean | null>
    processingTime?: number
    recordCount?: number
  }
}

// Interface for Prisma aggregate results
interface PrismaAggregateResult {
  _count?: number | Record<string, number>
  _sum?: Record<string, number | null>
  _avg?: Record<string, number | null>
  _max?: Record<string, number | null>
  _min?: Record<string, number | null>
}

/**
 * Serialize complex filter objects for logging
 */
function serializeFiltersForLogging(filters?: Record<string, unknown> | undefined): Record<string, string | number | boolean | null> {
  if (!filters) return {}

  const serialized: Record<string, string | number | boolean | null> = {}

  for (const [key, value] of Object.entries(filters)) {
    if (value === null || value === undefined) {
      serialized[key] = null
    } else if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      serialized[key] = value
    } else if (value instanceof Date) {
      serialized[key] = value.toISOString()
    } else if (Array.isArray(value)) {
      serialized[key] = value.join(', ')
    } else if (typeof value === 'object') {
      serialized[key] = JSON.stringify(value)
    } else {
      serialized[key] = String(value)
    }
  }

  return serialized
}

/**
 * Data query handler that processes natural language data requests
 * and executes safe database queries with comprehensive logging
 */
class DataQueryHandler {
  private readonly openaiClient: OpenAIClient
  private readonly model = 'gpt-4o' // Keep gpt-4o for complex data queries (more capable than nano)

  constructor() {
    this.openaiClient = new OpenAIClient()
  }

  /**
   * Process a data query request with step-by-step logging
   */
  async processDataQuery(request: DataQueryRequest): Promise<DataQueryResult> {
    const timer = logger.startTimer('Data Query Processing')

    try {
      logger.data('Starting data query processing', request.userMessage.slice(0, CONTEXT_PREVIEW_LENGTH), {
        intent: request.intent,
        hasFilters: !!request.filters,
        historyLength: request.conversationHistory.length
      })

      // Step 1: Analyze the query and determine data requirements
      const queryAnalysis = await this.analyzeDataQuery(request)
      if (!queryAnalysis.success) {
        const duration = timer()
        return {
          success: false,
          summary: 'Failed to analyze query requirements',
          queryPlan: 'analysis_failed',
          queryType: 'unknown',
          error: queryAnalysis.error,
          metadata: {
            model: this.model,
            processingTime: duration,
            prismaQuery: '',
            filters: {}
          }
        }
      }

      // Step 2: Build and execute database query
      const queryResult = await this.executeDataQuery(queryAnalysis.queryPlan!, request.filters, request.userMessage)
      if (!queryResult.success) {
        const duration = timer()
        return {
          success: false,
          summary: 'Failed to execute database query',
          queryPlan: queryAnalysis.queryPlan!,
          queryType: queryAnalysis.queryType!,
          error: queryResult.error,
          metadata: {
            model: this.model,
            processingTime: duration,
            prismaQuery: queryResult.metadata?.queryPlan || '',
            filters: serializeFiltersForLogging(request.filters)
          }
        }
      }

      // Step 3: Generate natural language summary
      const summaryResult = await this.generateDataSummary(
        request.userMessage,
        queryResult.data,
        queryAnalysis.queryType!,
        request.conversationHistory
      )

      const duration = timer()

      const result: DataQueryResult = {
        success: true,
        data: queryResult.data as Record<string, string | number | boolean | null> | Array<Record<string, string | number | boolean | null>> | undefined,
        summary: summaryResult.summary,
        queryPlan: queryAnalysis.queryPlan!,
        queryType: queryAnalysis.queryType!,
        recordCount: queryResult.metadata?.recordCount,
        metadata: {
          model: this.model,
          processingTime: duration,
          prismaQuery: queryResult.metadata?.queryPlan || '',
          filters: serializeFiltersForLogging(request.filters)
        }
      }

      // Validate result structure
      const validation = validateDataQueryResult(result)
      if (!validation.success) {
        logger.error('Data query result validation failed', JSON.stringify(validation.error), {
          processingTime: duration
        })

        return {
          success: false,
          summary: 'Query completed but response validation failed',
          queryPlan: queryAnalysis.queryPlan!,
          queryType: queryAnalysis.queryType!,
          error: validation.error,
          metadata: {
            model: this.model,
            processingTime: duration,
            prismaQuery: queryResult.metadata?.queryPlan || '',
            filters: serializeFiltersForLogging(request.filters)
          }
        }
      }

      logger.success('Data query processing completed', undefined, {
        processingTime: duration,
        queryType: result.queryType,
        recordCount: result.recordCount,
        summaryLength: result.summary.length
      })

      return result
    } catch (err) {
      const duration = timer()
      const error = err instanceof Error ? err : new Error(UNKNOWN_ERROR_MESSAGE)

      logger.error('Data query processing failed', error, {
        processingTime: duration,
        userMessage: request.userMessage.slice(0, MESSAGE_SLICE_LENGTH)
      })

      return {
        success: false,
        summary: 'An unexpected error occurred while processing your data query',
        queryPlan: 'error',
        queryType: 'unknown',
        error: error.message,
        metadata: {
          model: this.model,
          processingTime: duration,
          prismaQuery: '',
          filters: serializeFiltersForLogging(request.filters)
        }
      }
    }
  }

  /**
   * Analyze the user query to determine what data is needed
   */
  private async analyzeDataQuery(request: DataQueryRequest): Promise<QueryAnalysisResult> {
    const timer = logger.startTimer('Query Analysis')

    try {
      logger.data('Analyzing query requirements', request.userMessage)

      const systemPrompt = this.buildQueryAnalysisPrompt()
      const userPrompt = this.buildQueryAnalysisUserPrompt(request)

      const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ]

      const response = await this.openaiClient.makeRequest(
        messages,
        this.model,
        OPENAI_DATA_QUERY_MAX_TOKENS,
        OPENAI_DATA_QUERY_TEMPERATURE
      )

      const duration = timer()

      if (!response.success) {
        logger.error('Query analysis AI call failed', response.error ? new Error(response.error) : undefined, {
          processingTime: duration
        })

        return { success: false, error: response.error }
      }

      const analysis = this.parseQueryAnalysis(response.content!)

      logger.data('Query analysis completed', undefined, {
        processingTime: duration,
        queryType: analysis.queryType,
        queryPlan: analysis.queryPlan.slice(0, MESSAGE_SLICE_LENGTH)
      })

      return {
        success: true,
        queryPlan: analysis.queryPlan,
        queryType: analysis.queryType
      }
    } catch (err) {
      const duration = timer()
      const error = err instanceof Error ? err : new Error(UNKNOWN_ERROR_MESSAGE)

      logger.error('Query analysis failed', error, {
        processingTime: duration
      })

      return { success: false, error: error.message }
    }
  }

  /**
   * Execute the database query based on analysis
   */
  private async executeDataQuery(queryPlan: string, filters?: Record<string, unknown>, userMessage?: string): Promise<QueryExecutionResult> {
    const timer = logger.startTimer('Database Query Execution')

    try {
      logger.data('Executing database query', queryPlan, {
        hasFilters: !!filters
      })

      // Extract item names from user message for filtering
      const extractedItemNames = userMessage ? this.extractItemNamesFromQuery(userMessage) : []

      // Extract location IDs from user message for filtering
      const extractedLocationIds = userMessage ? await this.extractLocationIdsFromQuery(userMessage) : []

      if (extractedItemNames.length > 0) {
        logger.data('Extracted item names from query', userMessage?.slice(0, MESSAGE_SLICE_LENGTH), {
          extractedItems: extractedItemNames.join(', ')
        })
      }

      if (extractedLocationIds.length > 0) {
        logger.data('Extracted location IDs from query', userMessage?.slice(0, MESSAGE_SLICE_LENGTH), {
          extractedLocations: extractedLocationIds.join(', ')
        })
      }

      // Merge existing filters with extracted item names and location IDs
      const enhancedFilters = {
        ...filters,
        ...(extractedItemNames.length > 0 && { itemNames: extractedItemNames }),
        ...(extractedLocationIds.length > 0 && { locationIds: extractedLocationIds })
      }

      // Determine query type and execute appropriate method
      const queryType = this.determineQueryType(queryPlan)

      let result

      switch (queryType) {
        case 'sales_data':
          result = await prismaSafeQueryBuilder.getSalesData(enhancedFilters)
          break

        case 'sales_summary':
          result = await prismaSafeQueryBuilder.getSalesSummary(enhancedFilters)
          break

        case 'top_items':
          result = await prismaSafeQueryBuilder.getTopItems(enhancedFilters)
          break

        case 'location_performance':
          result = await prismaSafeQueryBuilder.getLocationPerformance(enhancedFilters)
          break

        default:
          // Default to sales data query
          result = await prismaSafeQueryBuilder.getSalesData(enhancedFilters)
      }

      const duration = timer()

      if (!result.success) {
        logger.error('Database query execution failed', result.error ? new Error(result.error) : undefined, {
          processingTime: duration,
          queryType
        })

        return {
          success: false,
          error: result.error,
          metadata: {
            queryPlan,
            processingTime: duration
          }
        }
      }

      logger.queryExecution(
        queryType,
        queryPlan,
        undefined, // Don't log full data for performance
        {
          processingTime: duration,
          recordCount: result.metadata?.recordCount
        }
      )

      return {
        success: true,
        data: result.data,
        metadata: {
          queryPlan: result.metadata?.queryPlan || queryPlan,
          recordCount: result.metadata?.recordCount,
          processingTime: duration
        }
      }
    } catch (err) {
      const duration = timer()
      const error = err instanceof Error ? err : new Error(UNKNOWN_ERROR_MESSAGE)

      logger.error('Database query execution exception', error, {
        processingTime: duration,
        queryPlan
      })

      return {
        success: false,
        error: error.message,
        metadata: {
          queryPlan,
          processingTime: duration
        }
      }
    }
  }

  /**
   * Generate natural language summary of query results
   */
  private async generateDataSummary(
    userMessage: string,
    data: unknown,
    queryType: string,
    conversationHistory: ChatMessage[]
  ): Promise<{ summary: string }> {
    const timer = logger.startTimer('Data Summary Generation')

    try {
      logger.ai('Generating data summary', undefined, {
        queryType,
        dataType: typeof data,
        historyLength: conversationHistory.length
      })

      // Prepare data summary for AI
      const dataSummary = this.prepareDataForSummary(data, queryType)

      const systemPrompt = this.buildSummaryPrompt()
      const userPrompt = this.buildSummaryUserPrompt(userMessage, dataSummary, queryType)

      const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ]

      const response = await this.openaiClient.makeRequest(
        messages,
        this.model,
        OPENAI_GENERAL_ADVICE_MAX_TOKENS,
        OPENAI_GENERAL_ADVICE_TEMPERATURE
      )

      const duration = timer()

      if (!response.success) {
        logger.error('Summary generation failed, using fallback', response.error ? new Error(response.error) : undefined, {
          processingTime: duration
        })

        return { summary: this.generateFallbackSummary(data, queryType) }
      }

      logger.ai('Data summary generated', undefined, {
        processingTime: duration,
        summaryLength: response.content?.length || 0,
        model: this.model,
        tokens: response.metadata.tokens,
        cost: response.metadata.cost
      })

      return { summary: response.content || this.generateFallbackSummary(data, queryType) }
    } catch (err) {
      const duration = timer()
      const error = err instanceof Error ? err : new Error(UNKNOWN_ERROR_MESSAGE)

      logger.error('Summary generation failed', error, {
        processingTime: duration
      })

      return { summary: this.generateFallbackSummary(data, queryType) }
    }
  }

  /**
   * Build system prompt for query analysis
   */
  private buildQueryAnalysisPrompt(): string {
    return `You are a sales data analyst AI. Analyze user queries to determine what sales data they need.

Available data types:
- Sales data: Individual sales transactions with dates, amounts, locations, items
- Sales summaries: Aggregated totals, averages, counts
- Top items: Best-selling products by quantity or revenue
- Location performance: Sales data grouped by location

Respond with JSON in this format:
{
  "queryType": "sales_data" | "sales_summary" | "top_items" | "location_performance",
  "queryPlan": "Detailed description of what data to retrieve and how to filter it"
}

Focus on what specific data the user is asking for. Consider time periods, locations, products, and metrics they mention.`
  }

  /**
   * Build user prompt for query analysis
   */
  private buildQueryAnalysisUserPrompt(request: DataQueryRequest): string {
    let prompt = `Analyze this sales data request: "${request.userMessage}"`

    if (request.filters) {
      prompt += `\n\nExisting filters: ${JSON.stringify(request.filters)}`
    }

    if (request.conversationHistory.length > 0) {
      const context = request.conversationHistory
        .map(msg => `${msg.role}: ${msg.content.slice(0, CONTENT_SLICE_LENGTH)}`)
        .join('\n')
      prompt += `\n\nRecent conversation:\n${context}`
    }

    return prompt
  }

  /**
   * Extract item names from user query for filtering
   */
  private extractItemNamesFromQuery(userMessage: string): string[] {
    const message = userMessage.toLowerCase()
    const itemNames: string[] = []

    // Common item keywords and their variations
    const itemPatterns = [
      { keywords: ['brew coffee', 'brewed coffee', 'coffee brew'], name: 'Brew Coffee' },
      { keywords: ['latte', 'lattes'], name: 'Latte' },
      { keywords: ['matcha latte', 'latte matcha'], name: 'Latte - Matcha' },
      { keywords: ['chai latte', 'latte chai'], name: 'Latte - Chai' },
      { keywords: ['americano', "l'americano"], name: "L'Americano" },
      { keywords: ['dancing goats'], name: 'Dancing Goats' },
      { keywords: ['croissant', 'ham cheese croissant'], name: 'Croissant - Ham &  Cheese' },
      { keywords: ['spinach feta', 'feta danish'], name: 'Spinach Feta Danish' }
    ]

    for (const pattern of itemPatterns) {
      for (const keyword of pattern.keywords) {
        if (message.includes(keyword)) {
          itemNames.push(pattern.name)
          break // Only add each item once
        }
      }
    }

    return itemNames
  }

  /**
   * Extract location IDs from user query for filtering
   */
  private async extractLocationIdsFromQuery(userMessage: string): Promise<string[]> {
    const message = userMessage.toLowerCase()
    const locationIds: string[] = []

    try {
      // Get all locations from database
      const locations = await prisma.location.findMany()

      // Location name patterns and their variations
      const locationPatterns = [
        { keywords: ['hq', 'main', 'head office', 'headquarters'], squareLocationId: 'LZEVY2P88KZA8' },
        { keywords: ['yonge', 'yonge street'], squareLocationId: 'LAH170A0KK47P' },
        { keywords: ['bloor', 'bloor street'], squareLocationId: 'LPSSMJYZX8X7P' },
        { keywords: ['well', 'the well', 'spadina'], squareLocationId: 'LT8YK4FBNGH17' },
        { keywords: ['broadway'], squareLocationId: 'LDPNNFWBTFB26' },
        { keywords: ['kingston', 'brock street'], squareLocationId: 'LYJ3TVBQ23F5V' }
      ]

      // Check for direct matches in patterns
      for (const pattern of locationPatterns) {
        for (const keyword of pattern.keywords) {
          if (message.includes(keyword)) {
            locationIds.push(pattern.squareLocationId)
            break // Only add each location once
          }
        }
      }

      // Also check if user mentions full location names from database
      for (const location of locations) {
        if (location.name) {
          const locationNameLower = location.name.toLowerCase()
          // Check for partial matches of location name in user message
          if (message.includes(locationNameLower) ||
              locationNameLower.includes(message.trim()) ||
              this.checkLocationNameVariations(message, locationNameLower)) {
            if (!locationIds.includes(location.squareLocationId)) {
              locationIds.push(location.squareLocationId)
            }
          }
        }
      }

    } catch (err) {
      logger.error('Failed to extract location IDs from query', err instanceof Error ? err : new Error(String(err)))
    }

    return locationIds
  }

  /**
   * Check for location name variations and partial matches
   */
  private checkLocationNameVariations(userMessage: string, locationName: string): boolean {
    const message = userMessage.toLowerCase()
    const name = locationName.toLowerCase()

    // Check for key parts of the location name
    const nameParts = name.split(' ').filter(part => part.length > 2) // Ignore short words like "de", "&"

    return nameParts.some(part => message.includes(part))
  }

  /**
   * Build system prompt for data summary generation
   */
  private buildSummaryPrompt(): string {
    return `You are a sales analytics assistant. Generate clear, insightful summaries of sales data.

CRITICAL RULES:
- ONLY use the exact data provided in the "Data summary" section
- NEVER make up numbers, percentages, or trends that aren't in the actual data
- If no data is provided or data shows zero/null values, clearly state that
- Do NOT invent comparisons to "previous periods" unless that data is explicitly provided
- Do NOT create fictional growth percentages or trends

Guidelines:
- Be conversational and helpful
- Use ONLY the specific numbers from the provided data
- If suggesting insights, base them only on the actual data shown
- Keep responses concise but accurate
- Format the actual numbers clearly (e.g., $1,234.56)
- If the data shows small numbers or no sales, acknowledge that truthfully

Your goal is to help business owners understand their ACTUAL data accurately, not to create optimistic fictional scenarios.`
  }

  /**
   * Build user prompt for summary generation
   */
  private buildSummaryUserPrompt(userMessage: string, dataSummary: string, queryType: string): string {
    return `User asked: "${userMessage}"

Query type: ${queryType}

Data summary:
${dataSummary}

Generate a helpful response that answers their question using ONLY the data shown above. Do not add any information that is not present in the data summary. If the data is limited or shows low numbers, acknowledge that accurately.`
  }

  /**
   * Parse query analysis response
   */
  private parseQueryAnalysis(content: string): { queryType: string; queryPlan: string } {
    try {
      const cleanContent = content.replace(/```json\n?|\n?```/g, '').trim()
      const parsed = JSON.parse(cleanContent) as {
        queryType?: string
        queryPlan?: string
      }

      return {
        queryType: parsed.queryType || 'sales_data',
        queryPlan: parsed.queryPlan || 'Retrieve general sales data'
      }
    } catch {
      logger.warn('Failed to parse query analysis, using fallback')

      return {
        queryType: 'sales_data',
        queryPlan: 'Retrieve general sales data based on user request'
      }
    }
  }

  /**
   * Determine query type from plan text
   */
  private determineQueryType(queryPlan: string): string {
    const lowerPlan = queryPlan.toLowerCase()

    if (lowerPlan.includes('top') || lowerPlan.includes('best') || lowerPlan.includes('popular')) {
      return 'top_items'
    }

    if (lowerPlan.includes('summary') || lowerPlan.includes('total') || lowerPlan.includes('aggregate')) {
      return 'sales_summary'
    }

    if (lowerPlan.includes('location') || lowerPlan.includes('store') || lowerPlan.includes('branch')) {
      return 'location_performance'
    }

    return 'sales_data'
  }

  /**
   * Prepare data for AI summary (limit size and structure)
   */
  private prepareDataForSummary(data: unknown, queryType: string): string {
    try {
      if (!data) return 'No data found'

      if (Array.isArray(data)) {
        if (data.length === 0) return 'No records found'

        // Limit data size for AI processing
        const limitedData = data.slice(0, RECORD_SLICE_LIMIT)

        // Create summary based on query type
        if (queryType === 'sales_summary') {
          return this.summarizeAggregateData(data[0])
        }

        return `Found ${data.length} records. Sample: ${JSON.stringify(limitedData.slice(0, SAMPLE_RECORDS_LIMIT), null, DECIMAL_PLACES)}`
      }

      if (typeof data === 'object') {
        return JSON.stringify(data, null, DECIMAL_PLACES)
      }

      return String(data)
    } catch (err) {
      logger.error('Failed to prepare data for summary', err instanceof Error ? err : new Error(String(err)))
      return 'Data available but could not be formatted for summary'
    }
  }

  /**
   * Summarize aggregate data results
   */
  private summarizeAggregateData(aggregateResult: PrismaAggregateResult): string {
    if (!aggregateResult) return 'No aggregate data available'

    const parts: string[] = []

    if (aggregateResult._count) {
      const count = typeof aggregateResult._count === 'number'
        ? aggregateResult._count
        : Object.values(aggregateResult._count).reduce((acc, val) => acc + val, 0)
      parts.push(`Total records: ${count}`)
    }

    if (aggregateResult._sum) {
      const sum = aggregateResult._sum
      if (sum['totalSales'] && sum['totalSales'] !== null) {
        parts.push(`Total sales: $${sum['totalSales']}`)
      }
      if (sum['quantity'] && sum['quantity'] !== null) {
        parts.push(`Total quantity: ${sum['quantity']}`)
      }
    }

    if (aggregateResult._avg) {
      const avg = aggregateResult._avg
      if (avg['totalSales'] && avg['totalSales'] !== null) {
        parts.push(`Average sale: $${avg['totalSales'].toFixed(DECIMAL_PLACES)}`)
      }
    }

    if (aggregateResult._max) {
      const max = aggregateResult._max
      if (max['totalSales'] && max['totalSales'] !== null) {
        parts.push(`Highest sale: $${max['totalSales']}`)
      }
    }

    if (aggregateResult._min) {
      const min = aggregateResult._min
      if (min['totalSales'] && min['totalSales'] !== null) {
        parts.push(`Lowest sale: $${min['totalSales']}`)
      }
    }

    return parts.length > 0 ? parts.join(', ') : 'Aggregate data processed'
  }

  /**
   * Generate fallback summary when AI fails
   */
  private generateFallbackSummary(data: unknown, queryType: string): string {
    if (!data) return 'No data found for your query.'

    if (Array.isArray(data)) {
      const count = data.length
      if (count === 0) return 'No records found matching your criteria.'

      return `Found ${count} record${count === 1 ? '' : 's'} for ${queryType} query. The data includes sales information with details about transactions, amounts, and related information.`
    }

    if (typeof data === 'object') {
      return `Your ${queryType} query returned summary data with aggregated information about your sales performance.`
    }

    return 'Your data query was processed successfully.'
  }
}

// Export singleton instance
export const dataQueryHandler = new DataQueryHandler()

// Export class for testing
export { DataQueryHandler }