import { logger } from '../utils/logger'
import { enhancedParameterExtractor } from './enhancedParameterExtractor'
import { DynamicQueryBuilder } from '../prisma/dynamicQueryBuilder'
import { OpenAIClient } from './intentClassifier'
import {
  OPENAI_GENERAL_ADVICE_MAX_TOKENS,
  OPENAI_GENERAL_ADVICE_TEMPERATURE,
  UNKNOWN_ERROR_MESSAGE
} from '../constants/ai'
import type {
  DataQueryRequest,
  DataQueryResult,
  ChatMessage
} from '../../types/chat'
import type {
  QueryParameters,
  StandardizedQueryResult,
  QueryResultRow
} from '../types/dynamicQuery'

/**
 * Next-generation data query handler using dynamic AI-driven parameter extraction
 * and flexible query building to handle unlimited query variations
 */
class DynamicDataQueryHandler {
  private readonly openaiClient: OpenAIClient
  private readonly queryBuilder: DynamicQueryBuilder
  private readonly model = 'gpt-4o' // Use capable model for query processing

  constructor() {
    this.openaiClient = new OpenAIClient()
    this.queryBuilder = new DynamicQueryBuilder()
  }

  /**
   * Process a data query request using the new dynamic architecture
   */
  async processDataQuery(request: DataQueryRequest): Promise<DataQueryResult> {
    const timer = logger.startTimer('Dynamic Data Query Processing')

    try {
      logger.data('Starting dynamic data query processing', request.userMessage.slice(0, 100), {
        intent: request.intent,
        historyLength: request.conversationHistory.length
      })

      // Step 1: Extract structured parameters using AI
      const parameterResult = await enhancedParameterExtractor.extractParameters(
        request.userMessage,
        request.conversationHistory
      )

      if (!parameterResult.success) {
        const duration = timer()
        logger.warn('Parameter extraction failed, using fallback', undefined, {
          processingTime: duration,
          error: parameterResult.error ? new Error(parameterResult.error) : undefined
        })

        // Use fallback parameters if extraction failed
        const fallbackParams = parameterResult.fallback!
        return await this.executeQueryWithFallback(request, fallbackParams, duration)
      }

      const queryParams = parameterResult.data!

      logger.data('Parameters extracted successfully', undefined, {
        dateRanges: queryParams.dateRanges.length,
        locations: queryParams.locationIds.length,
        items: queryParams.items.length,
        metrics: queryParams.metrics.join(', '),
        groupBy: queryParams.groupBy.join(', '),
        repairAttempted: parameterResult.repairAttempted
      })

      // Step 2: Execute dynamic query
      const queryResult = await this.queryBuilder.buildAndExecuteQuery(queryParams)

      // Step 3: Generate natural language summary
      const summaryResult = await this.generateDataSummary(
        request.userMessage,
        queryResult,
        request.conversationHistory
      )

      const duration = timer()

      const result: DataQueryResult = {
        success: true,
        data: this.convertToLegacyFormat(queryResult.data),
        summary: summaryResult.summary,
        queryPlan: `dynamic_${queryResult.metadata.queryPlan}`,
        queryType: this.determineQueryType(queryParams),
        recordCount: queryResult.metadata.totalRecords,
        metadata: {
          model: this.model,
          processingTime: duration,
          prismaQuery: `Dynamic query: ${queryParams.groupBy.join(', ')} grouping`,
          filters: this.serializeFiltersForLogging(queryParams)
        }
      }

      logger.success('Dynamic data query processing completed', undefined, {
        processingTime: duration,
        queryType: result.queryType,
        recordCount: result.recordCount,
        summaryLength: result.summary.length,
        groupBy: queryParams.groupBy.join(', '),
        metrics: queryParams.metrics.join(', ')
      })

      return result

    } catch (err) {
      const duration = timer()
      const error = err instanceof Error ? err : new Error(UNKNOWN_ERROR_MESSAGE)

      logger.error('Dynamic data query processing failed', error, {
        processingTime: duration,
        userMessage: request.userMessage.slice(0, 100)
      })

      return {
        success: false,
        summary: 'I encountered an error while processing your data query. Please try rephrasing your request.',
        queryPlan: 'error',
        queryType: 'unknown',
        error: error.message,
        metadata: {
          model: this.model,
          processingTime: duration,
          prismaQuery: '',
          filters: {}
        }
      }
    }
  }

  /**
   * Execute query with fallback parameters when extraction fails
   */
  private async executeQueryWithFallback(
    request: DataQueryRequest,
    fallbackParams: QueryParameters,
    processingTime: number
  ): Promise<DataQueryResult> {
    try {
      logger.data('Executing query with fallback parameters')

      const queryResult = await this.queryBuilder.buildAndExecuteQuery(fallbackParams)

      const summaryResult = await this.generateDataSummary(
        request.userMessage,
        queryResult,
        request.conversationHistory,
        true // indicate this is a fallback
      )

      return {
        success: true,
        data: this.convertToLegacyFormat(queryResult.data),
        summary: summaryResult.summary,
        queryPlan: `fallback_${queryResult.metadata.queryPlan}`,
        queryType: this.determineQueryType(fallbackParams),
        recordCount: queryResult.metadata.totalRecords,
        metadata: {
          model: this.model,
          processingTime: processingTime + queryResult.metadata.processingTime,
          prismaQuery: 'Fallback dynamic query',
          filters: this.serializeFiltersForLogging(fallbackParams)
        }
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Fallback query execution failed')
      logger.error('Fallback query execution failed', error)

      return {
        success: false,
        summary: 'I had trouble understanding your request. Could you please be more specific about what sales data you would like to see?',
        queryPlan: 'fallback_failed',
        queryType: 'unknown',
        error: error.message,
        metadata: {
          model: this.model,
          processingTime,
          prismaQuery: '',
          filters: {}
        }
      }
    }
  }

  /**
   * Generate natural language summary of query results
   */
  private async generateDataSummary(
    userMessage: string,
    queryResult: StandardizedQueryResult,
    _conversationHistory: ChatMessage[],
    isFallback = false
  ): Promise<{ summary: string }> {
    const timer = logger.startTimer('Data Summary Generation')

    try {
      logger.ai('Generating dynamic data summary', undefined, {
        resultCount: queryResult.data.length,
        groupBy: queryResult.metadata.groupBy.join(', '),
        metrics: queryResult.metadata.metrics.join(', '),
        isFallback
      })

      // Prepare data summary for AI
      const dataSummary = this.prepareDataForSummary(queryResult)

      const systemPrompt = this.buildSummaryPrompt(isFallback)
      const userPrompt = this.buildSummaryUserPrompt(userMessage, dataSummary, queryResult.metadata, isFallback)

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
        logger.warn('Summary generation failed, using fallback', undefined, {
          processingTime: duration,
          error: response.error ? new Error(response.error) : undefined
        })

        return { summary: this.generateFallbackSummary(queryResult, isFallback) }
      }

      logger.ai('Dynamic data summary generated', undefined, {
        processingTime: duration,
        summaryLength: response.content?.length || 0,
        model: this.model,
        tokens: response.metadata.tokens,
        cost: response.metadata.cost
      })

      return { summary: response.content || this.generateFallbackSummary(queryResult, isFallback) }

    } catch (err) {
      const duration = timer()
      const error = err instanceof Error ? err : new Error(UNKNOWN_ERROR_MESSAGE)

      logger.error('Summary generation failed', error, {
        processingTime: duration
      })

      return { summary: this.generateFallbackSummary(queryResult, isFallback) }
    }
  }

  /**
   * Build system prompt for data summary generation
   */
  private buildSummaryPrompt(isFallback: boolean): string {
    const fallbackNote = isFallback
      ? '\n\nNOTE: This query used fallback parameters because the original request was unclear. Acknowledge this politely and suggest the user be more specific if they need different data.'
      : ''

    return `You are a sales analytics assistant. Generate clear, insightful summaries of sales data query results.

CRITICAL RULES:
- ONLY use the exact data provided in the "Query Results" section
- NEVER make up numbers, percentages, or trends that aren't in the actual data
- If no data is provided or data shows zero/null values, clearly state that
- Do NOT invent comparisons to "previous periods" unless that data is explicitly provided
- Do NOT create fictional growth percentages or trends
- Format numbers clearly with appropriate units (e.g., $1,234.56, 45 items)

RESPONSE GUIDELINES:
- Be conversational and helpful
- Use ONLY the specific numbers from the provided data
- If the query was grouped (by location, time, item), highlight the breakdown
- If multiple metrics were requested, address each one
- Keep responses concise but thorough
- If suggesting insights, base them only on the actual data shown

FORMATTING:
- Use bullet points for breakdowns when appropriate
- Format monetary amounts with dollar signs and commas
- Round percentages to 1 decimal place when calculating from provided data
- Use clear headings for different sections if the data is complex

Your goal is to help business owners understand their ACTUAL data accurately, not to create optimistic fictional scenarios.${fallbackNote}`
  }

  /**
   * Build user prompt for summary generation
   */
  private buildSummaryUserPrompt(
    userMessage: string,
    dataSummary: string,
    metadata: StandardizedQueryResult['metadata'],
    isFallback: boolean
  ): string {
    const fallbackNotice = isFallback
      ? '\n\nIMPORTANT: This query used fallback parameters because your original request was unclear. Please mention this and suggest being more specific if different data is needed.'
      : ''

    return `User asked: "${userMessage}"

Query details:
- Grouped by: ${metadata.groupBy.length > 0 ? metadata.groupBy.join(', ') : 'No grouping (aggregate summary)'}
- Metrics calculated: ${metadata.metrics.join(', ')}
- Date range(s): ${metadata.parameters.dateRanges.map(r => r.period).join(', ')}
- Locations: ${metadata.parameters.locationIds.length > 0 ? metadata.parameters.locationIds.length + ' specific locations' : 'All locations'}
- Items: ${metadata.parameters.items.length > 0 ? metadata.parameters.items.join(', ') : 'All items'}

Query Results:
${dataSummary}

Generate a helpful response that answers their question using ONLY the data shown above. Do not add any information that is not present in the query results.${fallbackNotice}`
  }

  /**
   * Prepare query results for AI summary
   */
  private prepareDataForSummary(queryResult: StandardizedQueryResult): string {
    if (!queryResult.data || queryResult.data.length === 0) {
      return 'No data found for the specified criteria.'
    }

    const lines: string[] = []

    lines.push(`Total records: ${queryResult.data.length}`)

    // Add breakdown by dimensions if grouped
    if (queryResult.metadata.groupBy.length > 0) {
      lines.push(`\nBreakdown by ${queryResult.metadata.groupBy.join(' and ')}:`)

      queryResult.data.forEach((row, index) => {
        const dimensionParts = Object.entries(row.dimensions)
          .map(([key, value]) => `${key}: ${value}`)
          .join(', ')

        const metricParts = Object.entries(row.metrics)
          .map(([key, value]) => `${key}: ${typeof value === 'number' ? this.formatMetric(key, value) : value}`)
          .join(', ')

        lines.push(`  ${index + 1}. ${dimensionParts} → ${metricParts}`)
      })
    } else {
      // Single aggregate result
      const row = queryResult.data[0]
      lines.push(`\nAggregate results:`)

      Object.entries(row.metrics).forEach(([metric, value]) => {
        lines.push(`  ${metric}: ${this.formatMetric(metric, value)}`)
      })
    }

    return lines.join('\n')
  }

  /**
   * Format metric values for display
   */
  private formatMetric(metricName: string, value: number): string {
    switch (metricName) {
      case 'revenue':
        return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      case 'avg_transaction':
      case 'avg_item_price':
        return `$${value.toFixed(2)}`
      case 'count':
      case 'quantity':
      case 'unique_items':
        return value.toLocaleString('en-US')
      case 'items_per_sale':
        return value.toFixed(1)
      default:
        return value.toString()
    }
  }

  /**
   * Generate fallback summary when AI fails
   */
  private generateFallbackSummary(queryResult: StandardizedQueryResult, isFallback: boolean): string {
    const count = queryResult.data.length

    if (count === 0) {
      return isFallback
        ? 'No data found for your query. I used general search parameters since your request was unclear. Please be more specific about the time period, location, or items you\'re interested in.'
        : 'No data found matching your criteria.'
    }

    const groupByText = queryResult.metadata.groupBy.length > 0
      ? ` grouped by ${queryResult.metadata.groupBy.join(' and ')}`
      : ''

    const baseText = `Found ${count} result${count === 1 ? '' : 's'}${groupByText} for your query.`

    const fallbackText = isFallback
      ? ' Note: I used general search parameters since your original request was unclear. Please let me know if you need different data.'
      : ''

    return baseText + fallbackText
  }

  /**
   * Convert new query result format to legacy format for backward compatibility
   */
  private convertToLegacyFormat(data: QueryResultRow[]): Record<string, string | number | boolean | null> | Array<Record<string, string | number | boolean | null>> | undefined {
    if (!data || data.length === 0) {
      return undefined
    }

    if (data.length === 1 && Object.keys(data[0].dimensions).length === 0) {
      // Single aggregate result
      return data[0].metrics as Record<string, string | number | boolean | null>
    }

    // Multiple results or grouped results
    return data.map(row => ({
      ...row.dimensions,
      ...row.metrics
    })) as Array<Record<string, string | number | boolean | null>>
  }

  /**
   * Determine query type for backward compatibility
   */
  private determineQueryType(params: QueryParameters): string {
    if (params.groupBy.includes('item')) {
      return 'top_items'
    }

    if (params.groupBy.includes('location')) {
      return 'location_performance'
    }

    if (params.groupBy.length === 0) {
      return 'sales_summary'
    }

    return 'sales_data'
  }

  /**
   * Serialize parameters for logging
   */
  private serializeFiltersForLogging(params: QueryParameters): Record<string, string | number | boolean | null> {
    return {
      dateRanges: params.dateRanges.map(r => r.period).join(', '),
      locationIds: params.locationIds.join(', '),
      items: params.items.join(', '),
      metrics: params.metrics.join(', '),
      groupBy: params.groupBy.join(', '),
      aggregation: params.aggregation
    }
  }
}

// Export singleton instance
export const dynamicDataQueryHandler = new DynamicDataQueryHandler()

// Export class for testing
export { DynamicDataQueryHandler }