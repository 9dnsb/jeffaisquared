/**
 * AI v3 Data Query Handler - Main orchestrator using function calling architecture
 * Replaces the old AI v2 dataQueryHandler with modern OpenAI function calling
 */

import { logger } from '../utils/logger'
import { functionCaller } from './function-caller'
import type {
  QueryRequest,
  QueryResponse,
  QueryMetadata,
  ChatMessage
} from './types'

export interface DataQueryRequest {
  userMessage: string
  conversationHistory: ChatMessage[]
  intent: 'data_query'
  userId?: string
}

export interface DataQueryResponse {
  success: boolean
  data?: any[]
  summary: string
  metadata: {
    processingTime: number
    prismaQuery: string
    model: string
    tokens: number
    cost: number
  }
  queryPlan: string
  queryType: string
  recordCount: number
  error?: string
}

export class DataQueryHandlerV3 {
  /**
   * Process data query using AI v3 function calling architecture
   */
  async processDataQuery(request: DataQueryRequest): Promise<DataQueryResponse> {
    const overallTimer = logger.startTimer('AI v3 Data Query Processing')

    try {
      logger.ai('🚀 AI v3 processing data query', request.userMessage.slice(0, 100), {
        userId: request.userId,
        historyLength: request.conversationHistory.length
      })

      // Convert to internal QueryRequest format
      const queryRequest: QueryRequest = {
        userMessage: request.userMessage,
        conversationHistory: request.conversationHistory,
        intent: 'data_query',
        userId: request.userId
      }

      // Process using function calling system
      const response = await functionCaller.processQuery(queryRequest)

      const duration = overallTimer()

      // Convert to legacy DataQueryResponse format for API compatibility
      const legacyResponse: DataQueryResponse = {
        success: response.success,
        data: response.data,
        summary: response.summary,
        metadata: {
          processingTime: duration,
          prismaQuery: this.extractPrismaQuery(response.metadata),
          model: 'gpt-4o', // AI v3 uses GPT-4o
          tokens: this.extractTokens(response.metadata),
          cost: this.extractCost(response.metadata)
        },
        queryPlan: response.metadata.queryPlan,
        queryType: this.mapAnalysisTypeToQueryType(response.metadata.extractedParameters?.analysisType),
        recordCount: response.metadata.recordCount,
        error: response.error
      }

      if (response.success) {
        logger.success('AI v3 data query completed successfully', undefined, {
          processingTime: duration,
          recordCount: response.metadata.recordCount,
          queryComplexity: response.metadata.queryComplexity,
          userId: request.userId
        })
      } else {
        logger.error('AI v3 data query failed', new Error(response.error || 'Unknown error'), {
          processingTime: duration,
          userId: request.userId
        })
      }

      return legacyResponse

    } catch (err) {
      const duration = overallTimer()
      const error = err instanceof Error ? err : new Error('Data query processing failed')

      logger.error('AI v3 data query processing failed', error, {
        processingTime: duration,
        userId: request.userId,
        userMessage: request.userMessage.slice(0, 100)
      })

      return {
        success: false,
        summary: 'I apologize, but I encountered an error processing your query. Please try again.',
        metadata: {
          processingTime: duration,
          prismaQuery: 'error',
          model: 'gpt-4o',
          tokens: 0,
          cost: 0
        },
        queryPlan: 'error',
        queryType: 'error',
        recordCount: 0,
        error: error.message
      }
    }
  }

  /**
   * Extract Prisma query information from metadata for legacy compatibility
   */
  private extractPrismaQuery(metadata: QueryMetadata): string {
    // In function calling architecture, we don't have a single Prisma query
    // Instead, we have multiple function calls that may result in multiple queries
    return metadata.queryPlan || 'function_calls'
  }

  /**
   * Extract token usage from metadata
   */
  private extractTokens(metadata: QueryMetadata): number {
    // In the new architecture, token information would be tracked in the function caller
    // For now, return 0 as a placeholder - this would need to be implemented
    // in the function calling system to track OpenAI usage
    return 0
  }

  /**
   * Extract cost information from metadata
   */
  private extractCost(metadata: QueryMetadata): number {
    // Similar to tokens, cost tracking would be implemented in the function caller
    return 0
  }

  /**
   * Map new analysis types to legacy query types for API compatibility
   */
  private mapAnalysisTypeToQueryType(analysisType?: string): string {
    if (!analysisType) return 'unknown'

    // Map function names to legacy query types
    const typeMapping: Record<string, string> = {
      'get_time_based_metrics': 'time_based_aggregate',
      'compare_periods': 'time_comparison',
      'get_best_performing_days': 'ranking_analysis',
      'get_seasonal_trends': 'trend_analysis',
      'get_location_metrics': 'location_aggregate',
      'compare_locations': 'location_comparison',
      'get_location_rankings': 'location_ranking',
      'get_top_products': 'product_ranking',
      'get_product_location_analysis': 'cross_dimensional',
      'get_product_categories': 'category_analysis',
      'get_business_overview': 'business_aggregate',
      'get_advanced_analytics': 'complex_analysis'
    }

    return typeMapping[analysisType] || 'unknown'
  }
}

// Export singleton instance for backwards compatibility
export const dataQueryHandlerV3 = new DataQueryHandlerV3()

// Also export as default for easy importing
export default dataQueryHandlerV3