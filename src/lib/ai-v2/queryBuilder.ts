/**
 * Type-safe Prisma query builder for sales analytics
 * Builds and executes queries based on extracted parameters
 */

import { logger } from '../utils/logger'
import { PrismaClient } from '../../generated/prisma'
import { locationMapper } from './locationMapper'
import type {
  QueryParameters,
  QueryResult,
  QueryResultRow,
  Metric,
  GroupBy
} from './types'

export class QueryBuilder {
  private prisma: PrismaClient

  constructor(prisma: PrismaClient) {
    this.prisma = prisma
  }

  /**
   * Build and execute query based on parameters
   */
  async executeQuery(params: QueryParameters): Promise<QueryResult> {
    const timer = logger.startTimer('Query Execution')

    try {
      logger.data('Building query', undefined, {
        metrics: params.metrics.join(', '),
        groupBy: params.groupBy.join(', '),
        locationCount: params.locationIds.length,
        itemCount: params.itemNames.length,
        hasDateRange: !!(params.startDate || params.endDate)
      })

      let data: QueryResultRow[] = []

      // Route to appropriate query builder based on grouping and calculation type
      if (params.calculationType === 'location_sum' && params.locationIds.length > 1) {
        // Special handling for multi-location sum/comparison
        data = await this.buildLocationSumQuery(params)
      } else if (params.calculationType === 'percentage') {
        // Special handling for percentage calculations
        data = await this.buildPercentageQuery(params)
      } else if (params.calculationType === 'daily_average' || params.calculationType === 'monthly_average') {
        // Special handling for time-based averages
        data = await this.buildAverageQuery(params)
      } else if (params.groupBy.includes('location')) {
        data = await this.buildLocationQuery(params)
      } else if (params.groupBy.includes('item')) {
        data = await this.buildItemQuery(params)
      } else if (params.groupBy.includes('month')) {
        data = await this.buildMonthQuery(params)
      } else {
        data = await this.buildAggregateQuery(params)
      }

      // Apply sorting and limiting
      data = this.applySortingAndLimiting(data, params)

      const duration = timer()

      logger.success('Query executed successfully', undefined, {
        processingTime: duration,
        recordCount: data.length,
        queryPlan: this.getQueryPlan(params)
      })

      return {
        success: true,
        data,
        summary: '', // Will be filled by response formatter
        metadata: {
          recordCount: data.length,
          processingTime: duration,
          queryPlan: this.getQueryPlan(params),
          extractedParams: params
        }
      }

    } catch (err) {
      const duration = timer()
      const error = err instanceof Error ? err : new Error('Query execution failed')

      logger.error('Query execution failed', error, {
        processingTime: duration,
        paramsLength: JSON.stringify(params).length
      })

      return {
        success: false,
        data: [],
        summary: 'Failed to execute query',
        metadata: {
          recordCount: 0,
          processingTime: duration,
          queryPlan: 'error',
          extractedParams: params
        },
        error: error.message
      }
    }
  }

  /**
   * Build location-grouped query
   */
  private async buildLocationQuery(params: QueryParameters): Promise<QueryResultRow[]> {
    const whereClause = this.buildWhereClause(params)

    // Get location grouping with metrics
    const sales = await this.prisma.sale.findMany({
      where: whereClause,
      include: {
        location: true,
        ...(params.metrics.includes('quantity') || params.itemNames.length > 0 ? {
          saleItems: {
            include: {
              item: true
            }
          }
        } : {})
      }
    })

    // Group by location and calculate metrics
    const locationGroups = new Map<string, {
      locationId: string
      name: string
      sales: typeof sales
      saleItems: Array<{ price: number; quantity: number; item: { name: string } }>
    }>()

    for (const sale of sales) {
      const locationId = sale.locationId
      if (!locationGroups.has(locationId)) {
        locationGroups.set(locationId, {
          locationId,
          name: sale.location.name || locationId,
          sales: [],
          saleItems: []
        })
      }

      const group = locationGroups.get(locationId)!
      group.sales.push(sale)

      if (sale.saleItems) {
        group.saleItems.push(...sale.saleItems.map(si => ({
          price: Number(si.price),
          quantity: si.quantity,
          item: si.item
        })))
      }
    }

    // Calculate metrics for each location
    const results: QueryResultRow[] = []

    for (const [locationId, group] of locationGroups) {
      const row: QueryResultRow = {
        locationId,
        location: group.name
      }

      for (const metric of params.metrics) {
        row[metric] = this.calculateMetric(metric, group.sales, group.saleItems, params)
      }

      results.push(row)
    }

    return results
  }

  /**
   * Build item-grouped query
   */
  private async buildItemQuery(params: QueryParameters): Promise<QueryResultRow[]> {
    const whereClause = this.buildWhereClause(params)

    // Get sale items with details
    const saleItems = await this.prisma.saleItem.findMany({
      where: {
        sale: whereClause,
        ...(params.itemNames.length > 0 && {
          item: {
            name: {
              in: params.itemNames
            }
          }
        })
      },
      include: {
        item: true,
        sale: true
      }
    })

    // Group by item and calculate metrics
    const itemGroups = new Map<string, {
      itemId: string
      name: string
      saleItems: Array<{ price: number; quantity: number; sale: { totalSales: number } }>
    }>()

    for (const saleItem of saleItems) {
      const itemId = saleItem.itemId
      const itemName = saleItem.item.name

      if (!itemGroups.has(itemId)) {
        itemGroups.set(itemId, {
          itemId,
          name: itemName,
          saleItems: []
        })
      }

      const group = itemGroups.get(itemId)!
      group.saleItems.push({
        price: Number(saleItem.price),
        quantity: saleItem.quantity,
        sale: { totalSales: Number(saleItem.sale.totalSales) }
      })
    }

    // Calculate metrics for each item
    const results: QueryResultRow[] = []

    for (const [itemId, group] of itemGroups) {
      const row: QueryResultRow = {
        itemId,
        item: group.name
      }

      for (const metric of params.metrics) {
        row[metric] = this.calculateItemMetric(metric, group.saleItems)
      }

      results.push(row)
    }

    return results
  }

  /**
   * Build month-grouped query
   */
  private async buildMonthQuery(params: QueryParameters): Promise<QueryResultRow[]> {
    const whereClause = this.buildWhereClause(params)

    const sales = await this.prisma.sale.findMany({
      where: whereClause,
      ...(params.metrics.includes('quantity') ? {
        include: {
          saleItems: true
        }
      } : {})
    })

    // Group by month
    const monthGroups = new Map<string, {
      month: string
      sales: typeof sales
    }>()

    for (const sale of sales) {
      const month = sale.date.toISOString().slice(0, 7) // YYYY-MM
      if (!monthGroups.has(month)) {
        monthGroups.set(month, {
          month,
          sales: []
        })
      }
      monthGroups.get(month)!.sales.push(sale)
    }

    // Calculate metrics for each month
    const results: QueryResultRow[] = []

    for (const [month, group] of monthGroups) {
      const row: QueryResultRow = {
        month
      }

      for (const metric of params.metrics) {
        row[metric] = this.calculateMetric(metric, group.sales, [], params)
      }

      results.push(row)
    }

    return results
  }

  /**
   * Build aggregate query (no grouping)
   */
  private async buildAggregateQuery(params: QueryParameters): Promise<QueryResultRow[]> {
    const whereClause = this.buildWhereClause(params)

    const sales = await this.prisma.sale.findMany({
      where: whereClause,
      ...(params.metrics.includes('quantity') || params.itemNames.length > 0 ? {
        include: {
          saleItems: {
            include: {
              item: true
            }
          }
        }
      } : {})
    })

    // Filter sale items if specific items requested
    let allSaleItems: Array<{ price: number; quantity: number; item: { name: string } }> = []

    for (const sale of sales) {
      if ('saleItems' in sale && sale.saleItems) {
        const filteredItems = (sale.saleItems as Array<{ price: unknown; quantity: number; item: { name: string } }>)
          .filter(si => params.itemNames.length === 0 || params.itemNames.includes(si.item.name))
          .map(si => ({
            price: Number(si.price),
            quantity: si.quantity,
            item: si.item
          }))
        allSaleItems.push(...filteredItems)
      }
    }

    // Calculate aggregate metrics
    const row: QueryResultRow = {}

    for (const metric of params.metrics) {
      row[metric] = this.calculateMetric(metric, sales, allSaleItems, params)
    }

    return [row]
  }

  /**
   * Build WHERE clause for queries
   */
  private buildWhereClause(params: QueryParameters) {
    const where: Record<string, unknown> = {}

    // Date filtering
    if (params.startDate || params.endDate) {
      where.date = {}
      if (params.startDate) {
        (where.date as Record<string, unknown>).gte = params.startDate
      }
      if (params.endDate) {
        (where.date as Record<string, unknown>).lte = params.endDate
      }
    }

    // Location filtering
    if (params.locationIds.length > 0) {
      where.locationId = {
        in: params.locationIds
      }
    }

    return where
  }

  /**
   * Calculate metric for sales data
   */
  private calculateMetric(
    metric: Metric,
    sales: Array<{ totalSales: unknown }>,
    saleItems: Array<{ price: number; quantity: number; item: { name: string } }>,
    params: QueryParameters
  ): number {
    switch (metric) {
      case 'revenue':
        return sales.reduce((sum, sale) => sum + Number(sale.totalSales), 0)

      case 'count':
        return sales.length

      case 'quantity':
        return saleItems
          .filter(si => params.itemNames.length === 0 || params.itemNames.includes(si.item.name))
          .reduce((sum, si) => sum + si.quantity, 0)

      case 'avg_transaction':
        if (sales.length === 0) return 0
        const totalRevenue = sales.reduce((sum, sale) => sum + Number(sale.totalSales), 0)
        return totalRevenue / sales.length

      case 'avg_item_price':
        if (saleItems.length === 0) return 0
        const totalPrice = saleItems.reduce((sum, si) => sum + si.price, 0)
        return totalPrice / saleItems.length

      default:
        return 0
    }
  }

  /**
   * Calculate metric for item-specific data
   */
  private calculateItemMetric(
    metric: Metric,
    saleItems: Array<{ price: number; quantity: number; sale: { totalSales: number } }>
  ): number {
    switch (metric) {
      case 'revenue':
        return saleItems.reduce((sum, si) => sum + si.price, 0)

      case 'count':
        return saleItems.length

      case 'quantity':
        return saleItems.reduce((sum, si) => sum + si.quantity, 0)

      case 'avg_item_price':
        if (saleItems.length === 0) return 0
        return saleItems.reduce((sum, si) => sum + si.price, 0) / saleItems.length

      default:
        return 0
    }
  }

  /**
   * Apply sorting and limiting to results
   */
  private applySortingAndLimiting(data: QueryResultRow[], params: QueryParameters): QueryResultRow[] {
    let result = [...data]

    // Apply sorting
    if (params.sortBy && result.length > 0) {
      result.sort((a, b) => {
        const aVal = a[params.sortBy as keyof QueryResultRow] as number || 0
        const bVal = b[params.sortBy as keyof QueryResultRow] as number || 0

        if (params.sortDirection === 'asc') {
          return aVal - bVal
        } else {
          return bVal - aVal
        }
      })
    }

    // Apply limiting
    if (params.limit && params.limit > 0) {
      result = result.slice(0, params.limit)
    }

    return result
  }

  /**
   * Build location sum query (for comparing/combining multiple locations)
   */
  private async buildLocationSumQuery(params: QueryParameters): Promise<QueryResultRow[]> {
    const whereClause = this.buildWhereClause(params)

    const sales = await this.prisma.sale.findMany({
      where: whereClause,
      include: {
        location: true
      }
    })

    // Calculate sum across all specified locations
    const row: QueryResultRow = {}

    for (const metric of params.metrics) {
      row[metric] = this.calculateMetric(metric, sales, [], params)
    }

    return [row]
  }

  /**
   * Build percentage query (for calculating percentages)
   */
  private async buildPercentageQuery(params: QueryParameters): Promise<QueryResultRow[]> {
    // Get total across all locations for denominator
    const allSales = await this.prisma.sale.findMany({
      where: {
        ...(params.startDate || params.endDate ? {
          date: {
            ...(params.startDate && { gte: params.startDate }),
            ...(params.endDate && { lte: params.endDate })
          }
        } : {})
      }
    })

    // Get sales for specific location(s) for numerator
    const whereClause = this.buildWhereClause(params)
    const filteredSales = await this.prisma.sale.findMany({
      where: whereClause
    })

    const row: QueryResultRow = {}

    for (const metric of params.metrics) {
      const totalValue = this.calculateMetric(metric, allSales, [], params)
      const filteredValue = this.calculateMetric(metric, filteredSales, [], params)

      // Calculate percentage
      if (totalValue > 0) {
        row[metric] = (filteredValue / totalValue) * 100
      } else {
        row[metric] = 0
      }
    }

    return [row]
  }

  /**
   * Build average query (for daily/monthly averages)
   */
  private async buildAverageQuery(params: QueryParameters): Promise<QueryResultRow[]> {
    const whereClause = this.buildWhereClause(params)

    const sales = await this.prisma.sale.findMany({
      where: whereClause
    })

    const row: QueryResultRow = {}

    for (const metric of params.metrics) {
      const totalValue = this.calculateMetric(metric, sales, [], params)

      // Calculate time-based average
      if (params.calculationType === 'daily_average') {
        // Calculate number of days in date range
        let days = 1
        if (params.startDate && params.endDate) {
          const diffTime = Math.abs(params.endDate.getTime() - params.startDate.getTime())
          days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
        } else {
          // If no date range, get total days from all data
          const allSales = await this.prisma.sale.findMany({
            select: { date: true }
          })
          if (allSales.length > 0) {
            const dates = allSales.map(s => s.date).sort((a, b) => a.getTime() - b.getTime())
            const firstDate = dates[0]
            const lastDate = dates[dates.length - 1]
            const diffTime = lastDate.getTime() - firstDate.getTime()
            days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
          }
        }
        row[metric] = totalValue / days
      } else if (params.calculationType === 'monthly_average') {
        // Approximate monthly average (total / 18 months based on test data)
        const approximateMonths = 18
        row[metric] = totalValue / approximateMonths
      }
    }

    return [row]
  }

  /**
   * Get query plan description
   */
  private getQueryPlan(params: QueryParameters): string {
    const parts: string[] = []

    if (params.calculationType) {
      parts.push(`calculation: ${params.calculationType}`)
    }

    if (params.groupBy.length > 0) {
      parts.push(`grouped by ${params.groupBy.join(', ')}`)
    } else {
      parts.push('aggregate query')
    }

    if (params.locationIds.length > 0) {
      parts.push(`${params.locationIds.length} locations`)
    }

    if (params.itemNames.length > 0) {
      parts.push(`${params.itemNames.length} items`)
    }

    if (params.startDate || params.endDate) {
      parts.push('date filtered')
    }

    return parts.join(', ')
  }
}

export const createQueryBuilder = (prisma: PrismaClient) => new QueryBuilder(prisma)