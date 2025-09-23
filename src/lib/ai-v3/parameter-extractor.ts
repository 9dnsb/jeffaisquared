/**
 * AI v3 Parameter Extractor - Advanced natural language processing
 * Uses OpenAI GPT-4o for robust parameter extraction from business queries
 */

import OpenAI from 'openai'
import { logger } from '../utils/logger'
import { AI_V3_CONFIG, PROMPT_TEMPLATES, VALIDATION_RULES, ERROR_MESSAGES } from './config'
import type {
  QueryParameters,
  QueryRequest,
  ValidationResult,
  TimeFrame,
  LocationFilter,
  ItemFilter,
  MetricType,
  GroupByDimension,
  AnalysisType,
  OpenAIResponse
} from './types'

export class ParameterExtractor {
  private openai: OpenAI
  private locationKeywords: Map<string, string[]>
  private itemKeywords: Map<string, string[]>

  constructor() {
    if (!AI_V3_CONFIG.openai.apiKey) {
      throw new Error('OpenAI API key is required for AI v3')
    }

    this.openai = new OpenAI({
      apiKey: AI_V3_CONFIG.openai.apiKey,
      timeout: AI_V3_CONFIG.openai.timeout
    })

    // Initialize entity recognition maps
    this.locationKeywords = new Map()
    this.itemKeywords = new Map()
    this.initializeEntityMaps()
  }

  /**
   * Extract query parameters from natural language
   */
  async extractParameters(request: QueryRequest): Promise<{
    success: boolean
    parameters?: QueryParameters
    confidence: number
    error?: string
  }> {
    const timer = logger.startTimer('Parameter Extraction')

    try {
      logger.ai('Starting parameter extraction', request.userMessage.slice(0, 100))

      // Step 1: Validate input
      const validation = this.validateInput(request.userMessage)
      if (!validation.isValid) {
        return {
          success: false,
          confidence: 0,
          error: validation.errors[0] || 'Invalid input'
        }
      }

      // Step 2: Use OpenAI for initial parameter extraction
      const openaiResult = await this.extractWithOpenAI(request.userMessage)
      if (!openaiResult.success) {
        return {
          success: false,
          confidence: 0,
          error: openaiResult.error || ERROR_MESSAGES.PARAMETER_EXTRACTION_FAILED
        }
      }

      // Step 3: Parse and validate OpenAI response
      const rawParameters = this.parseOpenAIResponse(openaiResult.content)
      if (!rawParameters) {
        return {
          success: false,
          confidence: 0,
          error: 'Failed to parse parameter extraction response'
        }
      }

      // Step 4: Enhance with context and entity resolution
      const enhancedParameters = await this.enhanceParameters(
        rawParameters,
        request.conversationHistory
      )

      // Step 5: Final validation and normalization
      const finalValidation = this.validateParameters(enhancedParameters)
      if (!finalValidation.isValid) {
        return {
          success: false,
          confidence: 0.3,
          error: finalValidation.errors[0]
        }
      }

      const duration = timer()
      logger.success('Parameter extraction completed', undefined, {
        processingTime: duration,
        metrics: enhancedParameters.metrics.join(', '),
        groupBy: enhancedParameters.groupBy.join(', '),
        timeframe: enhancedParameters.timeframe
      })

      return {
        success: true,
        parameters: finalValidation.normalizedParameters!,
        confidence: this.calculateConfidence(enhancedParameters, request.userMessage)
      }

    } catch (err) {
      const duration = timer()
      const error = err instanceof Error ? err : new Error('Parameter extraction failed')

      logger.error('Parameter extraction failed', error, {
        processingTime: duration,
        query: request.userMessage.slice(0, 100)
      })

      return {
        success: false,
        confidence: 0,
        error: error.message
      }
    }
  }

  /**
   * Use OpenAI to extract parameters from natural language
   */
  private async extractWithOpenAI(query: string): Promise<OpenAIResponse> {
    const timer = logger.startTimer('OpenAI Parameter Extraction')

    try {
      const prompt = PROMPT_TEMPLATES.PARAMETER_EXTRACTION.replace('{query}', query)

      const response = await this.openai.chat.completions.create({
        model: AI_V3_CONFIG.openai.model,
        messages: [
          {
            role: 'system',
            content: PROMPT_TEMPLATES.SYSTEM_PROMPT
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: AI_V3_CONFIG.openai.maxTokens,
        temperature: AI_V3_CONFIG.openai.temperature
      })

      const duration = timer()
      const content = response.choices[0]?.message?.content || ''
      const tokens = response.usage?.total_tokens || 0
      const cost = tokens * 0.00003 // GPT-4o pricing

      logger.ai('OpenAI parameter extraction completed', undefined, {
        model: AI_V3_CONFIG.openai.model,
        tokens,
        cost: Number(cost.toFixed(6)),
        processingTime: duration
      })

      return {
        success: true,
        content,
        model: AI_V3_CONFIG.openai.model,
        tokens,
        cost,
        processingTime: duration
      }

    } catch (err) {
      const duration = timer()
      const error = err instanceof Error ? err : new Error('OpenAI request failed')

      logger.error('OpenAI parameter extraction failed', error, {
        processingTime: duration
      })

      return {
        success: false,
        content: '',
        model: AI_V3_CONFIG.openai.model,
        tokens: 0,
        cost: 0,
        processingTime: duration,
        error: error.message
      }
    }
  }

  /**
   * Parse OpenAI JSON response into parameters object
   */
  private parseOpenAIResponse(content: string): Partial<QueryParameters> | null {
    try {
      // Clean up the response to extract JSON
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        logger.warn('No JSON found in OpenAI response', undefined, { content: content.slice(0, 200) })
        return null
      }

      const parsed = JSON.parse(jsonMatch[0])
      return parsed

    } catch (err) {
      logger.warn('Failed to parse OpenAI response', undefined, {
        content: content.slice(0, 200),
        errorMessage: err instanceof Error ? err.message : String(err)
      })
      return null
    }
  }

  /**
   * Enhance parameters with context and entity resolution
   */
  private async enhanceParameters(
    rawParameters: Partial<QueryParameters>,
    conversationHistory: QueryRequest['conversationHistory']
  ): Promise<QueryParameters> {
    // Resolve time parameters
    const timeParams = this.resolveTimeParameters(
      rawParameters.timeframe as TimeFrame,
      rawParameters.startDate,
      rawParameters.endDate
    )

    // Resolve location entities
    const locations = this.resolveLocationEntities(rawParameters.locations || [])

    // Resolve item entities
    const items = this.resolveItemEntities(rawParameters.items || [])

    // Normalize metrics
    const metrics = this.normalizeMetrics(rawParameters.metrics || [])

    // Normalize groupBy dimensions
    const groupBy = this.normalizeGroupBy(rawParameters.groupBy || [])

    // Determine analysis type
    const analysisType = this.determineAnalysisType(rawParameters, metrics, groupBy)

    // Estimate complexity and performance requirements
    const { requiresRawSQL, expectedRecordCount } = this.estimateComplexity(
      timeParams,
      locations,
      items,
      analysisType
    )

    return {
      timeframe: timeParams.timeframe,
      startDate: timeParams.startDate,
      endDate: timeParams.endDate,
      locations,
      items,
      categories: rawParameters.categories || [],
      metrics,
      groupBy,
      orderBy: rawParameters.orderBy || [{ field: metrics[0] || 'revenue', direction: 'desc' }],
      limit: rawParameters.limit || this.getDefaultLimit(analysisType),
      analysisType,
      requiresRawSQL,
      expectedRecordCount
    }
  }

  /**
   * Resolve time parameters from natural language
   */
  private resolveTimeParameters(
    timeframe?: TimeFrame,
    startDate?: string | Date,
    endDate?: string | Date
  ): { timeframe: TimeFrame; startDate?: Date; endDate?: Date } {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    if (timeframe === 'custom' && startDate && endDate) {
      return {
        timeframe: 'custom',
        startDate: new Date(startDate),
        endDate: new Date(endDate)
      }
    }

    switch (timeframe) {
      case 'today':
        return {
          timeframe: 'today',
          startDate: today,
          endDate: new Date(today.getTime() + 24 * 60 * 60 * 1000)
        }

      case 'yesterday':
        const yesterday = new Date(today)
        yesterday.setDate(yesterday.getDate() - 1)
        return {
          timeframe: 'yesterday',
          startDate: yesterday,
          endDate: today
        }

      case 'last_week':
        const lastWeek = new Date(today)
        lastWeek.setDate(lastWeek.getDate() - 7)
        return {
          timeframe: 'last_week',
          startDate: lastWeek,
          endDate: today
        }

      case 'last_month':
        const lastMonth = new Date(today)
        lastMonth.setMonth(lastMonth.getMonth() - 1)
        return {
          timeframe: 'last_month',
          startDate: lastMonth,
          endDate: today
        }

      case 'last_30_days':
        const last30Days = new Date(today)
        last30Days.setDate(last30Days.getDate() - 30)
        return {
          timeframe: 'last_30_days',
          startDate: last30Days,
          endDate: today
        }

      case 'last_year':
        const lastYear = new Date(today)
        lastYear.setFullYear(lastYear.getFullYear() - 1)
        return {
          timeframe: 'last_year',
          startDate: lastYear,
          endDate: today
        }

      default:
        return {
          timeframe: 'all_time'
        }
    }
  }

  /**
   * Resolve location entities with fuzzy matching
   */
  private resolveLocationEntities(rawLocations: any[]): LocationFilter[] {
    const locations: LocationFilter[] = []

    for (const loc of rawLocations) {
      if (typeof loc === 'string') {
        locations.push({
          name: loc,
          keywords: this.getLocationKeywords(loc),
          exactMatch: false
        })
      } else if (loc && typeof loc === 'object' && loc.name) {
        locations.push({
          name: loc.name,
          keywords: this.getLocationKeywords(loc.name),
          exactMatch: loc.exactMatch || false
        })
      }
    }

    return locations
  }

  /**
   * Resolve item entities with fuzzy matching
   */
  private resolveItemEntities(rawItems: any[]): ItemFilter[] {
    const items: ItemFilter[] = []

    for (const item of rawItems) {
      if (typeof item === 'string') {
        items.push({
          name: item,
          exactMatch: false
        })
      } else if (item && typeof item === 'object' && item.name) {
        items.push({
          name: item.name,
          category: item.category,
          exactMatch: item.exactMatch || false
        })
      }
    }

    return items
  }

  /**
   * Normalize metrics array
   */
  private normalizeMetrics(rawMetrics: any[]): MetricType[] {
    const validMetrics: MetricType[] = []
    const metricMap: Record<string, MetricType> = {
      'sales': 'revenue',
      'revenue': 'revenue',
      'total': 'revenue',
      'amount': 'revenue',
      'count': 'count',
      'transactions': 'count',
      'orders': 'count',
      'quantity': 'quantity',
      'items': 'quantity',
      'average': 'avg_transaction',
      'avg': 'avg_transaction',
      'price': 'avg_item_price'
    }

    for (const metric of rawMetrics) {
      const normalized = metricMap[metric?.toLowerCase()] || metric
      if (this.isValidMetric(normalized)) {
        validMetrics.push(normalized as MetricType)
      }
    }

    // Default to revenue if no metrics specified
    if (validMetrics.length === 0) {
      validMetrics.push('revenue')
    }

    return [...new Set(validMetrics)] // Remove duplicates
  }

  /**
   * Normalize groupBy dimensions
   */
  private normalizeGroupBy(rawGroupBy: any[]): GroupByDimension[] {
    const validDimensions: GroupByDimension[] = []
    const dimensionMap: Record<string, GroupByDimension> = {
      'location': 'location',
      'store': 'location',
      'shop': 'location',
      'item': 'item',
      'product': 'item',
      'category': 'category',
      'date': 'date',
      'day': 'date',
      'month': 'month',
      'week': 'week',
      'hour': 'hour',
      'time': 'hour'
    }

    for (const dimension of rawGroupBy) {
      const normalized = dimensionMap[dimension?.toLowerCase()] || dimension
      if (this.isValidGroupBy(normalized)) {
        validDimensions.push(normalized as GroupByDimension)
      }
    }

    return [...new Set(validDimensions)] // Remove duplicates
  }

  /**
   * Determine analysis type based on parameters
   */
  private determineAnalysisType(
    rawParams: Partial<QueryParameters>,
    metrics: MetricType[],
    groupBy: GroupByDimension[]
  ): AnalysisType {
    // Check for explicit analysis type
    if (rawParams.analysisType) {
      return rawParams.analysisType
    }

    // Infer from query characteristics
    if (groupBy.length === 0) {
      return 'simple_aggregate'
    }

    if (groupBy.length === 1) {
      return 'grouped_analysis'
    }

    if (groupBy.includes('date') || groupBy.includes('month') || groupBy.includes('week')) {
      return 'trend_analysis'
    }

    if (metrics.includes('market_share') || rawParams.limit && rawParams.limit <= 10) {
      return 'ranking'
    }

    if (groupBy.length > 1) {
      return 'cross_dimensional'
    }

    return 'grouped_analysis'
  }

  /**
   * Estimate query complexity for performance optimization
   */
  private estimateComplexity(
    timeParams: { timeframe: TimeFrame; startDate?: Date; endDate?: Date },
    locations: LocationFilter[],
    items: ItemFilter[],
    analysisType: AnalysisType
  ): { requiresRawSQL: boolean; expectedRecordCount: number } {
    let estimatedRecords = 1000000 // Start with total dataset size

    // Adjust for time filtering
    switch (timeParams.timeframe) {
      case 'today':
        estimatedRecords *= 0.003 // ~0.3% of total
        break
      case 'yesterday':
        estimatedRecords *= 0.003
        break
      case 'last_week':
        estimatedRecords *= 0.02 // ~2% of total
        break
      case 'last_month':
        estimatedRecords *= 0.08 // ~8% of total
        break
      case 'last_30_days':
        estimatedRecords *= 0.08
        break
      case 'last_year':
        estimatedRecords *= 0.9 // ~90% of total
        break
    }

    // Adjust for location filtering
    if (locations.length > 0 && locations.length < 6) {
      estimatedRecords *= (locations.length / 6) // 6 total locations
    }

    // Adjust for item filtering
    if (items.length > 0) {
      estimatedRecords *= 0.1 // Specific items reduce dataset significantly
    }

    // Adjust for analysis complexity
    switch (analysisType) {
      case 'cross_dimensional':
      case 'correlation':
        estimatedRecords *= 2 // More complex processing
        break
      case 'trend_analysis':
        estimatedRecords *= 1.5
        break
    }

    const finalEstimate = Math.floor(estimatedRecords)
    const requiresRawSQL = finalEstimate > AI_V3_CONFIG.performance.rawSQLThreshold

    return {
      requiresRawSQL,
      expectedRecordCount: finalEstimate
    }
  }

  /**
   * Initialize entity recognition maps
   */
  private initializeEntityMaps(): void {
    // Location keywords for fuzzy matching
    this.locationKeywords.set('HQ', ['hq', 'headquarters', 'main', 'head office'])
    this.locationKeywords.set('Yonge', ['yonge', 'yonge street'])
    this.locationKeywords.set('Bloor', ['bloor', 'bloor street'])
    this.locationKeywords.set('Kingston', ['kingston'])
    this.locationKeywords.set('The Well', ['well', 'the well'])
    this.locationKeywords.set('Broadway', ['broadway'])

    // Common item keywords
    this.itemKeywords.set('Coffee', ['coffee', 'espresso', 'americano'])
    this.itemKeywords.set('Latte', ['latte', 'cafe latte'])
    this.itemKeywords.set('Tea', ['tea', 'chai'])
  }

  /**
   * Get location keywords for fuzzy matching
   */
  private getLocationKeywords(locationName: string): string[] {
    for (const [key, keywords] of this.locationKeywords) {
      if (keywords.some(keyword =>
        locationName.toLowerCase().includes(keyword.toLowerCase()) ||
        key.toLowerCase().includes(locationName.toLowerCase())
      )) {
        return keywords
      }
    }
    return [locationName.toLowerCase()]
  }

  /**
   * Validation helpers
   */
  private validateInput(query: string): ValidationResult {
    const errors: string[] = []

    if (!query || typeof query !== 'string') {
      errors.push('Query must be a non-empty string')
    }

    if (query.length < VALIDATION_RULES.MIN_QUERY_LENGTH) {
      errors.push(`Query must be at least ${VALIDATION_RULES.MIN_QUERY_LENGTH} characters`)
    }

    if (query.length > VALIDATION_RULES.MAX_QUERY_LENGTH) {
      errors.push(`Query must be less than ${VALIDATION_RULES.MAX_QUERY_LENGTH} characters`)
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings: []
    }
  }

  private validateParameters(parameters: QueryParameters): ValidationResult {
    const errors: string[] = []

    if (parameters.locations.length > VALIDATION_RULES.MAX_LOCATIONS) {
      errors.push(`Too many locations specified (max ${VALIDATION_RULES.MAX_LOCATIONS})`)
    }

    if (parameters.items.length > VALIDATION_RULES.MAX_ITEMS) {
      errors.push(`Too many items specified (max ${VALIDATION_RULES.MAX_ITEMS})`)
    }

    if (parameters.metrics.length > VALIDATION_RULES.MAX_METRICS) {
      errors.push(`Too many metrics specified (max ${VALIDATION_RULES.MAX_METRICS})`)
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings: [],
      normalizedParameters: parameters
    }
  }

  private calculateConfidence(parameters: QueryParameters, originalQuery: string): number {
    let confidence = 0.7 // Base confidence

    // Increase confidence for specific entities
    if (parameters.locations.length > 0) confidence += 0.1
    if (parameters.items.length > 0) confidence += 0.1
    if (parameters.timeframe !== 'all_time') confidence += 0.1

    // Decrease confidence for complex queries
    if (parameters.groupBy.length > 2) confidence -= 0.1
    if (parameters.metrics.length > 3) confidence -= 0.1

    return Math.min(Math.max(confidence, 0), 1)
  }

  private isValidMetric(metric: string): boolean {
    const validMetrics = ['revenue', 'count', 'quantity', 'avg_transaction', 'avg_item_price', 'unique_items', 'market_share', 'growth_rate', 'efficiency']
    return validMetrics.includes(metric)
  }

  private isValidGroupBy(dimension: string): boolean {
    const validDimensions = ['location', 'item', 'category', 'date', 'month', 'week', 'hour', 'day_of_week']
    return validDimensions.includes(dimension)
  }

  private getDefaultLimit(analysisType: AnalysisType): number {
    switch (analysisType) {
      case 'ranking':
        return 10
      case 'simple_aggregate':
        return 1
      case 'grouped_analysis':
        return 100
      default:
        return 50
    }
  }
}

export const parameterExtractor = new ParameterExtractor()