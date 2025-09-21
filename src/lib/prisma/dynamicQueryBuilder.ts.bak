import prisma from '../../../lib/prisma'
import { logger } from '../utils/logger'
import type { Prisma } from '../../generated/prisma'
import type {
  QueryParameters,
  StandardizedQueryResult,
  QueryResultRow,
  QueryExecutionPlan
} from '../types/dynamicQuery'

/**
 * Dynamic query builder that constructs Prisma queries based on flexible parameters
 * Supports complex grouping, filtering, and aggregation scenarios
 */
export class DynamicQueryBuilder {

  /**
   * Main entry point - builds and executes query based on parameters
   */
  async buildAndExecuteQuery(params: QueryParameters): Promise<StandardizedQueryResult> {
    const timer = logger.startTimer('Dynamic Query Execution')

    try {
      logger.data('Building dynamic query', undefined, {
        dateRanges: params.dateRanges.length,
        locationIds: params.locationIds.length,
        items: params.items.length,
        metrics: params.metrics.join(', '),
        groupBy: params.groupBy.join(', ')
      })

      // Determine execution strategy
      const executionPlan = this.planQueryExecution(params)
      logger.data('Query execution plan', undefined, {
        strategy: executionPlan.strategy,
        requiresMultiple: executionPlan.requiresMultipleQueries,
        complexity: executionPlan.estimatedComplexity
      })

      let results: QueryResultRow[]

      // Execute based on strategy
      switch (executionPlan.strategy) {
        case 'simple':
          results = await this.executeSimpleQuery(params)
          break
        case 'grouped':
          results = await this.executeGroupedQuery(params)
          break
        case 'comparison':
          results = await this.executeComparisonQuery(params)
          break
        case 'complex':
          results = await this.executeComplexQuery(params)
          break
        default:
          throw new Error(`Unknown query strategy: ${executionPlan.strategy}`)
      }

      const duration = timer()

      const result: StandardizedQueryResult = {
        data: results,
        metadata: {
          groupBy: params.groupBy,
          metrics: params.metrics,
          totalRecords: results.length,
          processingTime: duration,
          queryPlan: `${executionPlan.strategy}_query`,
          parameters: params as any as any
        }
      }

      logger.success('Dynamic query executed successfully', undefined, {
        processingTime: duration,
        resultCount: results.length,
        strategy: executionPlan.strategy
      })

      return result

    } catch (err) {
      const duration = timer()
      const error = err instanceof Error ? err : new Error('Unknown query execution error')

      logger.error('Dynamic query execution failed', error, {
        processingTime: duration,
        parameters: params as any
      })

      throw error
    }
  }

  /**
   * Determine the best execution strategy for given parameters
   */
  private planQueryExecution(params: QueryParameters): QueryExecutionPlan {
    // Multiple date ranges = comparison query
    if (params.dateRanges.length > 1) {
      return {
        strategy: 'comparison',
        requiresMultipleQueries: true,
        estimatedComplexity: 'high',
        fallbackAvailable: true
      }
    }

    // Multiple groupBy dimensions = complex query
    if (params.groupBy.length > 2) {
      return {
        strategy: 'complex',
        requiresMultipleQueries: false,
        estimatedComplexity: 'high',
        fallbackAvailable: true
      }
    }

    // Single groupBy dimension = grouped query
    if (params.groupBy.length > 0) {
      return {
        strategy: 'grouped',
        requiresMultipleQueries: false,
        estimatedComplexity: 'medium',
        fallbackAvailable: true
      }
    }

    // No grouping = simple aggregate
    return {
      strategy: 'simple',
      requiresMultipleQueries: false,
      estimatedComplexity: 'low',
      fallbackAvailable: true
    }
  }

  /**
   * Execute simple aggregate query (no grouping)
   */
  private async executeSimpleQuery(params: QueryParameters): Promise<QueryResultRow[]> {
    const timer = logger.startTimer('Simple Query Execution')

    try {
      const dateRange = params.dateRanges[0] // Use first date range
      const where = this.buildWhereClause(params, dateRange)

      // Determine what data we need based on metrics
      const needsAggregation = params.metrics.some(m =>
        ['revenue', 'count', 'avg_transaction'].includes(m)
      )
      const needsItemData = params.metrics.some(m =>
        ['quantity', 'items_per_sale', 'avg_item_price', 'unique_items'].includes(m)
      )

      let aggregateResult: any = null
      let itemAggregateResult: any = null

      // Get sale aggregates if needed
      if (needsAggregation) {
        aggregateResult = await prisma.sale.aggregate({
          where,
          _count: true,
          _sum: { totalSales: true },
          _avg: { totalSales: true },
          _max: { totalSales: true },
          _min: { totalSales: true }
        })
      }

      // Get item aggregates if needed
      if (needsItemData) {
        const itemWhere: Prisma.SaleItemWhereInput = {
          sale: where
        }

        itemAggregateResult = await prisma.saleItem.aggregate({
          where: itemWhere,
          _count: true,
          _sum: { quantity: true, price: true },
          _avg: { price: true }
        })
      }

      const duration = timer()

      // Calculate metrics
      const metrics: Record<string, number> = {}

      for (const metric of params.metrics) {
        switch (metric) {
          case 'revenue':
            metrics['revenue'] = Number(aggregateResult?._sum?.totalSales || 0)
            break
          case 'count':
            metrics['count'] = aggregateResult?._count || 0
            break
          case 'avg_transaction':
            metrics['avg_transaction'] = Number(aggregateResult?._avg?.totalSales || 0)
            break
          case 'quantity':
            metrics['quantity'] = itemAggregateResult?._sum?.quantity || 0
            break
          case 'items_per_sale':
            const totalItems = itemAggregateResult?._count || 0
            const totalSales = aggregateResult?._count || 0
            metrics['items_per_sale'] = totalSales > 0 ? totalItems / totalSales : 0
            break
          case 'avg_item_price':
            metrics['avg_item_price'] = Number(itemAggregateResult?._avg?.price || 0)
            break
          case 'unique_items':
            // This requires a separate query
            const uniqueItemsCount = await prisma.saleItem.groupBy({
              by: ['itemId'],
              where: { sale: where }
            })
            metrics['unique_items'] = uniqueItemsCount.length
            break
        }
      }

      logger.queryExecution('simple', 'aggregate_query', undefined, {
        processingTime: duration,
        recordCount: 1
      })

      return [{
        dimensions: { period: dateRange.period },
        metrics
      }]

    } catch (err) {
      const duration = timer()
      const error = err instanceof Error ? err : new Error('Simple query execution failed')

      logger.error('Simple query execution failed', error, {
        processingTime: duration
      })

      throw error
    }
  }

  /**
   * Execute grouped query (single groupBy dimension)
   */
  private async executeGroupedQuery(params: QueryParameters): Promise<QueryResultRow[]> {
    const timer = logger.startTimer('Grouped Query Execution')

    try {
      const dateRange = params.dateRanges[0]
      const groupByDimension = params.groupBy[0]

      let results: QueryResultRow[]

      switch (groupByDimension) {
        case 'location':
          results = await this.groupByLocation(params, dateRange)
          break
        case 'item':
          results = await this.groupByItem(params, dateRange)
          break
        case 'month':
        case 'week':
        case 'day':
          results = await this.groupByTime(params, dateRange, groupByDimension)
          break
        case 'day_of_week':
          results = await this.groupByDayOfWeek(params, dateRange)
          break
        default:
          throw new Error(`Unsupported groupBy dimension: ${groupByDimension}`)
      }

      const duration = timer()

      logger.queryExecution('grouped', `group_by_${groupByDimension}`, undefined, {
        processingTime: duration,
        recordCount: results.length
      })

      return results

    } catch (err) {
      const duration = timer()
      const error = err instanceof Error ? err : new Error('Grouped query execution failed')

      logger.error('Grouped query execution failed', error, {
        processingTime: duration
      })

      throw error
    }
  }

  /**
   * Execute comparison query (multiple date ranges)
   */
  private async executeComparisonQuery(params: QueryParameters): Promise<QueryResultRow[]> {
    const timer = logger.startTimer('Comparison Query Execution')

    try {
      const results: QueryResultRow[] = []

      // Execute query for each date range
      for (const dateRange of params.dateRanges) {
        const singleRangeParams: QueryParameters = {
          ...params,
          dateRanges: [dateRange]
        }

        const rangeResults = params.groupBy.length > 0
          ? await this.executeGroupedQuery(singleRangeParams)
          : await this.executeSimpleQuery(singleRangeParams)

        // Add period dimension to each result
        for (const result of rangeResults) {
          results.push({
            ...result,
            dimensions: {
              ...result.dimensions,
              period: dateRange.period
            }
          })
        }
      }

      const duration = timer()

      logger.queryExecution('comparison', 'multi_period_query', undefined, {
        processingTime: duration,
        recordCount: results.length,
        periodCount: params.dateRanges.length
      })

      return results

    } catch (err) {
      const duration = timer()
      const error = err instanceof Error ? err : new Error('Comparison query execution failed')

      logger.error('Comparison query execution failed', error, {
        processingTime: duration
      })

      throw error
    }
  }

  /**
   * Execute complex query (multiple groupBy dimensions)
   */
  private async executeComplexQuery(params: QueryParameters): Promise<QueryResultRow[]> {
    const timer = logger.startTimer('Complex Query Execution')

    try {
      // For now, handle 2-dimensional grouping
      // Could be extended for more dimensions
      if (params.groupBy.length === 2) {
        return await this.executeTwoDimensionalGrouping(params)
      }

      // Fallback to grouped query with primary dimension
      const fallbackParams: QueryParameters = {
        ...params,
        groupBy: [params.groupBy[0]]
      }

      logger.warn('Complex query fallback to single groupBy', undefined, {
        originalGroupBy: params.groupBy.join(', '),
        fallbackGroupBy: params.groupBy[0]
      })

      return await this.executeGroupedQuery(fallbackParams)

    } catch (err) {
      const duration = timer()
      const error = err instanceof Error ? err : new Error('Complex query execution failed')

      logger.error('Complex query execution failed', error, {
        processingTime: duration
      })

      throw error
    }
  }

  /**
   * Handle two-dimensional grouping (e.g., location + month)
   */
  private async executeTwoDimensionalGrouping(params: QueryParameters): Promise<QueryResultRow[]> {
    const [dimension1, dimension2] = params.groupBy
    const dateRange = params.dateRanges[0]

    // This is complex - for now, we'll implement location + time combinations
    if ((dimension1 === 'location' && ['month', 'week', 'day'].includes(dimension2)) ||
        (dimension2 === 'location' && ['month', 'week', 'day'].includes(dimension1))) {

      return await this.groupByLocationAndTime(params, dateRange)
    }

    // Add more combinations as needed
    throw new Error(`Two-dimensional grouping not implemented for: ${dimension1} + ${dimension2}`)
  }

  /**
   * Group by location
   */
  private async groupByLocation(params: QueryParameters, dateRange: any): Promise<QueryResultRow[]> {
    const where = this.buildWhereClause(params, dateRange)

    const locationResults = await prisma.sale.groupBy({
      by: ['locationId'],
      where,
      _count: true,
      _sum: { totalSales: true },
      _avg: { totalSales: true }
    })

    // Get location names
    const locationIds = locationResults.map(r => r.locationId)
    const locations = await prisma.location.findMany({
      where: { locationId: { in: locationIds } },
      select: { locationId: true, name: true }
    })

    const locationMap = new Map(locations.map(l => [l.locationId, l.name || l.locationId]))

    return locationResults.map(result => {
      const metrics: Record<string, number> = {}

      for (const metric of params.metrics) {
        switch (metric) {
          case 'revenue':
            metrics['revenue'] = Number(result._sum.totalSales || 0)
            break
          case 'count':
            metrics['count'] = result._count
            break
          case 'avg_transaction':
            metrics['avg_transaction'] = Number(result._avg.totalSales || 0)
            break
        }
      }

      return {
        dimensions: {
          location: locationMap.get(result.locationId) || result.locationId,
          locationId: result.locationId
        },
        metrics
      }
    })
  }

  /**
   * Group by item
   */
  private async groupByItem(params: QueryParameters, dateRange: any): Promise<QueryResultRow[]> {
    const where = this.buildWhereClause(params, dateRange)

    const itemResults = await prisma.saleItem.groupBy({
      by: ['itemId'],
      where: { sale: where },
      _count: true,
      _sum: { quantity: true, price: true },
      _avg: { price: true }
    })

    // Get item names
    const itemIds = itemResults.map(r => r.itemId)
    const items = await prisma.item.findMany({
      where: { id: { in: itemIds } },
      select: { id: true, name: true }
    })

    const itemMap = new Map(items.map(i => [i.id, i.name]))

    return itemResults.map(result => {
      const metrics: Record<string, number> = {}

      for (const metric of params.metrics) {
        switch (metric) {
          case 'quantity':
            metrics['quantity'] = result._sum.quantity || 0
            break
          case 'revenue':
            metrics['revenue'] = Number(result._sum.price || 0)
            break
          case 'count':
            metrics['count'] = result._count
            break
          case 'avg_item_price':
            metrics['avg_item_price'] = Number(result._avg.price || 0)
            break
        }
      }

      return {
        dimensions: {
          item: itemMap.get(result.itemId) || 'Unknown',
          itemId: result.itemId
        },
        metrics
      }
    })
  }

  /**
   * Group by time dimension (day, week, month)
   */
  private async groupByTime(params: QueryParameters, dateRange: any, timeDimension: string): Promise<QueryResultRow[]> {
    // This requires raw SQL for proper date grouping
    // For now, we'll implement a simplified version
    const where = this.buildWhereClause(params, dateRange)

    const sales = await prisma.sale.findMany({
      where,
      select: {
        date: true,
        totalSales: true
      },
      orderBy: { date: 'asc' }
    })

    // Group results by time dimension
    const groupedResults = new Map<string, { count: number; totalSales: number }>()

    for (const sale of sales) {
      let groupKey: string

      switch (timeDimension) {
        case 'day':
          groupKey = sale.date.toISOString().split('T')[0]
          break
        case 'week':
          const weekStart = new Date(sale.date)
          weekStart.setDate(sale.date.getDate() - sale.date.getDay())
          groupKey = weekStart.toISOString().split('T')[0]
          break
        case 'month':
          groupKey = `${sale.date.getFullYear()}-${(sale.date.getMonth() + 1).toString().padStart(2, '0')}`
          break
        default:
          groupKey = sale.date.toISOString().split('T')[0]
      }

      const existing = groupedResults.get(groupKey) || { count: 0, totalSales: 0 }
      existing.count += 1
      existing.totalSales += Number(sale.totalSales)
      groupedResults.set(groupKey, existing)
    }

    return Array.from(groupedResults.entries()).map(([period, data]) => {
      const metrics: Record<string, number> = {}

      for (const metric of params.metrics) {
        switch (metric) {
          case 'revenue':
            metrics['revenue'] = data.totalSales
            break
          case 'count':
            metrics['count'] = data.count
            break
          case 'avg_transaction':
            metrics['avg_transaction'] = data.count > 0 ? data.totalSales / data.count : 0
            break
        }
      }

      return {
        dimensions: { [timeDimension]: period },
        metrics
      }
    })
  }

  /**
   * Group by day of week
   */
  private async groupByDayOfWeek(params: QueryParameters, dateRange: any): Promise<QueryResultRow[]> {
    const where = this.buildWhereClause(params, dateRange)

    const sales = await prisma.sale.findMany({
      where,
      select: {
        date: true,
        totalSales: true
      }
    })

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    const groupedResults = new Map<number, { count: number; totalSales: number }>()

    for (const sale of sales) {
      const dayOfWeek = sale.date.getDay()
      const existing = groupedResults.get(dayOfWeek) || { count: 0, totalSales: 0 }
      existing.count += 1
      existing.totalSales += Number(sale.totalSales)
      groupedResults.set(dayOfWeek, existing)
    }

    return Array.from(groupedResults.entries()).map(([dayOfWeek, data]) => {
      const metrics: Record<string, number> = {}

      for (const metric of params.metrics) {
        switch (metric) {
          case 'revenue':
            metrics['revenue'] = data.totalSales
            break
          case 'count':
            metrics['count'] = data.count
            break
          case 'avg_transaction':
            metrics['avg_transaction'] = data.count > 0 ? data.totalSales / data.count : 0
            break
        }
      }

      return {
        dimensions: {
          day_of_week: dayNames[dayOfWeek],
          day_number: dayOfWeek
        },
        metrics
      }
    })
  }

  /**
   * Group by location and time (two-dimensional)
   */
  private async groupByLocationAndTime(_params: QueryParameters, _dateRange: any): Promise<QueryResultRow[]> {
    // This would require more complex SQL - simplified for now
    throw new Error('Location + time grouping not yet implemented')
  }

  /**
   * Build Prisma where clause from parameters
   */
  private buildWhereClause(params: QueryParameters, dateRange: any): Prisma.SaleWhereInput {
    const where: Prisma.SaleWhereInput = {}

    // Date filtering
    where.date = {
      gte: dateRange.start,
      lte: dateRange.end
    }

    // Location filtering
    if (params.locationIds.length > 0) {
      where.locationId = {
        in: params.locationIds
      }
    }

    // Item filtering
    if (params.items.length > 0) {
      where.saleItems = {
        some: {
          item: {
            name: {
              in: params.items
            }
          }
        }
      }
    }

    return where
  }
}