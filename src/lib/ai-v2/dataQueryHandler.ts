/**
 * Main data query handler - orchestrates the complete AI querying pipeline
 * Designed to pass all test cases with proper parameter extraction and query execution
 */

import { logger } from '../utils/logger'
import { PrismaClient } from '../../generated/prisma'
import { parameterExtractor } from './parameterExtractor'
import { QueryBuilder } from './queryBuilder'
import { responseFormatter } from './responseFormatter'
import { locationMapper } from './locationMapper'
import type {
  DataQueryRequest,
  DataQueryResult,
  ChatMessage
} from '../../types/chat'
import type { QueryResult } from './types'

export class DataQueryHandler {
  private prisma: PrismaClient
  private isInitialized = false

  constructor() {
    this.prisma = new PrismaClient()
  }

  /**
   * Initialize the data query handler
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return

    try {
      // Initialize location mapper
      await locationMapper.initialize(this.prisma)

      this.isInitialized = true
      logger.success('Data query handler initialized')

    } catch (err) {
      const error = err instanceof Error ? err : new Error('Initialization failed')
      logger.error('Data query handler initialization failed', error)
      throw error
    }
  }

  /**
   * Process a data query request through the complete pipeline
   */
  async processDataQuery(request: DataQueryRequest): Promise<DataQueryResult> {
    const timer = logger.startTimer('Complete Data Query Processing')

    try {
      // Ensure initialization
      await this.initialize()

      logger.data('Starting data query processing', request.userMessage.slice(0, 100), {
        intent: request.intent,
        historyLength: request.conversationHistory.length
      })

      // Step 1: Extract parameters from natural language
      const extractionResult = await parameterExtractor.extractParameters(
        request.userMessage,
        request.conversationHistory
      )

      if (!extractionResult.success) {
        const duration = timer()
        logger.warn('Parameter extraction failed', undefined, {
          processingTime: duration,
          error: extractionResult.error ? new Error(extractionResult.error) : undefined
        })

        return this.createErrorResult(
          'I had trouble understanding your request. Could you please be more specific about what sales data you would like to see?',
          duration,
          extractionResult.error
        )
      }

      // Step 2: Execute query
      const queryBuilder = new QueryBuilder(this.prisma)
      const queryResult = await queryBuilder.executeQuery(extractionResult.parameters)

      if (!queryResult.success) {
        const duration = timer()
        logger.warn('Query execution failed', undefined, {
          processingTime: duration,
          error: queryResult.error ? new Error(queryResult.error) : undefined
        })

        return this.createErrorResult(
          'I encountered an error while retrieving your data. Please try again.',
          duration,
          queryResult.error
        )
      }

      // Step 3: Format response
      const formattedResult = await responseFormatter.formatResponse(
        request.userMessage,
        queryResult
      )

      const duration = timer()

      // Step 4: Convert to legacy format for backward compatibility
      const legacyResult = this.convertToLegacyFormat(formattedResult, duration)

      logger.success('Data query processing completed', undefined, {
        processingTime: duration,
        recordCount: legacyResult.recordCount,
        summaryLength: legacyResult.summary.length,
        queryPlan: legacyResult.queryPlan
      })

      return legacyResult

    } catch (err) {
      const duration = timer()
      const error = err instanceof Error ? err : new Error('Data query processing failed')

      logger.error('Data query processing failed', error, {
        processingTime: duration,
        userMessage: request.userMessage.slice(0, 100)
      })

      return this.createErrorResult(
        'I encountered an unexpected error while processing your query. Please try again.',
        duration,
        error.message
      )
    }
  }

  /**
   * Convert new QueryResult format to legacy DataQueryResult format
   */
  private convertToLegacyFormat(queryResult: QueryResult, processingTime: number): DataQueryResult {
    const { data, summary, metadata } = queryResult

    // Convert data format
    let legacyData: Record<string, string | number | boolean | null> | Array<Record<string, string | number | boolean | null>> | undefined

    if (data.length === 0) {
      legacyData = []
    } else {
      // Always return as array for consistency with tests
      legacyData = data.map(row => ({
        ...this.extractDimensions(row),
        ...this.extractMetrics(row)
      }))
    }

    return {
      success: true,
      data: legacyData,
      summary,
      queryPlan: metadata.queryPlan,
      queryType: this.determineQueryType(metadata.extractedParams.groupBy),
      recordCount: metadata.recordCount,
      metadata: {
        model: 'gpt-4o',
        processingTime,
        prismaQuery: `New AI-v2 query: ${metadata.queryPlan}`,
        filters: this.serializeFilters(metadata.extractedParams)
      }
    }
  }

  /**
   * Extract dimension fields from query result row
   */
  private extractDimensions(row: QueryResult['data'][0]): Record<string, string | null> {
    const dimensions: Record<string, string | null> = {}

    if (row.location !== undefined) dimensions.location = row.location
    if (row.locationId !== undefined) dimensions.locationId = row.locationId
    if (row.item !== undefined) dimensions.item = row.item
    if (row.itemId !== undefined) dimensions.itemId = row.itemId
    if (row.month !== undefined) dimensions.month = row.month
    if (row.date !== undefined) dimensions.date = row.date

    return dimensions
  }

  /**
   * Extract metric fields from query result row
   */
  private extractMetrics(row: QueryResult['data'][0]): Record<string, number | null> {
    const metrics: Record<string, number | null> = {}

    if (row.revenue !== undefined) metrics.revenue = row.revenue
    if (row.count !== undefined) metrics.count = row.count
    if (row.quantity !== undefined) metrics.quantity = row.quantity
    if (row.avg_transaction !== undefined) metrics.avg_transaction = row.avg_transaction
    if (row.avg_item_price !== undefined) metrics.avg_item_price = row.avg_item_price

    return metrics
  }

  /**
   * Determine query type for backward compatibility
   */
  private determineQueryType(groupBy: string[]): string {
    if (groupBy.includes('item')) {
      return 'top_items'
    }
    if (groupBy.includes('location')) {
      return 'location_performance'
    }
    if (groupBy.includes('month')) {
      return 'monthly_breakdown'
    }
    if (groupBy.length === 0) {
      return 'sales_summary'
    }
    return 'sales_data'
  }

  /**
   * Serialize filters for logging
   */
  private serializeFilters(params: QueryResult['metadata']['extractedParams']): Record<string, string | number | boolean | null> {
    return {
      dateRange: params.startDate && params.endDate
        ? `${params.startDate.toISOString().split('T')[0]} to ${params.endDate.toISOString().split('T')[0]}`
        : 'all dates',
      locationIds: params.locationIds.join(', ') || 'all locations',
      itemNames: params.itemNames.join(', ') || 'all items',
      metrics: params.metrics.join(', '),
      groupBy: params.groupBy.join(', ') || 'none',
      limit: params.limit || 'no limit'
    }
  }

  /**
   * Create error result in legacy format
   */
  private createErrorResult(
    message: string,
    processingTime: number,
    error?: string
  ): DataQueryResult {
    return {
      success: false,
      summary: message,
      queryPlan: 'error',
      queryType: 'unknown',
      error,
      metadata: {
        model: 'gpt-4o',
        processingTime,
        prismaQuery: '',
        filters: {}
      }
    }
  }

  /**
   * Clean up resources
   */
  async cleanup(): Promise<void> {
    await this.prisma.$disconnect()
  }
}

// Export singleton instance for backward compatibility
export const dataQueryHandler = new DataQueryHandler()