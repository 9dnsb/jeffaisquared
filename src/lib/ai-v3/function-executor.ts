/**
 * AI v3 Function Executor - Executes function calls and returns database results
 * Maps OpenAI function calls to optimized Prisma/SQL queries
 */

import { Prisma } from '../../generated/prisma'
import prisma from '../../../lib/prisma'
import { logger } from '../utils/logger'
import { getTorontoDate, getTorontoTimeframeDates, debugTorontoTimes } from '../utils/timezone'
import { AI_V3_CONFIG, PERFORMANCE_THRESHOLDS } from './config'
import type { FunctionName } from './functions'
import type { QueryResultRow } from './types'

export class FunctionExecutor {
  private lastUserMessage: string = ''

  /**
   * Set the user message for timeframe detection fallback
   */
  setUserMessage(message: string): void {
    this.lastUserMessage = message
    console.log('🚨🚨🚨 FUNCTION EXECUTOR setUserMessage CALLED 🚨🚨🚨')
    console.log('🚨 User message set to:', message)
  }

  /**
   * Execute a function call and return results
   */
  async executeFunction(
    functionName: FunctionName,
    args: any
  ): Promise<QueryResultRow[]> {
    const timer = logger.startTimer(`Execute Function: ${functionName}`)

    try {
      logger.queryExecution('function_call', functionName, undefined, {
        functionArgs: JSON.stringify(args).slice(0, 200),
      })

      let result: QueryResultRow[]

      switch (functionName) {
        case 'get_time_based_metrics':
          result = await this.handleTimeBasedMetrics(args)
          break
        case 'compare_periods':
          result = await this.handleComparePeriods(args)
          break
        case 'get_best_performing_days':
          result = await this.handleBestPerformingDays(args)
          break
        case 'get_seasonal_trends':
          result = await this.handleSeasonalTrends(args)
          break
        case 'get_location_metrics':
          result = await this.handleLocationMetrics(args)
          break
        case 'compare_locations':
          result = await this.handleCompareLocations(args)
          break
        case 'get_location_rankings':
          result = await this.handleLocationRankings(args)
          break
        case 'get_top_products':
          result = await this.handleTopProducts(args)
          break
        case 'get_product_location_analysis':
          result = await this.handleProductLocationAnalysis(args)
          break
        case 'get_product_categories':
          result = await this.handleProductCategories(args)
          break
        case 'get_business_overview':
          result = await this.handleBusinessOverview(args)
          break
        case 'get_advanced_analytics':
          result = await this.handleAdvancedAnalytics(args)
          break
        default:
          throw new Error(`Unknown function: ${functionName}`)
      }

      const duration = timer()

      logger.success(`Function executed: ${functionName}`, undefined, {
        processingTime: duration,
        recordCount: result.length,
        resultSize: JSON.stringify(result).length,
      })

      return result
    } catch (err) {
      const duration = timer()
      const error =
        err instanceof Error ? err : new Error('Function execution failed')

      logger.error(`Function execution failed: ${functionName}`, error, {
        processingTime: duration,
        functionArgs: JSON.stringify(args).slice(0, 200),
      })

      throw error
    }
  }

  // ===== TIME-BASED METRIC HANDLERS =====

  private async handleTimeBasedMetrics(args: {
    timeframe: string
    metrics: string[]
    include_top_location?: boolean
  }): Promise<QueryResultRow[]> {
    const { startDate, endDate } = this.getTimeframeDates(args.timeframe)
    const results: QueryResultRow[] = []

    // Build optimized query based on metrics requested
    const metricsQuery =
      args.metrics.includes('revenue') ||
      args.metrics.includes('count') ||
      args.metrics.includes('quantity') ||
      args.metrics.includes('avg_transaction')

    if (metricsQuery) {
      let aggregateResult: Array<{
        revenue: bigint
        count: bigint
        quantity: bigint
      }>

      if (startDate && endDate) {
        // Separate queries to avoid duplication from LEFT JOIN
        const revenueResult = await prisma.$queryRaw<Array<{revenue: bigint, count: bigint}>>`
          SELECT
            COALESCE(SUM("totalAmount"), 0)::bigint as revenue,
            COUNT(id)::bigint as count
          FROM orders
          WHERE date >= ${startDate} AND date < ${endDate}
        `

        const quantityResult = await prisma.$queryRaw<Array<{quantity: bigint}>>`
          SELECT
            COALESCE(SUM(li.quantity), 0)::bigint as quantity
          FROM line_items li
          JOIN orders o ON li."orderId" = o.id
          WHERE o.date >= ${startDate} AND o.date < ${endDate}
        `

        aggregateResult = [{
          revenue: revenueResult[0]?.revenue || BigInt(0),
          count: revenueResult[0]?.count || BigInt(0),
          quantity: quantityResult[0]?.quantity || BigInt(0)
        }]
      } else {
        // Separate queries to avoid duplication from LEFT JOIN
        const revenueResult = await prisma.$queryRaw<Array<{revenue: bigint, count: bigint}>>`
          SELECT
            COALESCE(SUM("totalAmount"), 0)::bigint as revenue,
            COUNT(id)::bigint as count
          FROM orders
        `

        const quantityResult = await prisma.$queryRaw<Array<{quantity: bigint}>>`
          SELECT
            COALESCE(SUM(quantity), 0)::bigint as quantity
          FROM line_items
        `

        aggregateResult = [{
          revenue: revenueResult[0]?.revenue || BigInt(0),
          count: revenueResult[0]?.count || BigInt(0),
          quantity: quantityResult[0]?.quantity || BigInt(0)
        }]
      }

      const data = aggregateResult[0]
      const revenue = Number(data.revenue) / 100 // Convert cents to dollars
      const count = Number(data.count)
      const quantity = Number(data.quantity)

      const row: QueryResultRow = {}

      if (args.metrics.includes('revenue')) row.revenue = revenue
      if (args.metrics.includes('count')) row.count = count
      if (args.metrics.includes('quantity')) row.quantity = quantity
      if (args.metrics.includes('avg_transaction')) {
        row.avg_transaction = count > 0 ? revenue / count : 0
      }

      results.push(row)
    }

    // Add top location if requested
    if (args.include_top_location) {
      let topLocationResult: Array<{
        location_name: string
        revenue: bigint
      }>

      if (startDate && endDate) {
        topLocationResult = await prisma.$queryRaw`
          SELECT l.name as location_name, COALESCE(SUM(o."totalAmount"), 0)::bigint as revenue
          FROM locations l
          LEFT JOIN orders o ON l."squareLocationId" = o."locationId"
          WHERE o.date >= ${startDate} AND o.date < ${endDate}
          GROUP BY l.name
          ORDER BY revenue DESC
          LIMIT 1
        `
      } else {
        topLocationResult = await prisma.$queryRaw`
          SELECT l.name as location_name, COALESCE(SUM(o."totalAmount"), 0)::bigint as revenue
          FROM locations l
          LEFT JOIN orders o ON l."squareLocationId" = o."locationId"
          GROUP BY l.name
          ORDER BY revenue DESC
          LIMIT 1
        `
      }

      if (topLocationResult[0]) {
        results.push({
          location: topLocationResult[0].location_name,
          revenue: Number(topLocationResult[0].revenue) / 100,
        })
      }
    }

    // Add unique items count if requested
    if (args.metrics.includes('unique_items')) {
      let uniqueItemsResult: Array<{
        unique_items: bigint
      }>

      if (startDate && endDate) {
        uniqueItemsResult = await prisma.$queryRaw`
          SELECT COUNT(DISTINCT COALESCE(i.name, li.name))::bigint as unique_items
          FROM line_items li
          LEFT JOIN items i ON li."itemId" = i.id
          JOIN orders o ON li."orderId" = o.id
          WHERE o.date >= ${startDate} AND o.date < ${endDate}
        `
      } else {
        uniqueItemsResult = await prisma.$queryRaw`
          SELECT COUNT(DISTINCT COALESCE(i.name, li.name))::bigint as unique_items
          FROM line_items li
          LEFT JOIN items i ON li."itemId" = i.id
          JOIN orders o ON li."orderId" = o.id
        `
      }

      if (uniqueItemsResult[0]) {
        results[0] = results[0] || {}
        results[0].unique_items = Number(uniqueItemsResult[0].unique_items)
      }
    }

    return results
  }

  private async handleComparePeriods(args: {
    primary_period: string
    comparison_period: string
    metrics: string[]
  }): Promise<QueryResultRow[]> {
    const primary = this.getTimeframeDates(args.primary_period)
    const comparison = this.getComparisonDates(
      args.comparison_period,
      primary.startDate
    )

    // Get metrics for both periods
    const [primaryResults, comparisonResults] = await Promise.all([
      this.getMetricsForPeriod(
        primary.startDate,
        primary.endDate,
        args.metrics
      ),
      this.getMetricsForPeriod(
        comparison.startDate,
        comparison.endDate,
        args.metrics
      ),
    ])

    // Calculate growth rates
    const results: QueryResultRow[] = []

    for (const metric of args.metrics) {
      const primaryValue =
        (primaryResults[0]?.[metric as keyof QueryResultRow] as number) || 0
      const comparisonValue =
        (comparisonResults[0]?.[metric as keyof QueryResultRow] as number) || 0

      const growthRate =
        comparisonValue > 0
          ? ((primaryValue - comparisonValue) / comparisonValue) * 100
          : 0

      results.push({
        metric: metric,
        current_value: primaryValue,
        previous_value: comparisonValue,
        growth_rate: growthRate,
        period: args.primary_period,
      } as any)
    }

    return results
  }

  private async handleBestPerformingDays(args: {
    timeframe: string
    group_by: string
    metric: string
    limit?: number
  }): Promise<QueryResultRow[]> {
    const { startDate, endDate } = this.getTimeframeDates(args.timeframe)
    const limit = args.limit || 1

    let groupByClause: string
    let selectClause: string

    switch (args.group_by) {
      case 'day':
        groupByClause = 'o.date'
        selectClause = 'o.date::text as date'
        break
      case 'week':
        groupByClause = "DATE_TRUNC('week', o.date)"
        selectClause = "DATE_TRUNC('week', o.date)::text as week"
        break
      case 'month':
        groupByClause = "DATE_TRUNC('month', o.date)"
        selectClause = "DATE_TRUNC('month', o.date)::text as month"
        break
      default:
        throw new Error(`Unsupported group_by: ${args.group_by}`)
    }

    const metricClause =
      args.metric === 'revenue'
        ? 'COALESCE(SUM(o."totalAmount"), 0)::bigint as value'
        : args.metric === 'count'
        ? 'COUNT(DISTINCT o.id)::bigint as value'
        : 'COALESCE(SUM(li.quantity), 0)::bigint as value'

    let results: Array<{
      date?: string
      week?: string
      month?: string
      value: bigint
    }>

    if (startDate && endDate) {
      results = await prisma.$queryRaw`
        SELECT ${Prisma.raw(selectClause)}, ${Prisma.raw(metricClause)}
        FROM orders o
        LEFT JOIN line_items li ON o.id = li."orderId"
        WHERE o.date >= ${startDate} AND o.date < ${endDate}
        GROUP BY ${Prisma.raw(groupByClause)}
        ORDER BY value DESC
        LIMIT ${limit}
      `
    } else {
      results = await prisma.$queryRaw`
        SELECT ${Prisma.raw(selectClause)}, ${Prisma.raw(metricClause)}
        FROM orders o
        LEFT JOIN line_items li ON o.id = li."orderId"
        GROUP BY ${Prisma.raw(groupByClause)}
        ORDER BY value DESC
        LIMIT ${limit}
      `
    }

    return results.map((row) => ({
      [args.group_by]: row.date || row.week || row.month,
      [args.metric]:
        args.metric === 'revenue' ? Number(row.value) / 100 : Number(row.value),
      rank: results.indexOf(row) + 1,
    })) as QueryResultRow[]
  }

  private async handleSeasonalTrends(args: {
    analysis_type: string
    metric: string
    timeframe?: string
  }): Promise<QueryResultRow[]> {
    const { startDate, endDate } = args.timeframe
      ? this.getTimeframeDates(args.timeframe)
      : { startDate: null, endDate: null }

    switch (args.analysis_type) {
      case 'weekend_vs_weekday':
        return this.getWeekendVsWeekdayAnalysis(args.metric, startDate, endDate)
      case 'hourly_patterns':
        return this.getHourlyPatterns(args.metric, startDate, endDate)
      case 'monthly_trends':
        return this.getMonthlyTrends(args.metric, startDate, endDate)
      default:
        throw new Error(`Unsupported analysis_type: ${args.analysis_type}`)
    }
  }

  // ===== LOCATION METRIC HANDLERS =====

  private async handleLocationMetrics(args: {
    locations?: string[]
    metrics: string[]
    timeframe?: string
  }): Promise<QueryResultRow[]> {
    const { startDate, endDate } = args.timeframe
      ? this.getTimeframeDates(args.timeframe)
      : { startDate: null, endDate: null }

    // Build location filter for partial name matching using Prisma ORM
    const locationNameFilters = args.locations?.map(locationName => ({
      name: {
        contains: locationName,
        mode: 'insensitive' as const
      }
    })) || []

    // Get all locations with their orders using Prisma ORM
    const locations = await prisma.location.findMany({
      where: locationNameFilters.length > 0 ? {
        OR: locationNameFilters
      } : undefined,
      include: {
        orders: {
          where: startDate && endDate ? {
            date: {
              gte: startDate,
              lt: endDate
            }
          } : undefined
        }
      }
    })

    // Calculate metrics for each location
    const results = locations.map(location => {
      const orders = location.orders
      const revenue = orders.reduce((sum, order) => sum + order.totalAmount, 0)
      const count = orders.length
      const avgTransaction = count > 0 ? revenue / count / 100 : 0

      return {
        location: location.name,
        revenue: revenue / 100, // Convert cents to dollars
        count: count,
        avg_transaction: avgTransaction
      }
    })

    // Sort by revenue descending
    results.sort((a, b) => b.revenue - a.revenue)

    // Calculate market share if requested
    const totalRevenue = results.reduce((sum, r) => sum + r.revenue, 0)

    return results.map((row) => {
      const result: QueryResultRow = {
        location: row.location,
      }

      if (args.metrics.includes('revenue')) result.revenue = row.revenue
      if (args.metrics.includes('count')) result.count = row.count
      if (args.metrics.includes('avg_transaction'))
        result.avg_transaction = row.avg_transaction
      if (args.metrics.includes('market_share') && totalRevenue > 0) {
        result.market_share = (row.revenue / totalRevenue) * 100
      }
      if (args.metrics.includes('efficiency')) {
        result.efficiency = row.count > 0 ? row.revenue / row.count : 0
      }

      return result
    })
  }

  private async handleCompareLocations(args: {
    comparison_type: string
    location_a?: string
    location_b?: string
    metric: string
    timeframe?: string
  }): Promise<QueryResultRow[]> {
    const { startDate, endDate } = args.timeframe
      ? this.getTimeframeDates(args.timeframe)
      : { startDate: null, endDate: null }

    switch (args.comparison_type) {
      case 'specific_pair':
        if (!args.location_a || !args.location_b) {
          throw new Error(
            'location_a and location_b required for specific_pair comparison'
          )
        }
        return this.compareSpecificLocations(
          args.location_a,
          args.location_b,
          args.metric,
          startDate,
          endDate
        )

      case 'top_vs_bottom':
        return this.getTopVsBottomLocations(args.metric, startDate, endDate)

      case 'all_ranked':
        return this.getAllLocationRankings(args.metric, startDate, endDate)

      case 'market_share':
        return this.getLocationMarketShare(startDate, endDate)

      default:
        throw new Error(`Unsupported comparison_type: ${args.comparison_type}`)
    }
  }

  private async handleLocationRankings(args: {
    ranking_type: string
    order?: string
    timeframe?: string
    include_statistics?: boolean
  }): Promise<QueryResultRow[]> {
    // DEBUG: Show what parameters the function received
    console.log('🔍 DEBUG handleLocationRankings called with args:', JSON.stringify(args, null, 2))
    console.log('🔍 DEBUG last user message:', this.lastUserMessage)

    // FALLBACK: Detect timeframe from user message if not provided
    let effectiveTimeframe = args.timeframe
    if (!effectiveTimeframe && this.lastUserMessage) {
      effectiveTimeframe = this.detectTimeframeFromMessage(this.lastUserMessage)
      console.log('🔍 DEBUG detected timeframe from message:', effectiveTimeframe)
    }

    const { startDate, endDate } = effectiveTimeframe
      ? this.getTimeframeDates(effectiveTimeframe)
      : { startDate: null, endDate: null }

    // DEBUG: Show the calculated date range
    console.log('🔍 DEBUG calculated date range:', { startDate, endDate, timeframe: effectiveTimeframe })

    const orderDirection = args.order === 'lowest_to_highest' ? 'ASC' : 'DESC'

    let metricClause: string
    let orderByClause: string

    switch (args.ranking_type) {
      case 'by_revenue':
        metricClause =
          'COALESCE(SUM(o."totalAmount"), 0)::bigint as metric_value'
        orderByClause = `metric_value ${orderDirection}`
        break
      case 'by_transactions':
        metricClause = 'COUNT(o.id)::bigint as metric_value'
        orderByClause = `metric_value ${orderDirection}`
        break
      case 'by_avg_transaction':
        metricClause =
          'CASE WHEN COUNT(o.id) > 0 THEN COALESCE(SUM(o."totalAmount"), 0)::float / COUNT(o.id) ELSE 0 END as metric_value'
        orderByClause = `metric_value ${orderDirection}`
        break
      default:
        throw new Error(`Unsupported ranking_type: ${args.ranking_type}`)
    }

    let results: Array<{
      location_name: string
      metric_value: bigint | number
    }>

    if (startDate && endDate) {
      results = await prisma.$queryRaw`
        SELECT
          l.name as location_name,
          ${Prisma.raw(metricClause)}
        FROM locations l
        LEFT JOIN orders o ON l."squareLocationId" = o."locationId"
        WHERE o.date >= ${startDate} AND o.date < ${endDate}
        GROUP BY l.name
        ORDER BY ${Prisma.raw(orderByClause)}
      `
    } else {
      results = await prisma.$queryRaw`
        SELECT
          l.name as location_name,
          ${Prisma.raw(metricClause)}
        FROM locations l
        LEFT JOIN orders o ON l."squareLocationId" = o."locationId"
        GROUP BY l.name
        ORDER BY ${Prisma.raw(orderByClause)}
      `
    }

    return results.map((row, index) => ({
      location: row.location_name,
      rank: index + 1,
      [args.ranking_type.replace('by_', '')]:
        args.ranking_type === 'by_revenue'
          ? Number(row.metric_value) / 100
          : Number(row.metric_value),
    })) as QueryResultRow[]
  }

  // ===== PRODUCT ANALYSIS HANDLERS =====

  private async handleTopProducts(args: {
    ranking_metric: string
    limit?: number
    timeframe?: string
    location?: string
  }): Promise<QueryResultRow[]> {
    const { startDate, endDate } = args.timeframe
      ? this.getTimeframeDates(args.timeframe)
      : { startDate: null, endDate: null }

    const limit = args.limit || 10
    const locationFilter = args.location
      ? `AND l.name = '${args.location}'`
      : ''

    let metricClause: string
    let orderByClause: string

    switch (args.ranking_metric) {
      case 'revenue':
        metricClause =
          'COALESCE(SUM(li."totalPriceAmount"), 0)::bigint as metric_value'
        orderByClause = 'metric_value DESC'
        break
      case 'quantity':
        metricClause = 'COALESCE(SUM(li.quantity), 0)::bigint as metric_value'
        orderByClause = 'metric_value DESC'
        break
      case 'transaction_count':
        metricClause = 'COUNT(DISTINCT o.id)::bigint as metric_value'
        orderByClause = 'metric_value DESC'
        break
      case 'avg_price':
        metricClause =
          'CASE WHEN SUM(li.quantity) > 0 THEN SUM(li."totalPriceAmount")::float / SUM(li.quantity) ELSE 0 END as metric_value'
        orderByClause = 'metric_value DESC'
        break
      default:
        throw new Error(`Unsupported ranking_metric: ${args.ranking_metric}`)
    }

    let results: Array<{
      item_name: string
      metric_value: bigint | number
    }>

    const locationJoin = args.location
      ? 'JOIN locations l ON o."locationId" = l."squareLocationId"'
      : ''

    if (startDate && endDate) {
      results = await prisma.$queryRaw`
        SELECT
          COALESCE(i.name, li.name) as item_name,
          ${Prisma.raw(metricClause)}
        FROM line_items li
        LEFT JOIN items i ON li."itemId" = i.id
        JOIN orders o ON li."orderId" = o.id
        ${Prisma.raw(locationJoin)}
        WHERE o.date >= ${startDate} AND o.date < ${endDate}
        ${Prisma.raw(locationFilter)}
        GROUP BY COALESCE(i.name, li.name)
        ORDER BY ${Prisma.raw(orderByClause)}
        LIMIT ${limit}
      `
    } else {
      results = await prisma.$queryRaw`
        SELECT
          COALESCE(i.name, li.name) as item_name,
          ${Prisma.raw(metricClause)}
        FROM line_items li
        LEFT JOIN items i ON li."itemId" = i.id
        JOIN orders o ON li."orderId" = o.id
        ${Prisma.raw(locationJoin)}
        ${Prisma.raw(locationFilter)}
        GROUP BY COALESCE(i.name, li.name)
        ORDER BY ${Prisma.raw(orderByClause)}
        LIMIT ${limit}
      `
    }

    return results.map((row, index) => ({
      item: row.item_name,
      name: row.item_name,
      rank: index + 1,
      [args.ranking_metric]:
        args.ranking_metric === 'revenue'
          ? Number(row.metric_value) / 100
          : Number(row.metric_value),
    })) as QueryResultRow[]
  }

  private async handleProductLocationAnalysis(args: {
    analysis_type: string
    specific_item?: string
    metric?: string
    timeframe?: string
  }): Promise<QueryResultRow[]> {
    const { startDate, endDate } = args.timeframe
      ? this.getTimeframeDates(args.timeframe)
      : { startDate: null, endDate: null }

    switch (args.analysis_type) {
      case 'top_item_per_location':
        return this.getTopItemPerLocation(
          args.metric || 'revenue',
          startDate,
          endDate
        )

      case 'item_distribution':
        if (!args.specific_item) {
          throw new Error(
            'specific_item required for item_distribution analysis'
          )
        }
        return this.getItemDistribution(
          args.specific_item,
          args.metric || 'revenue',
          startDate,
          endDate
        )

      case 'location_with_most_items':
        return this.getLocationWithMostItems(startDate, endDate)

      case 'cross_location_comparison':
        if (!args.specific_item) {
          throw new Error(
            'specific_item required for cross_location_comparison'
          )
        }
        return this.getCrossLocationComparison(
          args.specific_item,
          args.metric || 'revenue',
          startDate,
          endDate
        )

      default:
        throw new Error(`Unsupported analysis_type: ${args.analysis_type}`)
    }
  }

  private async handleProductCategories(args: {
    analysis_type: string
    timeframe?: string
    location?: string
  }): Promise<QueryResultRow[]> {
    const { startDate, endDate } = args.timeframe
      ? this.getTimeframeDates(args.timeframe)
      : { startDate: null, endDate: null }

    switch (args.analysis_type) {
      case 'top_categories':
        return this.getTopCategories(startDate, endDate, args.location)

      case 'unique_item_count':
        return this.getUniqueItemCount(startDate, endDate, args.location)

      case 'product_mix':
        return this.getProductMix(startDate, endDate, args.location)

      case 'price_analysis':
        return this.getPriceAnalysis(startDate, endDate, args.location)

      default:
        throw new Error(`Unsupported analysis_type: ${args.analysis_type}`)
    }
  }

  // ===== BUSINESS OVERVIEW HANDLERS =====

  private async handleBusinessOverview(args: {
    metrics: string[]
    include_growth_rates?: boolean
    include_peak_performance?: boolean
  }): Promise<QueryResultRow[]> {
    const results: QueryResultRow[] = []

    // Get overall business metrics using separated queries to avoid duplication
    const [overallOrderStats, overallLineItemStats] = await Promise.all([
      prisma.$queryRaw<Array<{
        total_revenue: bigint
        total_transactions: bigint
        earliest_date: Date
        latest_date: Date
      }>>`
        SELECT
          COALESCE(SUM("totalAmount"), 0)::bigint as total_revenue,
          COUNT(id)::bigint as total_transactions,
          MIN(date) as earliest_date,
          MAX(date) as latest_date
        FROM orders
      `,
      prisma.$queryRaw<Array<{
        total_quantity: bigint
        total_line_items: bigint
      }>>`
        SELECT
          COALESCE(SUM(quantity), 0)::bigint as total_quantity,
          COUNT(id)::bigint as total_line_items
        FROM line_items
      `
    ])

    // Combine the results
    const overallStats = [{
      total_revenue: overallOrderStats[0]?.total_revenue || BigInt(0),
      total_transactions: overallOrderStats[0]?.total_transactions || BigInt(0),
      total_quantity: overallLineItemStats[0]?.total_quantity || BigInt(0),
      earliest_date: overallOrderStats[0]?.earliest_date,
      latest_date: overallOrderStats[0]?.latest_date,
      total_line_items: overallLineItemStats[0]?.total_line_items || BigInt(0)
    }]

    const data = overallStats[0]
    const totalRevenue = Number(data.total_revenue) / 100
    const totalTransactions = Number(data.total_transactions)
    const totalQuantity = Number(data.total_quantity)

    const businessData: QueryResultRow = {}

    if (args.metrics.includes('total_revenue')) {
      businessData.total_revenue = totalRevenue
    }
    if (args.metrics.includes('total_transactions')) {
      businessData.total_transactions = totalTransactions
    }
    if (args.metrics.includes('avg_transaction') && totalTransactions > 0) {
      businessData.avg_transaction = totalRevenue / totalTransactions
    }

    // Calculate time-based averages
    if (data.earliest_date && data.latest_date) {
      const daysDiff = Math.ceil(
        (data.latest_date.getTime() - data.earliest_date.getTime()) /
          (1000 * 60 * 60 * 24)
      )

      if (args.metrics.includes('avg_daily_revenue') && daysDiff > 0) {
        businessData.avg_daily_revenue = totalRevenue / daysDiff
      }
      if (args.metrics.includes('avg_weekly_revenue') && daysDiff > 7) {
        businessData.avg_weekly_revenue = totalRevenue / (daysDiff / 7)
      }
      if (args.metrics.includes('avg_monthly_revenue') && daysDiff > 30) {
        businessData.avg_monthly_revenue = totalRevenue / (daysDiff / 30)
      }
    }

    results.push(businessData)

    // Add peak performance if requested
    if (args.include_peak_performance) {
      const peakDay = await prisma.$queryRaw<
        Array<{
          date: Date
          revenue: bigint
        }>
      >`
        SELECT o.date, COALESCE(SUM(o."totalAmount"), 0)::bigint as revenue
        FROM orders o
        GROUP BY o.date
        ORDER BY revenue DESC
        LIMIT 1
      `

      if (peakDay[0]) {
        results.push({
          metric: 'highest_daily_revenue',
          date: peakDay[0].date.toISOString().split('T')[0],
          revenue: Number(peakDay[0].revenue) / 100,
        } as any)
      }
    }

    return results
  }

  private async handleAdvancedAnalytics(args: {
    analysis_type: string
    timeframe?: string
    focus_areas?: string[]
  }): Promise<QueryResultRow[]> {
    const { startDate, endDate } = args.timeframe
      ? this.getTimeframeDates(args.timeframe)
      : { startDate: null, endDate: null }

    switch (args.analysis_type) {
      case 'business_health_check':
        return this.getBusinessHealthCheck(startDate, endDate, args.focus_areas)

      case 'location_correlation':
        return this.getLocationCorrelation(startDate, endDate)

      case 'efficiency_analysis':
        return this.getEfficiencyAnalysis(startDate, endDate)

      case 'forecasting':
        return this.getForecastingAnalysis(startDate, endDate)

      case 'customer_patterns':
        return this.getCustomerPatterns(startDate, endDate)

      default:
        throw new Error(`Unsupported analysis_type: ${args.analysis_type}`)
    }
  }

  // ===== HELPER METHODS =====

  /**
   * Detect timeframe from user message as fallback when OpenAI doesn't provide it
   */
  private detectTimeframeFromMessage(message: string): string | null {
    const lowerMessage = message.toLowerCase()

    if (lowerMessage.includes('today')) return 'today'
    if (lowerMessage.includes('yesterday')) return 'yesterday'
    if (lowerMessage.includes('last week') || lowerMessage.includes('this week')) return 'last_week'
    if (lowerMessage.includes('last month') || lowerMessage.includes('this month')) return 'last_month'

    return null
  }

  private getTimeframeDates(timeframe: string): {
    startDate: Date | null
    endDate: Date | null
  } {
    try {
      // Use Toronto timezone for consistent date calculations with ground truth
      debugTorontoTimes() // Show timezone debug info
      const { startDate, endDate } = getTorontoTimeframeDates(timeframe)
      return { startDate, endDate }
    } catch (error) {
      // Handle additional timeframes not covered by the utility
      const today = getTorontoDate()

      switch (timeframe) {
        case 'last_30_days':
          const last30DaysStart = new Date(today)
          last30DaysStart.setDate(last30DaysStart.getDate() - 30)
          return {
            startDate: last30DaysStart,
            endDate: today,
          }
        case 'last_year':
          const lastYearStart = new Date(today)
          lastYearStart.setFullYear(lastYearStart.getFullYear() - 1)
          return {
            startDate: lastYearStart,
            endDate: today,
          }
        default:
          return { startDate: null, endDate: null }
      }
    }
  }

  private getComparisonDates(
    comparisonPeriod: string,
    referenceDate?: Date | null
  ): { startDate: Date; endDate: Date } {
    if (!referenceDate) {
      throw new Error(
        'Reference date required for comparison period calculation'
      )
    }

    switch (comparisonPeriod) {
      case 'previous_day':
        const prevDay = new Date(referenceDate)
        prevDay.setDate(prevDay.getDate() - 1)
        return {
          startDate: prevDay,
          endDate: referenceDate,
        }
      case 'previous_week':
        const prevWeekStart = new Date(referenceDate)
        prevWeekStart.setDate(prevWeekStart.getDate() - 7)
        const prevWeekEnd = new Date(referenceDate)
        prevWeekEnd.setDate(prevWeekEnd.getDate() - 7)
        return {
          startDate: prevWeekStart,
          endDate: prevWeekEnd,
        }
      // Add more comparison periods as needed
      default:
        throw new Error(`Unsupported comparison period: ${comparisonPeriod}`)
    }
  }

  private async getMetricsForPeriod(
    startDate: Date | null,
    endDate: Date | null,
    metrics: string[]
  ): Promise<QueryResultRow[]> {
    let result: Array<{
      revenue: bigint
      count: bigint
      quantity: bigint
    }>

    if (startDate && endDate) {
      // Separate queries to avoid duplication from LEFT JOIN
      const revenueResult = await prisma.$queryRaw<Array<{revenue: bigint, count: bigint}>>`
        SELECT
          COALESCE(SUM("totalAmount"), 0)::bigint as revenue,
          COUNT(id)::bigint as count
        FROM orders
        WHERE date >= ${startDate} AND date < ${endDate}
      `

      const quantityResult = await prisma.$queryRaw<Array<{quantity: bigint}>>`
        SELECT
          COALESCE(SUM(li.quantity), 0)::bigint as quantity
        FROM line_items li
        JOIN orders o ON li."orderId" = o.id
        WHERE o.date >= ${startDate} AND o.date < ${endDate}
      `

      result = [{
        revenue: revenueResult[0]?.revenue || BigInt(0),
        count: revenueResult[0]?.count || BigInt(0),
        quantity: quantityResult[0]?.quantity || BigInt(0)
      }]
    } else {
      // Separate queries to avoid duplication from LEFT JOIN
      const revenueResult = await prisma.$queryRaw<Array<{revenue: bigint, count: bigint}>>`
        SELECT
          COALESCE(SUM("totalAmount"), 0)::bigint as revenue,
          COUNT(id)::bigint as count
        FROM orders
      `

      const quantityResult = await prisma.$queryRaw<Array<{quantity: bigint}>>`
        SELECT
          COALESCE(SUM(quantity), 0)::bigint as quantity
        FROM line_items
      `

      result = [{
        revenue: revenueResult[0]?.revenue || BigInt(0),
        count: revenueResult[0]?.count || BigInt(0),
        quantity: quantityResult[0]?.quantity || BigInt(0)
      }]
    }

    const data = result[0]
    const revenue = Number(data.revenue) / 100
    const count = Number(data.count)
    const quantity = Number(data.quantity)

    const row: QueryResultRow = {}
    if (metrics.includes('revenue')) row.revenue = revenue
    if (metrics.includes('count')) row.count = count
    if (metrics.includes('quantity')) row.quantity = quantity
    if (metrics.includes('avg_transaction'))
      row.avg_transaction = count > 0 ? revenue / count : 0

    return [row]
  }

  // Placeholder implementations for complex analysis methods
  // These would need full implementations based on specific business requirements

  private async getWeekendVsWeekdayAnalysis(
    metric: string,
    startDate: Date | null,
    endDate: Date | null
  ): Promise<QueryResultRow[]> {
    // Implementation for weekend vs weekday analysis
    return []
  }

  private async getHourlyPatterns(
    metric: string,
    startDate: Date | null,
    endDate: Date | null
  ): Promise<QueryResultRow[]> {
    // Implementation for hourly patterns
    return []
  }

  private async getMonthlyTrends(
    metric: string,
    startDate: Date | null,
    endDate: Date | null
  ): Promise<QueryResultRow[]> {
    // Implementation for monthly trends
    return []
  }

  private async compareSpecificLocations(
    locationA: string,
    locationB: string,
    metric: string,
    startDate: Date | null,
    endDate: Date | null
  ): Promise<QueryResultRow[]> {
    console.log('🔍 DEBUG compareSpecificLocations called:', { locationA, locationB, metric, startDate, endDate })

    // Map location display names to database names
    const locationMap: Record<string, string> = {
      'HQ': 'HQ',
      'Yonge': 'De Mello Coffee - Yonge',
      'Bloor': 'De Mello Coffee - Bloor',
      'Kingston': 'De Mello Coffee - Kingston',
      'The Well': 'De Mello Coffee - The Well',
      'Broadway': 'De Mello Coffee - Broadway'
    }

    const dbLocationA = locationMap[locationA] || locationA
    const dbLocationB = locationMap[locationB] || locationB

    console.log('🔍 DEBUG mapped locations:', { dbLocationA, dbLocationB })

    let query: string
    let params: any[]

    if (startDate && endDate) {
      // Time-filtered query
      query = `
        SELECT
          l.name as location,
          COALESCE(SUM(o."totalAmount"), 0)::bigint as revenue,
          COUNT(o.id)::int as count,
          COALESCE(SUM(o."totalAmount"), 0) / NULLIF(COUNT(o.id), 0) as avg_transaction
        FROM locations l
        LEFT JOIN orders o ON l."squareLocationId" = o."locationId"
          AND o.date >= $3 AND o.date < $4
        WHERE l.name IN ($1, $2)
        GROUP BY l.name
        ORDER BY l.name`
      params = [dbLocationA, dbLocationB, startDate, endDate]
    } else {
      // All-time query
      query = `
        SELECT
          l.name as location,
          COALESCE(SUM(o."totalAmount"), 0)::bigint as revenue,
          COUNT(o.id)::int as count,
          COALESCE(SUM(o."totalAmount"), 0) / NULLIF(COUNT(o.id), 0) as avg_transaction
        FROM locations l
        LEFT JOIN orders o ON l."squareLocationId" = o."locationId"
        WHERE l.name IN ($1, $2)
        GROUP BY l.name
        ORDER BY l.name`
      params = [dbLocationA, dbLocationB]
    }

    const rawResults = await prisma.$queryRawUnsafe(query, ...params)
    console.log('🔍 DEBUG raw query results:', rawResults)

    const results: QueryResultRow[] = []
    for (const data of rawResults as any[]) {
      const row: QueryResultRow = {
        location: data.location,
        revenue: Number(data.revenue) / 100, // Convert cents to dollars
        count: Number(data.count),
        avg_transaction: data.avg_transaction ? Number(data.avg_transaction) / 100 : 0
      }

      // Include the requested metric
      if (metric === 'revenue') {
        row.revenue = Number(data.revenue) / 100
      } else if (metric === 'count') {
        row.count = Number(data.count)
      } else if (metric === 'avg_transaction') {
        row.avg_transaction = data.avg_transaction ? Number(data.avg_transaction) / 100 : 0
      }

      results.push(row)
    }

    console.log('🔍 DEBUG final comparison results:', results)
    return results
  }

  private async getTopVsBottomLocations(
    metric: string,
    startDate: Date | null,
    endDate: Date | null
  ): Promise<QueryResultRow[]> {
    // Implementation for top vs bottom locations
    return []
  }

  private async getAllLocationRankings(
    metric: string,
    startDate: Date | null,
    endDate: Date | null
  ): Promise<QueryResultRow[]> {
    // Implementation for all location rankings
    return []
  }

  private async getLocationMarketShare(
    startDate: Date | null,
    endDate: Date | null
  ): Promise<QueryResultRow[]> {
    // Implementation for location market share
    return []
  }

  private async getTopItemPerLocation(
    metric: string,
    startDate: Date | null,
    endDate: Date | null
  ): Promise<QueryResultRow[]> {
    // Implementation for top item per location
    return []
  }

  private async getItemDistribution(
    item: string,
    metric: string,
    startDate: Date | null,
    endDate: Date | null
  ): Promise<QueryResultRow[]> {
    // Implementation for item distribution
    return []
  }

  private async getLocationWithMostItems(
    startDate: Date | null,
    endDate: Date | null
  ): Promise<QueryResultRow[]> {
    // Implementation for location with most items
    return []
  }

  private async getCrossLocationComparison(
    item: string,
    metric: string,
    startDate: Date | null,
    endDate: Date | null
  ): Promise<QueryResultRow[]> {
    // Implementation for cross location comparison
    return []
  }

  private async getTopCategories(
    startDate: Date | null,
    endDate: Date | null,
    location?: string
  ): Promise<QueryResultRow[]> {
    // Implementation for top categories
    return []
  }

  private async getUniqueItemCount(
    startDate: Date | null,
    endDate: Date | null,
    location?: string
  ): Promise<QueryResultRow[]> {
    // Implementation for unique item count
    return []
  }

  private async getProductMix(
    startDate: Date | null,
    endDate: Date | null,
    location?: string
  ): Promise<QueryResultRow[]> {
    // Implementation for product mix
    return []
  }

  private async getPriceAnalysis(
    startDate: Date | null,
    endDate: Date | null,
    location?: string
  ): Promise<QueryResultRow[]> {
    // Implementation for price analysis
    return []
  }

  private async getBusinessHealthCheck(
    startDate: Date | null,
    endDate: Date | null,
    focusAreas?: string[]
  ): Promise<QueryResultRow[]> {
    // Implementation for business health check
    return []
  }

  private async getLocationCorrelation(
    startDate: Date | null,
    endDate: Date | null
  ): Promise<QueryResultRow[]> {
    // Implementation for location correlation
    return []
  }

  private async getEfficiencyAnalysis(
    startDate: Date | null,
    endDate: Date | null
  ): Promise<QueryResultRow[]> {
    // Implementation for efficiency analysis
    return []
  }

  private async getForecastingAnalysis(
    startDate: Date | null,
    endDate: Date | null
  ): Promise<QueryResultRow[]> {
    // Implementation for forecasting analysis
    return []
  }

  private async getCustomerPatterns(
    startDate: Date | null,
    endDate: Date | null
  ): Promise<QueryResultRow[]> {
    // Implementation for customer patterns
    return []
  }
}

export const functionExecutor = new FunctionExecutor()
