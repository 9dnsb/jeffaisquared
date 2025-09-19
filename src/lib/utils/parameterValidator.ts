import { z } from 'zod'
import { logger } from './logger'
import { DateParser } from './dateParser'
import type {
  QueryParameters,
  ValidationResult
} from '../types/dynamicQuery'
import {
  QueryParametersSchema,
  LOCATION_IDS,
  LOCATION_KEYWORDS,
  createFallbackParameters
} from '../types/dynamicQuery'
import prisma from '../../../lib/prisma'

/**
 * Validates and repairs AI-extracted query parameters
 * Provides fallback strategies for invalid or incomplete parameters
 */
export class ParameterValidator {

  /**
   * Main validation entry point
   */
  static async validate(aiResponse: unknown, originalUserMessage?: string): Promise<ValidationResult<QueryParameters>> {
    const timer = logger.startTimer('Parameter Validation')

    try {
      logger.data('Validating AI parameters', undefined, {
        hasOriginalMessage: !!originalUserMessage,
        responseType: typeof aiResponse
      })

      // Primary validation with Zod
      const zodValidation = this.validateWithZod(aiResponse)
      if (zodValidation.success && zodValidation.data) {
        const businessValidation = await this.validateBusinessRules(zodValidation.data)
        if (businessValidation.valid) {
          const duration = timer()
          logger.success('Parameter validation passed', undefined, {
            processingTime: duration
          })
          return { success: true, data: zodValidation.data }
        } else {
          logger.warn('Business rule validation failed', undefined, {
            error: businessValidation.error ? new Error(businessValidation.error) : undefined
          })
        }
      }

      // Attempt parameter repair
      logger.data('Attempting parameter repair')
      const repaired = await this.attemptRepair(aiResponse, originalUserMessage)

      if (repaired) {
        // Recursive validation of repaired parameters
        const repairedValidation = await this.validate(repaired)
        if (repairedValidation.success) {
          const duration = timer()
          logger.success('Parameter repair successful', undefined, {
            processingTime: duration
          })
          return { ...repairedValidation, repairAttempted: true }
        }
      }

      // Create safe fallback
      const fallback = createFallbackParameters(aiResponse)
      const duration = timer()

      logger.warn('Using fallback parameters', undefined, {
        processingTime: duration,
        originalError: zodValidation.error || 'Validation failed'
      })

      return {
        success: false,
        error: zodValidation.error || 'Parameter validation failed',
        fallback,
        repairAttempted: !!repaired
      }

    } catch (err) {
      const duration = timer()
      const error = err instanceof Error ? err : new Error('Unknown validation error')

      logger.error('Parameter validation exception', error, {
        processingTime: duration
      })

      return {
        success: false,
        error: error.message,
        fallback: createFallbackParameters(aiResponse)
      }
    }
  }

  /**
   * Validate with Zod schema
   */
  private static validateWithZod(input: unknown): ValidationResult<QueryParameters> {
    try {
      const validated = QueryParametersSchema.parse(input)
      return { success: true, data: validated }
    } catch (err) {
      if (err instanceof z.ZodError) {
        const errorMessage = err.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
        return { success: false, error: errorMessage }
      }
      return { success: false, error: 'Unknown Zod validation error' }
    }
  }

  /**
   * Validate business rules beyond schema validation
   */
  private static async validateBusinessRules(params: QueryParameters): Promise<{ valid: boolean; error?: string }> {
    // Check date ranges are valid
    for (const dateRange of params.dateRanges) {
      if (dateRange.start >= dateRange.end) {
        return { valid: false, error: `Invalid date range: ${dateRange.period} - start must be before end` }
      }

      // Check for reasonable date ranges (not too far in past/future)
      const now = new Date()
      const tenYearsAgo = new Date(now.getFullYear() - 10, 0, 1)
      const oneYearFromNow = new Date(now.getFullYear() + 1, 11, 31)

      if (dateRange.start < tenYearsAgo || dateRange.end > oneYearFromNow) {
        return { valid: false, error: `Date range ${dateRange.period} is outside reasonable bounds` }
      }
    }

    // Validate location IDs exist
    if (params.locationIds.length > 0) {
      for (const locationId of params.locationIds) {
        if (!LOCATION_IDS.includes(locationId as any)) {
          return { valid: false, error: `Invalid location ID: ${locationId}` }
        }
      }
    }

    // Validate items exist (if specified)
    if (params.items.length > 0) {
      try {
        const existingItems = await prisma.item.findMany({
          where: { name: { in: params.items } },
          select: { name: true }
        })

        const existingItemNames = existingItems.map(item => item.name)
        const invalidItems = params.items.filter(item => !existingItemNames.includes(item))

        if (invalidItems.length > 0) {
          logger.warn('Some requested items not found in database', undefined, {
            invalidItems: invalidItems.join(', '),
            validItems: existingItemNames.join(', ')
          })
          // Don't fail validation - just log warning
        }
      } catch (err) {
        logger.warn('Could not validate items against database', undefined, {
          error: err instanceof Error ? err : undefined
        })
      }
    }

    // Validate metric combinations make sense
    if (params.metrics.includes('items_per_sale') && !params.metrics.includes('count')) {
      // items_per_sale requires count to calculate properly
      params.metrics.push('count')
    }

    return { valid: true }
  }

  /**
   * Attempt to repair common AI extraction errors
   */
  private static async attemptRepair(invalid: unknown, originalUserMessage?: string): Promise<QueryParameters | null> {
    try {
      logger.data('Attempting parameter repair')

      // Start with the invalid input
      const repaired = { ...(invalid as object) } as any

      // Common repair operations
      await this.repairDateRanges(repaired, originalUserMessage)
      this.repairLocationIds(repaired, originalUserMessage)
      await this.repairItems(repaired, originalUserMessage)
      this.repairMetrics(repaired)
      this.repairGroupBy(repaired)
      this.addMissingRequiredFields(repaired)

      // Validate the repaired object
      const validation = this.validateWithZod(repaired)
      return validation.success ? validation.data! : null

    } catch (err) {
      logger.warn('Parameter repair failed', undefined, {
        error: err instanceof Error ? err : undefined
      })
      return null
    }
  }

  /**
   * Repair date ranges using DateParser
   */
  private static async repairDateRanges(repaired: any, originalUserMessage?: string): Promise<void> {
    // If AI provided raw date strings or invalid dates, try to parse them
    if (repaired.extractedDates && Array.isArray(repaired.extractedDates)) {
      const dateRanges = []
      for (const dateStr of repaired.extractedDates) {
        const parsed = DateParser.parseNaturalLanguage(dateStr)
        dateRanges.push(...parsed)
      }
      if (dateRanges.length > 0) {
        repaired.dateRanges = dateRanges
      }
    }

    // If no date ranges but we have original message, try parsing it
    if ((!repaired.dateRanges || repaired.dateRanges.length === 0) && originalUserMessage) {
      const parsed = DateParser.parseNaturalLanguage(originalUserMessage)
      if (parsed.length > 0) {
        repaired.dateRanges = parsed
      }
    }

    // If still no date ranges, default to last 30 days
    if (!repaired.dateRanges || repaired.dateRanges.length === 0) {
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      repaired.dateRanges = [{
        period: 'last_30_days',
        start: thirtyDaysAgo,
        end: new Date()
      }]
    }

    // Convert date strings to Date objects if needed
    if (repaired.dateRanges) {
      repaired.dateRanges = repaired.dateRanges.map((range: any) => ({
        ...range,
        start: range.start instanceof Date ? range.start : new Date(range.start),
        end: range.end instanceof Date ? range.end : new Date(range.end)
      }))
    }
  }

  /**
   * Repair location IDs from location names or keywords
   */
  private static repairLocationIds(repaired: any, originalUserMessage?: string): void {
    // If AI provided location names instead of IDs
    if (repaired.locations && Array.isArray(repaired.locations)) {
      repaired.locationIds = this.convertLocationNamesToIds(repaired.locations)
      delete repaired.locations
    }

    // If AI provided extractedLocations, convert them
    if (repaired.extractedLocations && Array.isArray(repaired.extractedLocations)) {
      repaired.locationIds = this.convertLocationNamesToIds(repaired.extractedLocations)
    }

    // If no locations found but original message contains location keywords
    if ((!repaired.locationIds || repaired.locationIds.length === 0) && originalUserMessage) {
      const extractedFromMessage = this.extractLocationIdsFromMessage(originalUserMessage)
      if (extractedFromMessage.length > 0) {
        repaired.locationIds = extractedFromMessage
      }
    }

    // Ensure locationIds is an array
    if (!repaired.locationIds) {
      repaired.locationIds = []
    }
  }

  /**
   * Convert location names/keywords to location IDs
   */
  private static convertLocationNamesToIds(locationNames: string[]): string[] {
    const locationIds: string[] = []

    for (const name of locationNames) {
      const nameLower = name.toLowerCase().trim()

      // Check against keywords for each location
      for (const [locationId, keywords] of Object.entries(LOCATION_KEYWORDS)) {
        if (keywords.some(keyword => nameLower.includes(keyword) || keyword.includes(nameLower))) {
          if (!locationIds.includes(locationId)) {
            locationIds.push(locationId)
          }
          break
        }
      }
    }

    return locationIds
  }

  /**
   * Extract location IDs from user message
   */
  private static extractLocationIdsFromMessage(message: string): string[] {
    const messageLower = message.toLowerCase()
    const locationIds: string[] = []

    for (const [locationId, keywords] of Object.entries(LOCATION_KEYWORDS)) {
      if (keywords.some(keyword => messageLower.includes(keyword))) {
        locationIds.push(locationId)
      }
    }

    return locationIds
  }

  /**
   * Repair item names by checking against database
   */
  private static async repairItems(repaired: any, originalUserMessage?: string): Promise<void> {
    // If AI provided extractedItems, use them
    if (repaired.extractedItems && Array.isArray(repaired.extractedItems)) {
      repaired.items = repaired.extractedItems
    }

    // If no items but original message mentions item names
    if ((!repaired.items || repaired.items.length === 0) && originalUserMessage) {
      try {
        const allItems = await prisma.item.findMany({ select: { name: true } })
        const messageLower = originalUserMessage.toLowerCase()

        const foundItems = allItems
          .filter(item => messageLower.includes(item.name.toLowerCase()))
          .map(item => item.name)

        if (foundItems.length > 0) {
          repaired.items = foundItems
        }
      } catch (err) {
        logger.warn('Could not repair items from database', undefined, {
          error: err instanceof Error ? err : undefined
        })
      }
    }

    // Ensure items is an array
    if (!repaired.items) {
      repaired.items = []
    }
  }

  /**
   * Repair metrics array
   */
  private static repairMetrics(repaired: any): void {
    // If no metrics specified, default to revenue and count
    if (!repaired.metrics || !Array.isArray(repaired.metrics) || repaired.metrics.length === 0) {
      repaired.metrics = ['revenue', 'count']
    }

    // Validate each metric
    const validMetrics = ['revenue', 'quantity', 'count', 'avg_transaction', 'items_per_sale', 'avg_item_price', 'unique_items']
    repaired.metrics = repaired.metrics.filter((metric: string) => validMetrics.includes(metric))

    // Ensure at least one metric
    if (repaired.metrics.length === 0) {
      repaired.metrics = ['revenue']
    }
  }

  /**
   * Repair groupBy array
   */
  private static repairGroupBy(repaired: any): void {
    // Ensure groupBy is an array
    if (!repaired.groupBy || !Array.isArray(repaired.groupBy)) {
      repaired.groupBy = []
    }

    // Validate each groupBy dimension
    const validGroupBy = ['location', 'item', 'day', 'week', 'month', 'quarter', 'year', 'day_of_week', 'hour']
    repaired.groupBy = repaired.groupBy.filter((group: string) => validGroupBy.includes(group))
  }

  /**
   * Add missing required fields with defaults
   */
  private static addMissingRequiredFields(repaired: any): void {
    // Ensure aggregation is set
    if (!repaired.aggregation) {
      repaired.aggregation = 'sum'
    }

    // Ensure valid aggregation method
    const validAggregations = ['sum', 'avg', 'count', 'max', 'min']
    if (!validAggregations.includes(repaired.aggregation)) {
      repaired.aggregation = 'sum'
    }
  }
}