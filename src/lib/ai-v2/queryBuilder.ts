/**
 * Type-safe Prisma query builder for sales analytics
 * Updated for Square Order/LineItem schema
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
   * Build location-grouped query using Order/LineItem schema
   */
  private async buildLocationQuery(params: QueryParameters): Promise<QueryResultRow[]> {
    const whereClause = this.buildWhereClause(params)

    // Get orders with line items grouped by location
    const orders = await this.prisma.order.findMany({
      where: whereClause,
      include: {
        location: true,
        lineItems: {
          include: {
            item: true
          }
        }
      }
    })

    // Group by location and calculate metrics
    const locationGroups = new Map<string, {
      locationId: string
      name: string
      orders: typeof orders
      lineItems: Array<{
        unitPriceAmount: number
        totalPriceAmount: number
        quantity: number
        name: string
        item?: { name: string } | null
      }>
    }>()

    for (const order of orders) {
      const locationId = order.locationId
      if (!locationGroups.has(locationId)) {
        locationGroups.set(locationId, {
          locationId,
          name: order.location.name || locationId,
          orders: [],
          lineItems: []
        })
      }

      const group = locationGroups.get(locationId)!
      group.orders.push(order)

      // Add line items with price in dollars (convert from cents)
      group.lineItems.push(...order.lineItems.map(li => ({
        unitPriceAmount: li.unitPriceAmount / 100, // Convert cents to dollars
        totalPriceAmount: li.totalPriceAmount / 100, // Convert cents to dollars
        quantity: li.quantity,
        name: li.name,
        item: li.item
      })))
    }

    // Calculate metrics for each location
    const results: QueryResultRow[] = []

    for (const [locationId, group] of locationGroups) {
      const row: QueryResultRow = {
        locationId,
        location: group.name
      }

      for (const metric of params.metrics) {
        row[metric] = this.calculateMetric(metric, group.orders, group.lineItems, params)
      }

      results.push(row)
    }

    return results
  }

  /**
   * Build item-grouped query using LineItem schema
   */
  private async buildItemQuery(params: QueryParameters): Promise<QueryResultRow[]> {
    const whereClause = this.buildOrderWhereClause(params)

    // Get line items with order details
    const lineItems = await this.prisma.lineItem.findMany({
      where: {
        order: whereClause,
        ...(params.itemNames.length > 0 && {
          OR: [
            {
              name: {
                in: params.itemNames
              }
            },
            {
              item: {
                name: {
                  in: params.itemNames
                }
              }
            }
          ]
        })
      },
      include: {
        item: true,
        order: {
          include: {
            location: true
          }
        }
      }
    })

    // Group by item and calculate metrics
    const itemGroups = new Map<string, {
      itemName: string
      lineItems: Array<{
        unitPriceAmount: number
        totalPriceAmount: number
        quantity: number
        order: { totalAmount: number }
      }>
    }>()

    for (const lineItem of lineItems) {
      const itemName = lineItem.item?.name || lineItem.name
      if (!itemGroups.has(itemName)) {
        itemGroups.set(itemName, {
          itemName,
          lineItems: []
        })
      }

      const group = itemGroups.get(itemName)!
      group.lineItems.push({
        unitPriceAmount: lineItem.unitPriceAmount / 100, // Convert cents to dollars
        totalPriceAmount: lineItem.totalPriceAmount / 100, // Convert cents to dollars
        quantity: lineItem.quantity,
        order: { totalAmount: lineItem.order.totalAmount / 100 } // Convert cents to dollars
      })
    }

    // Calculate metrics for each item
    const results: QueryResultRow[] = []

    for (const [itemName, group] of itemGroups) {
      const row: QueryResultRow = {
        item: itemName
      }

      for (const metric of params.metrics) {
        row[metric] = this.calculateItemMetric(metric, group.lineItems, params)
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

    const orders = await this.prisma.order.findMany({
      where: whereClause,
      include: {
        lineItems: true
      }
    })

    // Group by month
    const monthGroups = new Map<string, {
      month: string
      orders: typeof orders
      lineItems: Array<{ totalPriceAmount: number; quantity: number }>
    }>()

    for (const order of orders) {
      const month = order.date.toISOString().substring(0, 7) // YYYY-MM format
      if (!monthGroups.has(month)) {
        monthGroups.set(month, {
          month,
          orders: [],
          lineItems: []
        })
      }

      const group = monthGroups.get(month)!
      group.orders.push(order)
      group.lineItems.push(...order.lineItems.map(li => ({
        totalPriceAmount: li.totalPriceAmount / 100, // Convert cents to dollars
        quantity: li.quantity
      })))
    }

    // Calculate metrics for each month
    const results: QueryResultRow[] = []

    for (const [month, group] of monthGroups) {
      const row: QueryResultRow = {
        month
      }

      for (const metric of params.metrics) {
        row[metric] = this.calculateMetric(metric, group.orders, group.lineItems, params)
      }

      results.push(row)
    }

    return results.sort((a, b) => (a.month || '').localeCompare(b.month || ''))
  }

  /**
   * Build aggregate query (no grouping)
   */
  private async buildAggregateQuery(params: QueryParameters): Promise<QueryResultRow[]> {
    const whereClause = this.buildWhereClause(params)

    const orders = await this.prisma.order.findMany({
      where: whereClause,
      include: {
        lineItems: true
      }
    })

    const allLineItems = orders.flatMap(order =>
      order.lineItems.map(li => ({
        totalPriceAmount: li.totalPriceAmount / 100, // Convert cents to dollars
        quantity: li.quantity
      }))
    )

    const row: QueryResultRow = {}

    for (const metric of params.metrics) {
      row[metric] = this.calculateMetric(metric, orders, allLineItems, params)
    }

    return [row]
  }

  /**
   * Build location sum query for multi-location comparisons
   */
  private async buildLocationSumQuery(params: QueryParameters): Promise<QueryResultRow[]> {
    // Similar to buildLocationQuery but with sum aggregation
    return this.buildLocationQuery(params)
  }

  /**
   * Build percentage query
   */
  private async buildPercentageQuery(params: QueryParameters): Promise<QueryResultRow[]> {
    // Get base data and calculate percentages
    const baseData = await this.buildLocationQuery(params)

    // Calculate percentages if we have revenue data
    if (params.metrics.includes('revenue')) {
      const totalRevenue = baseData.reduce((sum, row) => sum + (Number(row.revenue) || 0), 0)

      return baseData.map(row => ({
        ...row,
        percentage: totalRevenue > 0 ? ((Number(row.revenue) || 0) / totalRevenue * 100) : 0
      }))
    }

    return baseData
  }

  /**
   * Build average query (daily/monthly averages)
   */
  private async buildAverageQuery(params: QueryParameters): Promise<QueryResultRow[]> {
    const monthData = await this.buildMonthQuery(params)

    if (params.calculationType === 'daily_average') {
      // Convert monthly to daily averages (assuming 30 days per month)
      return monthData.map(row => ({
        ...row,
        revenue: (Number(row.revenue) || 0) / 30,
        quantity: (Number(row.quantity) || 0) / 30
      }))
    }

    return monthData
  }

  /**
   * Build where clause for orders
   */
  private buildWhereClause(params: QueryParameters): any {
    const where: any = {}

    // Date range filter
    if (params.startDate || params.endDate) {
      where.date = {}
      if (params.startDate) {
        where.date.gte = params.startDate
      }
      if (params.endDate) {
        where.date.lte = params.endDate
      }
    }

    // Location filter
    if (params.locationIds.length > 0) {
      where.locationId = {
        in: params.locationIds
      }
    }

    return where
  }

  /**
   * Build where clause specifically for order queries
   */
  private buildOrderWhereClause(params: QueryParameters): any {
    return this.buildWhereClause(params)
  }

  /**
   * Calculate metric for orders and line items
   */
  private calculateMetric(
    metric: Metric,
    orders: any[],
    lineItems: Array<{ totalPriceAmount: number; quantity: number }>,
    params: QueryParameters
  ): number {
    switch (metric) {
      case 'revenue':
        return orders.reduce((sum, order) => sum + (order.totalAmount / 100), 0) // Convert cents to dollars
      case 'quantity':
        return lineItems.reduce((sum, item) => sum + item.quantity, 0)
      case 'transaction_count':
        return orders.length
      case 'average_order_value':
        const totalRevenue = orders.reduce((sum, order) => sum + (order.totalAmount / 100), 0)
        return orders.length > 0 ? totalRevenue / orders.length : 0
      default:
        return 0
    }
  }

  /**
   * Calculate metric specifically for line items
   */
  private calculateItemMetric(
    metric: Metric,
    lineItems: Array<{ totalPriceAmount: number; quantity: number }>,
    params: QueryParameters
  ): number {
    switch (metric) {
      case 'revenue':
        return lineItems.reduce((sum, item) => sum + item.totalPriceAmount, 0)
      case 'quantity':
        return lineItems.reduce((sum, item) => sum + item.quantity, 0)
      case 'transaction_count':
        return lineItems.length
      case 'average_order_value':
        const totalRevenue = lineItems.reduce((sum, item) => sum + item.totalPriceAmount, 0)
        return lineItems.length > 0 ? totalRevenue / lineItems.length : 0
      default:
        return 0
    }
  }

  /**
   * Apply sorting and limiting to results
   */
  private applySortingAndLimiting(data: QueryResultRow[], params: QueryParameters): QueryResultRow[] {
    // Sort by primary metric if specified
    if (params.metrics.length > 0) {
      const primaryMetric = params.metrics[0]
      data.sort((a, b) => (Number(b[primaryMetric]) || 0) - (Number(a[primaryMetric]) || 0))
    }

    // Apply limit if specified
    if (params.limit && params.limit > 0) {
      data = data.slice(0, params.limit)
    }

    return data
  }

  /**
   * Get query execution plan description
   */
  private getQueryPlan(params: QueryParameters): string {
    const parts = []

    if (params.groupBy.length > 0) {
      parts.push(`GROUP BY ${params.groupBy.join(', ')}`)
    }

    if (params.metrics.length > 0) {
      parts.push(`METRICS ${params.metrics.join(', ')}`)
    }

    if (params.locationIds.length > 0) {
      parts.push(`LOCATIONS ${params.locationIds.length}`)
    }

    if (params.itemNames.length > 0) {
      parts.push(`ITEMS ${params.itemNames.length}`)
    }

    if (params.startDate || params.endDate) {
      parts.push('DATE_FILTER')
    }

    return parts.join(' | ')
  }
}