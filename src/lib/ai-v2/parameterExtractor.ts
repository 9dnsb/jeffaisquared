/**
 * AI-powered parameter extraction system
 * Converts natural language queries into structured database parameters
 */

import { logger } from '../utils/logger'
import { openaiClient } from './openaiClient'
import { locationMapper } from './locationMapper'
import type {
  QueryParameters,
  ParameterExtractionResult,
  Metric,
  GroupBy
} from './types'

export class ParameterExtractor {
  /**
   * Extract structured parameters from natural language query
   */
  async extractParameters(
    userQuery: string,
    conversationHistory: unknown[] = []
  ): Promise<ParameterExtractionResult> {
    const timer = logger.startTimer('Parameter Extraction')

    try {
      logger.ai('Starting parameter extraction', userQuery.slice(0, 100))

      // Get AI parameter extraction
      const aiResult = await this.getAIExtraction(userQuery)

      if (!aiResult.success) {
        const duration = timer()
        return {
          success: false,
          parameters: this.getDefaultParameters(),
          confidence: 0,
          reasoning: 'AI extraction failed',
          error: aiResult.error
        }
      }

      // Parse and validate AI response
      const parsed = this.parseAIResponse(aiResult.content)

      // Enhance with dynamic date calculation
      const withDynamicDates = this.enhanceWithDynamicDates(parsed, userQuery)

      // Enhance with location resolution
      const enhanced = await this.enhanceWithLocationMapping(withDynamicDates, userQuery)

      // Apply business rules and defaults
      const finalized = this.applyBusinessRules(enhanced, userQuery)

      const duration = timer()

      logger.success('Parameter extraction completed', undefined, {
        processingTime: duration,
        metrics: finalized.metrics.join(', '),
        groupBy: finalized.groupBy.join(', '),
        locationCount: finalized.locationIds.length,
        hasDateRange: !!(finalized.startDate || finalized.endDate)
      })

      return {
        success: true,
        parameters: finalized,
        confidence: 0.8, // TODO: Calculate actual confidence
        reasoning: 'Successfully extracted and enhanced parameters'
      }

    } catch (err) {
      const duration = timer()
      const error = err instanceof Error ? err : new Error('Parameter extraction failed')

      logger.error('Parameter extraction failed', error, {
        processingTime: duration,
        query: userQuery.slice(0, 100)
      })

      return {
        success: false,
        parameters: this.getDefaultParameters(),
        confidence: 0,
        reasoning: 'Extraction failed with error',
        error: error.message
      }
    }
  }

  /**
   * Get AI extraction of parameters
   */
  private async getAIExtraction(userQuery: string) {
    // Get current date for OpenAI context
    const now = new Date()
    const currentDate = now.toISOString().split('T')[0] // YYYY-MM-DD format
    const currentYear = now.getFullYear()

    const systemPrompt = `You are a sales data query parameter extractor. Analyze the user's natural language query and extract structured parameters.

CURRENT CONTEXT:
- Today's date: ${currentDate}
- Current year: ${currentYear}
- Timezone: Toronto (America/Toronto)

CRITICAL RULES:
- Extract ONLY what is explicitly mentioned or clearly implied
- Do NOT make assumptions about unspecified parameters
- Use exact item names when mentioned (case-sensitive)
- For time periods, calculate dates based on the current date provided above

PARAMETER EXTRACTION:

1. METRICS (what to calculate):
   - "total sales", "revenue", "sales" → revenue
   - "transactions", "number of", "count" → count
   - "quantity", "how many", "units" → quantity
   - "average transaction", "avg transaction" → avg_transaction
   - "average price", "avg price" → avg_item_price

2. GROUPING (how to organize results):
   - "by location", "compare locations", "which location" → location
   - "by item", "top items", "which item" → item
   - "monthly", "by month", "month breakdown" → month
   - "daily", "by date" → date

3. TIME PERIODS (calculate using current date: ${currentDate}):
   - "2024", "in 2024" → "2024-01-01" to "2025-01-01"
   - "this year" → "${currentYear}-01-01" to "${currentYear + 1}-01-01"
   - "September 2025" → "2025-09-01" to "2025-10-01"
   - "today" → "${currentDate}" to next day (e.g., "${currentDate}" to day after)
   - "yesterday" → calculate 1 day before ${currentDate} to ${currentDate}
   - "last week" → exactly 7 days including today: 6 days before ${currentDate} to ${currentDate} (e.g., Sept 13 to Sept 19)
   - "last 30 days" → calculate 30 days before ${currentDate} to ${currentDate}
   - NO TIME SPECIFIED → omit startDate and endDate (use all data)

IMPORTANT: For single day periods (today, yesterday), the end date should be the START of the next day to include the full day.

4. LOCATIONS:
   - Specific location names or keywords → extract and map
   - "compare X and Y" → extract both locations
   - No location specified → include all locations

5. ITEMS:
   - Specific item names → extract exactly as mentioned
   - "top 3", "best" → limit results but don't filter items
   - No items specified → include all items

Respond with valid JSON only:
{
  "metrics": ["revenue"],
  "groupBy": ["location"],
  "startDate": "2024-01-01",
  "endDate": "2024-12-31",
  "locationKeywords": ["yonge", "bloor"],
  "itemNames": ["Latte"],
  "limit": 3,
  "sortBy": "revenue",
  "sortDirection": "desc"
}`

    const userPrompt = `Extract parameters from this query: "${userQuery}"`

    return await openaiClient.makeRequest([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ])
  }

  /**
   * Parse AI response into parameters
   */
  private parseAIResponse(aiResponse: string): Partial<QueryParameters> {
    try {
      // Clean up markdown-wrapped JSON response
      let cleanJson = aiResponse.trim()

      // Remove markdown code blocks if present
      if (cleanJson.startsWith('```json')) {
        cleanJson = cleanJson.replace(/^```json\s*/, '').replace(/\s*```$/, '')
      } else if (cleanJson.startsWith('```')) {
        cleanJson = cleanJson.replace(/^```\s*/, '').replace(/\s*```$/, '')
      }

      const parsed = JSON.parse(cleanJson)

      return {
        metrics: this.validateMetrics(parsed.metrics || []),
        groupBy: this.validateGroupBy(parsed.groupBy || []),
        startDate: parsed.startDate ? new Date(parsed.startDate) : undefined,
        endDate: parsed.endDate ? new Date(parsed.endDate) : undefined,
        itemNames: Array.isArray(parsed.itemNames) ? parsed.itemNames : [],
        locationIds: [], // Will be resolved from keywords
        sortBy: parsed.sortBy,
        sortDirection: parsed.sortDirection,
        limit: parsed.limit
      }
    } catch (err) {
      logger.warn('Failed to parse AI response, using defaults', undefined, {
        errorType: 'parse_error',
        errorMessage: err instanceof Error ? err.message : 'Unknown error',
        aiResponse: aiResponse.slice(0, 200)
      })
      return {}
    }
  }

  /**
   * Validate metrics array
   */
  private validateMetrics(metrics: unknown[]): Metric[] {
    const validMetrics: Metric[] = ['revenue', 'count', 'quantity', 'avg_transaction', 'avg_item_price']

    return metrics
      .filter((m): m is string => typeof m === 'string')
      .filter((m): m is Metric => validMetrics.includes(m as Metric))
  }

  /**
   * Validate groupBy array
   */
  private validateGroupBy(groupBy: unknown[]): GroupBy[] {
    const validGroupBy: GroupBy[] = ['location', 'item', 'month', 'date']

    return groupBy
      .filter((g): g is string => typeof g === 'string')
      .filter((g): g is GroupBy => validGroupBy.includes(g as GroupBy))
  }

  /**
   * Enhance parameters with dynamic date calculation
   */
  private enhanceWithDynamicDates(
    params: Partial<QueryParameters>,
    userQuery: string
  ): Partial<QueryParameters> {
    // Trust OpenAI's date calculations now that we provide current date context
    if (params.startDate || params.endDate) {
      logger.data('Using OpenAI-calculated dates', undefined, {
        query: userQuery.slice(0, 50),
        startDate: params.startDate?.toISOString(),
        endDate: params.endDate?.toISOString()
      })
    }

    return params
  }

  /**
   * Enhance parameters with location mapping
   */
  private async enhanceWithLocationMapping(
    params: Partial<QueryParameters>,
    userQuery: string
  ): Promise<Partial<QueryParameters>> {
    // Resolve location keywords to IDs
    const locationIds = locationMapper.resolveLocations(userQuery)

    return {
      ...params,
      locationIds
    }
  }

  /**
   * Apply business rules and defaults
   */
  private applyBusinessRules(
    params: Partial<QueryParameters>,
    userQuery: string
  ): QueryParameters {
    const query = userQuery.toLowerCase()

    // Default metrics if none specified
    let metrics = params.metrics || []
    if (metrics.length === 0) {
      if (query.includes('transaction') || query.includes('count')) {
        metrics = ['count']
      } else if (query.includes('quantity') || query.includes('how many')) {
        metrics = ['quantity']
      } else if (query.includes('average') && query.includes('transaction')) {
        metrics = ['avg_transaction']
      } else {
        metrics = ['revenue'] // Default to revenue
      }
    }

    // Default groupBy if none specified but query suggests grouping
    let groupBy = params.groupBy || []
    if (groupBy.length === 0) {
      if (query.includes('location') || query.includes('compare') || query.includes('which location')) {
        groupBy = ['location']
      } else if (query.includes('item') || query.includes('top') || query.includes('best')) {
        groupBy = ['item']
      } else if (query.includes('month') || query.includes('monthly')) {
        groupBy = ['month']
      }
    }

    // Default location filtering
    let locationIds = params.locationIds || []
    if (locationIds.length === 0 && !locationMapper.hasLocationFilter(userQuery)) {
      // No specific locations mentioned, include all
      locationIds = []
    }

    return {
      metrics,
      groupBy,
      locationIds,
      itemNames: params.itemNames || [],
      startDate: params.startDate,
      endDate: params.endDate,
      sortBy: params.sortBy || this.getDefaultSortBy(metrics, groupBy),
      sortDirection: params.sortDirection || 'desc',
      limit: params.limit
    }
  }

  /**
   * Get default sort field based on metrics and grouping
   */
  private getDefaultSortBy(metrics: Metric[], groupBy: GroupBy[]): string | undefined {
    // If there's grouping, sort by the primary metric for better UX
    if (groupBy.length > 0 && metrics.length > 0) {
      return metrics[0] // Sort by the first/primary metric
    }

    // For aggregate queries, no sorting needed
    return undefined
  }

  /**
   * Get default parameters for fallback
   */
  private getDefaultParameters(): QueryParameters {
    return {
      metrics: ['revenue'],
      groupBy: [],
      locationIds: [],
      itemNames: []
    }
  }
}

export const parameterExtractor = new ParameterExtractor()