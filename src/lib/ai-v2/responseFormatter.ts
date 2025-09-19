/**
 * AI-powered response formatter
 * Generates natural language summaries of query results
 */

import { logger } from '../utils/logger'
import { openaiClient } from './openaiClient'
import { locationMapper } from './locationMapper'
import type { QueryResult, QueryResultRow } from './types'

export class ResponseFormatter {
  /**
   * Generate natural language summary of query results
   */
  async formatResponse(
    userQuery: string,
    queryResult: QueryResult
  ): Promise<QueryResult> {
    const timer = logger.startTimer('Response Formatting')

    try {
      if (!queryResult.success || queryResult.data.length === 0) {
        return {
          ...queryResult,
          summary: 'No data found matching your criteria. Please try adjusting your search parameters.'
        }
      }

      logger.ai('Generating response summary', undefined, {
        recordCount: queryResult.data.length,
        queryPlan: queryResult.metadata.queryPlan
      })

      // Generate AI summary
      const aiResult = await this.generateAISummary(userQuery, queryResult)

      if (!aiResult.success) {
        // Use fallback summary if AI fails
        const fallbackSummary = this.generateFallbackSummary(queryResult)
        return {
          ...queryResult,
          summary: fallbackSummary
        }
      }

      const duration = timer()

      logger.success('Response formatting completed', undefined, {
        processingTime: duration,
        summaryLength: aiResult.content.length
      })

      return {
        ...queryResult,
        summary: aiResult.content
      }

    } catch (err) {
      const duration = timer()
      const error = err instanceof Error ? err : new Error('Response formatting failed')

      logger.error('Response formatting failed', error, {
        processingTime: duration
      })

      return {
        ...queryResult,
        summary: this.generateFallbackSummary(queryResult)
      }
    }
  }

  /**
   * Generate AI-powered summary
   */
  private async generateAISummary(userQuery: string, queryResult: QueryResult) {
    const systemPrompt = `You are a sales analytics assistant. Generate clear, insightful summaries of sales data query results.

CRITICAL RULES:
- ONLY use the exact data provided in the "Query Results" section
- NEVER make up numbers, percentages, or trends that aren't in the actual data
- If no data is provided or data shows zero/null values, clearly state that
- Do NOT invent comparisons to "previous periods" unless that data is explicitly provided
- Do NOT create fictional growth percentages or trends
- Format numbers clearly with appropriate units (e.g., $1,234.56, 45 items)

RESPONSE GUIDELINES:
- Be conversational and helpful
- Use ONLY the specific numbers from the provided data
- If the query was grouped (by location, time, item), highlight the breakdown
- If multiple metrics were requested, address each one
- Keep responses concise but thorough
- Answer the specific question asked

FORMATTING:
- Use bullet points for breakdowns when appropriate
- Format monetary amounts with dollar signs and commas
- Round percentages to 1 decimal place when calculating from provided data
- Use clear headings for different sections if the data is complex

Your goal is to help business owners understand their ACTUAL data accurately.`

    const userPrompt = this.buildUserPrompt(userQuery, queryResult)

    return await openaiClient.makeRequest([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ])
  }

  /**
   * Build user prompt with query results
   */
  private buildUserPrompt(userQuery: string, queryResult: QueryResult): string {
    const { data, metadata } = queryResult
    const { extractedParams } = metadata

    const dataSummary = this.formatDataForAI(data)

    return `User asked: "${userQuery}"

Query details:
- Grouped by: ${extractedParams.groupBy.length > 0 ? extractedParams.groupBy.join(', ') : 'No grouping (aggregate summary)'}
- Metrics calculated: ${extractedParams.metrics.join(', ')}
- Date range: ${this.formatDateRange(extractedParams.startDate, extractedParams.endDate)}
- Locations: ${this.formatLocationFilter(extractedParams.locationIds)}
- Items: ${extractedParams.itemNames.length > 0 ? extractedParams.itemNames.join(', ') : 'All items'}

Query Results:
${dataSummary}

Generate a helpful response that answers their question using ONLY the data shown above. Do not add any information that is not present in the query results.`
  }

  /**
   * Format query results for AI consumption
   */
  private formatDataForAI(data: QueryResultRow[]): string {
    if (data.length === 0) {
      return 'No data found for the specified criteria.'
    }

    const lines: string[] = []
    lines.push(`Total records: ${data.length}`)

    // Check if this is grouped data
    const hasGrouping = data.some(row =>
      row.location || row.item || row.month || row.date
    )

    if (hasGrouping) {
      lines.push('\nBreakdown:')
      data.forEach((row, index) => {
        const dimensionParts: string[] = []

        if (row.location) dimensionParts.push(`Location: ${row.location}`)
        if (row.item) dimensionParts.push(`Item: ${row.item}`)
        if (row.month) dimensionParts.push(`Month: ${row.month}`)
        if (row.date) dimensionParts.push(`Date: ${row.date}`)

        const metricParts: string[] = []
        if (row.revenue !== undefined) metricParts.push(`Revenue: ${this.formatCurrency(row.revenue)}`)
        if (row.count !== undefined) metricParts.push(`Count: ${row.count}`)
        if (row.quantity !== undefined) metricParts.push(`Quantity: ${row.quantity}`)
        if (row.avg_transaction !== undefined) metricParts.push(`Avg Transaction: ${this.formatCurrency(row.avg_transaction)}`)
        if (row.avg_item_price !== undefined) metricParts.push(`Avg Item Price: ${this.formatCurrency(row.avg_item_price)}`)

        const dimensions = dimensionParts.join(', ')
        const metrics = metricParts.join(', ')

        lines.push(`  ${index + 1}. ${dimensions} → ${metrics}`)
      })
    } else {
      // Single aggregate result
      const row = data[0]
      lines.push('\nAggregate results:')

      if (row.revenue !== undefined) lines.push(`  Revenue: ${this.formatCurrency(row.revenue)}`)
      if (row.count !== undefined) lines.push(`  Count: ${row.count}`)
      if (row.quantity !== undefined) lines.push(`  Quantity: ${row.quantity}`)
      if (row.avg_transaction !== undefined) lines.push(`  Avg Transaction: ${this.formatCurrency(row.avg_transaction)}`)
      if (row.avg_item_price !== undefined) lines.push(`  Avg Item Price: ${this.formatCurrency(row.avg_item_price)}`)
    }

    return lines.join('\n')
  }

  /**
   * Format currency values
   */
  private formatCurrency(value: number): string {
    return `$${value.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`
  }

  /**
   * Format date range for display
   */
  private formatDateRange(startDate?: Date, endDate?: Date): string {
    if (!startDate && !endDate) {
      return 'All available data'
    }

    if (startDate && endDate) {
      return `${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`
    }

    if (startDate) {
      return `From ${startDate.toISOString().split('T')[0]}`
    }

    if (endDate) {
      return `Up to ${endDate.toISOString().split('T')[0]}`
    }

    return 'All available data'
  }

  /**
   * Format location filter for display
   */
  private formatLocationFilter(locationIds: string[]): string {
    if (locationIds.length === 0) {
      return 'All locations'
    }

    const locationNames = locationIds.map(id => locationMapper.getLocationName(id))
    return locationNames.join(', ')
  }

  /**
   * Generate fallback summary when AI fails
   */
  private generateFallbackSummary(queryResult: QueryResult): string {
    const { data, metadata } = queryResult
    const count = data.length

    if (count === 0) {
      return 'No data found matching your criteria.'
    }

    const { extractedParams } = metadata

    // Build basic summary
    const parts: string[] = []

    if (extractedParams.groupBy.length > 0) {
      parts.push(`Found ${count} result${count === 1 ? '' : 's'} grouped by ${extractedParams.groupBy.join(' and ')}.`)
    } else {
      parts.push('Here are your aggregate results:')
    }

    // Add key metrics if available
    if (data.length === 1 && !extractedParams.groupBy.length) {
      const row = data[0]
      const metrics: string[] = []

      if (row.revenue !== undefined) metrics.push(`Revenue: ${this.formatCurrency(row.revenue)}`)
      if (row.count !== undefined) metrics.push(`Transactions: ${row.count}`)
      if (row.quantity !== undefined) metrics.push(`Quantity: ${row.quantity}`)

      if (metrics.length > 0) {
        parts.push(metrics.join(', '))
      }
    }

    return parts.join(' ')
  }
}

export const responseFormatter = new ResponseFormatter()