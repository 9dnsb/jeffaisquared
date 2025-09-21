import prisma from '../../../lib/prisma'
import { logger } from '../utils/logger'
import type { Prisma } from '../../generated/prisma'

// Constants to avoid magic numbers
const MAX_RECORDS = 1000
const DEFAULT_LIMIT = 100
const DEFAULT_TOP_ITEMS_LIMIT = 20

// Query result wrapper with comprehensive metadata
export interface SafeQueryResult<T = unknown> {
  success: boolean
  data?: T
  error?: string
  metadata: {
    queryPlan: string
    processingTime: number
    recordCount?: number
    table: string
    operation: string
  }
}

// Filter types for business queries
interface DateRangeFilter {
  start: Date
  end: Date
}

interface SalesFilters {
  dateRange?: DateRangeFilter
  locationIds?: string[]
  itemNames?: string[]
  minAmount?: number
  maxAmount?: number
  limit?: number
}

interface LocationFilters {
  dateRange?: DateRangeFilter
  locationIds?: string[]
  itemNames?: string[]
}

interface ItemFilters {
  dateRange?: DateRangeFilter
  itemNames?: string[]
  limit?: number
}

/**
 * Type-safe Prisma query builder using Prisma's generated types
 * Eliminates type conflicts while maintaining full type safety
 */
class PrismaSafeQueryBuilder {
  private readonly maxRecords = MAX_RECORDS
  private readonly defaultLimit = DEFAULT_LIMIT
  private readonly defaultTopItemsLimit = DEFAULT_TOP_ITEMS_LIMIT

  /**
   * Serialize filters for logging
   */
  private serializeFilters(filters: unknown): Record<string, string | number | boolean | null> {
    if (!filters || typeof filters !== 'object') return {}

    const serialized: Record<string, string | number | boolean | null> = {}
    for (const [key, value] of Object.entries(filters as Record<string, unknown>)) {
      if (value === null || value === undefined) {
        serialized[key] = null
      } else if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        serialized[key] = value
      } else if (value instanceof Date) {
        serialized[key] = value.toISOString()
      } else if (Array.isArray(value)) {
        serialized[key] = value.join(', ')
      } else {
        serialized[key] = JSON.stringify(value)
      }
    }
    return serialized
  }

  /**
   * Execute safe query with comprehensive logging
   */
  private async executeWithLogging<T>(
    queryName: string,
    table: string,
    operation: string,
    queryFn: () => Promise<T>
  ): Promise<SafeQueryResult<T>> {
    const timer = logger.startTimer(`Safe Query: ${queryName}`)

    try {
      logger.prisma(`Executing ${queryName}`, undefined, {
        table,
        operation,
        queryName
      })

      const result = await queryFn()
      const duration = timer()

      const recordCount = Array.isArray(result) ? result.length : result ? 1 : 0

      logger.queryExecution(
        operation,
        queryName,
        undefined, // Don't log full results for performance
        {
          processingTime: duration,
          table,
          recordCount
        }
      )

      return {
        success: true,
        data: result,
        metadata: {
          queryPlan: queryName,
          processingTime: duration,
          recordCount,
          table,
          operation
        }
      }
    } catch (err) {
      const duration = timer()
      const error = err instanceof Error ? err : new Error('Unknown query error')

      logger.error(`Query execution failed: ${queryName}`, error, {
        processingTime: duration,
        table,
        operation
      })

      return {
        success: false,
        error: error.message,
        metadata: {
          queryPlan: queryName,
          processingTime: duration,
          table,
          operation
        }
      }
    }
  }

  /**
   * Get orders data with comprehensive filtering (updated for Square schema)
   */
  async getSalesData(filters?: SalesFilters): Promise<SafeQueryResult<Prisma.OrderGetPayload<{
    include: {
      location: true
      lineItems: {
        include: {
          item: true
        }
      }
    }
  }>[]>> {
    logger.data('Building orders query with filters', undefined, this.serializeFilters(filters))

    const where: Prisma.OrderWhereInput = {}

    // Build where clause with Prisma's type-safe operators
    if (filters?.dateRange) {
      where.date = {
        gte: filters.dateRange.start,
        lte: filters.dateRange.end
      }
    }

    if (filters?.locationIds && filters.locationIds.length > 0) {
      where.locationId = {
        in: filters.locationIds
      }
    }

    if (filters?.minAmount !== undefined || filters?.maxAmount !== undefined) {
      where.totalAmount = {}
      if (filters.minAmount !== undefined) {
        where.totalAmount.gte = Math.round(filters.minAmount * 100) // Convert dollars to cents
      }
      if (filters.maxAmount !== undefined) {
        where.totalAmount.lte = Math.round(filters.maxAmount * 100) // Convert dollars to cents
      }
    }

    // Add item filtering for orders data
    if (filters?.itemNames && filters.itemNames.length > 0) {
      where.lineItems = {
        some: {
          OR: [
            {
              name: {
                in: filters.itemNames
              }
            },
            {
              item: {
                name: {
                  in: filters.itemNames
                }
              }
            }
          ]
        }
      }
    }

    return this.executeWithLogging(
      'GET_ORDERS_DATA',
      'Order',
      'findMany',
      () => prisma.order.findMany({
        where,
        include: {
          location: true,
          lineItems: {
            include: {
              item: true
            }
          }
        },
        orderBy: { date: 'desc' },
        take: Math.min(filters?.limit || this.defaultLimit, this.maxRecords)
      })
    )
  }

  /**
   * Get orders summary with aggregations (updated for Square schema)
   */
  async getSalesSummary(filters?: LocationFilters): Promise<SafeQueryResult<Prisma.GetOrderAggregateType<{
    _count: true
    _sum: { totalAmount: true }
    _avg: { totalAmount: true }
    _max: { totalAmount: true }
    _min: { totalAmount: true }
  }>>> {
    logger.data('Building orders summary query', undefined, this.serializeFilters(filters))

    const where: Prisma.OrderWhereInput = {}

    if (filters?.dateRange) {
      where.date = {
        gte: filters.dateRange.start,
        lte: filters.dateRange.end
      }
    }

    if (filters?.locationIds && filters.locationIds.length > 0) {
      where.locationId = {
        in: filters.locationIds
      }
    }

    // Add item filtering - if specific items are requested, filter by those items
    if (filters?.itemNames && filters.itemNames.length > 0) {
      where.lineItems = {
        some: {
          OR: [
            {
              name: {
                in: filters.itemNames
              }
            },
            {
              item: {
                name: {
                  in: filters.itemNames
                }
              }
            }
          ]
        }
      }
    }

    return this.executeWithLogging(
      'GET_ORDERS_SUMMARY',
      'Order',
      'aggregate',
      () => prisma.order.aggregate({
        where,
        _count: true,
        _sum: { totalAmount: true },
        _avg: { totalAmount: true },
        _max: { totalAmount: true },
        _min: { totalAmount: true }
      })
    )
  }

  /**
   * Get top-selling items
   */
  async getTopItems(filters?: ItemFilters): Promise<SafeQueryResult<Prisma.LineItemGetPayload<{
    include: {
      item: true
      order: true
    }
  }>[]>> {
    logger.data('Building top items query', undefined, this.serializeFilters(filters))

    const where: Prisma.LineItemWhereInput = {}

    if (filters?.dateRange) {
      where.order = {
        date: {
          gte: filters.dateRange.start,
          lte: filters.dateRange.end
        }
      }
    }

    if (filters?.itemNames && filters.itemNames.length > 0) {
      where.item = {
        name: {
          in: filters.itemNames
        }
      }
    }

    return this.executeWithLogging(
      'GET_TOP_ITEMS',
      'LineItem',
      'findMany',
      () => prisma.lineItem.findMany({
        where,
        include: {
          item: true,
          order: true
        },
        orderBy: { quantity: 'desc' },
        take: Math.min(filters?.limit || this.defaultTopItemsLimit, this.maxRecords)
      })
    )
  }

  /**
   * Get location performance data
   */
  async getLocationPerformance(filters?: LocationFilters): Promise<SafeQueryResult<Prisma.OrderGetPayload<{
    include: {
      location: true
    }
  }>[]>> {
    logger.data('Building location performance query', undefined, this.serializeFilters(filters))

    const where: Prisma.OrderWhereInput = {}

    if (filters?.dateRange) {
      where.date = {
        gte: filters.dateRange.start,
        lte: filters.dateRange.end
      }
    }

    return this.executeWithLogging(
      'GET_LOCATION_PERFORMANCE',
      'Order',
      'findMany',
      () => prisma.order.findMany({
        where,
        include: {
          location: true
        },
        orderBy: { totalAmount: 'desc' }
      })
    )
  }

  /**
   * Get basic sales count
   */
  async getSalesCount(filters?: LocationFilters): Promise<SafeQueryResult<number>> {
    logger.data('Building sales count query', undefined, this.serializeFilters(filters))

    const where: Prisma.OrderWhereInput = {}

    if (filters?.dateRange) {
      where.date = {
        gte: filters.dateRange.start,
        lte: filters.dateRange.end
      }
    }

    if (filters?.locationIds && filters.locationIds.length > 0) {
      where.locationId = {
        in: filters.locationIds
      }
    }

    return this.executeWithLogging(
      'GET_SALES_COUNT',
      'Order',
      'count',
      () => prisma.order.count({ where })
    )
  }

  /**
   * Get all locations for filtering
   */
  async getLocations(): Promise<SafeQueryResult<Prisma.LocationGetPayload<object>[]>> {
    return this.executeWithLogging(
      'GET_LOCATIONS',
      'Location',
      'findMany',
      () => prisma.location.findMany({
        orderBy: { name: 'asc' }
      })
    )
  }

  /**
   * Get all items for filtering
   */
  async getItems(): Promise<SafeQueryResult<Prisma.ItemGetPayload<object>[]>> {
    return this.executeWithLogging(
      'GET_ITEMS',
      'Item',
      'findMany',
      () => prisma.item.findMany({
        orderBy: { name: 'asc' }
      })
    )
  }
}

// Export singleton instance
export const prismaSafeQueryBuilder = new PrismaSafeQueryBuilder()

// Export types for external use
export type { SalesFilters, LocationFilters, ItemFilters, DateRangeFilter }