import { logger } from './logger'

export interface DateRange {
  period: string
  start: Date
  end: Date
}

/**
 * Parses natural language date expressions into structured date ranges
 * Handles relative dates, specific months, quarters, and date comparisons
 */
export class DateParser {
  private static readonly MONTH_NAMES = [
    'january', 'february', 'march', 'april', 'may', 'june',
    'july', 'august', 'september', 'october', 'november', 'december'
  ]

  private static readonly MONTH_ABBREV = [
    'jan', 'feb', 'mar', 'apr', 'may', 'jun',
    'jul', 'aug', 'sep', 'oct', 'nov', 'dec'
  ]

  /**
   * Parse natural language date expressions into date ranges
   */
  static parseNaturalLanguage(input: string, referenceDate = new Date()): DateRange[] {
    const cleanInput = input.toLowerCase().trim()
    logger.data('Parsing date expression', cleanInput)

    try {
      // Handle comparison expressions (multiple periods)
      if (this.isComparisonExpression(cleanInput)) {
        return this.parseComparisonDates(cleanInput, referenceDate)
      }

      // Handle single date expressions
      const singleRange = this.parseSingleDateExpression(cleanInput, referenceDate)
      return singleRange ? [singleRange] : []

    } catch (err) {
      logger.error('Date parsing failed', err instanceof Error ? err : new Error(String(err)), {
        input: cleanInput
      })
      return []
    }
  }

  /**
   * Check if input contains comparison keywords
   */
  private static isComparisonExpression(input: string): boolean {
    const comparisonKeywords = ['vs', 'versus', 'compare', 'compared to', 'against']
    return comparisonKeywords.some(keyword => input.includes(keyword))
  }

  /**
   * Parse comparison expressions like "august vs september" or "compare q1 vs q2"
   */
  private static parseComparisonDates(input: string, referenceDate: Date): DateRange[] {
    const ranges: DateRange[] = []

    // Split on comparison keywords
    const parts = input.split(/\s+(?:vs|versus|compared?\s+to|against)\s+/i)

    if (parts.length >= 2) {
      for (const part of parts) {
        const range = this.parseSingleDateExpression(part.trim(), referenceDate)
        if (range) {
          ranges.push(range)
        }
      }
    }

    return ranges
  }

  /**
   * Parse single date expression into a date range
   */
  private static parseSingleDateExpression(input: string, referenceDate: Date): DateRange | null {
    // Remove common prefixes
    const cleanInput = input.replace(/^(in|during|for|from)\s+/i, '')

    // Relative dates
    if (this.isRelativeDate(cleanInput)) {
      return this.parseRelativeDate(cleanInput, referenceDate)
    }

    // Specific months (e.g., "august 2024", "august", "aug 2024")
    const monthRange = this.parseMonthExpression(cleanInput, referenceDate)
    if (monthRange) return monthRange

    // Quarters (e.g., "q1 2024", "quarter 1")
    const quarterRange = this.parseQuarterExpression(cleanInput, referenceDate)
    if (quarterRange) return quarterRange

    // Years (e.g., "2024", "last year")
    const yearRange = this.parseYearExpression(cleanInput, referenceDate)
    if (yearRange) return yearRange

    // Specific dates (e.g., "august 25", "2024-08-25")
    const specificDate = this.parseSpecificDate(cleanInput, referenceDate)
    if (specificDate) return specificDate

    return null
  }

  /**
   * Check if input is a relative date expression
   */
  private static isRelativeDate(input: string): boolean {
    const relativeKeywords = [
      'today', 'yesterday', 'tomorrow',
      'last week', 'this week', 'next week',
      'last month', 'this month', 'next month',
      'last year', 'this year', 'next year',
      'last quarter', 'this quarter', 'next quarter'
    ]
    return relativeKeywords.some(keyword => input.includes(keyword))
  }

  /**
   * Parse relative date expressions
   */
  private static parseRelativeDate(input: string, referenceDate: Date): DateRange | null {
    const now = new Date(referenceDate)

    if (input.includes('today')) {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const end = new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1)
      return { period: 'today', start, end }
    }

    if (input.includes('yesterday')) {
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)
      const start = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate())
      const end = new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1)
      return { period: 'yesterday', start, end }
    }

    if (input.includes('last week')) {
      const lastMonday = new Date(now)
      lastMonday.setDate(now.getDate() - now.getDay() - 6) // Previous Monday
      const start = new Date(lastMonday.getFullYear(), lastMonday.getMonth(), lastMonday.getDate())
      const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000 - 1)
      return { period: 'last_week', start, end }
    }

    if (input.includes('this week')) {
      const thisMonday = new Date(now)
      thisMonday.setDate(now.getDate() - now.getDay() + 1) // This Monday
      const start = new Date(thisMonday.getFullYear(), thisMonday.getMonth(), thisMonday.getDate())
      const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000 - 1)
      return { period: 'this_week', start, end }
    }

    if (input.includes('last month')) {
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const start = lastMonth
      const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999) // Last day of previous month
      return { period: 'last_month', start, end }
    }

    if (input.includes('this month')) {
      const start = new Date(now.getFullYear(), now.getMonth(), 1)
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
      return { period: 'this_month', start, end }
    }

    if (input.includes('last year')) {
      const start = new Date(now.getFullYear() - 1, 0, 1)
      const end = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999)
      return { period: 'last_year', start, end }
    }

    if (input.includes('this year')) {
      const start = new Date(now.getFullYear(), 0, 1)
      const end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999)
      return { period: 'this_year', start, end }
    }

    return null
  }

  /**
   * Parse month expressions like "august 2024", "august", "aug"
   */
  private static parseMonthExpression(input: string, referenceDate: Date): DateRange | null {
    // Match patterns like "august 2024", "aug 2024", "august"
    const monthPattern = /(?:in\s+)?(\w+)(?:\s+(\d{4}))?/i
    const match = input.match(monthPattern)

    if (!match) return null

    const monthStr = match[1].toLowerCase()
    const yearStr = match[2]

    // Find month index
    let monthIndex = this.MONTH_NAMES.indexOf(monthStr)
    if (monthIndex === -1) {
      monthIndex = this.MONTH_ABBREV.indexOf(monthStr)
    }

    if (monthIndex === -1) return null

    // Determine year
    const year = yearStr ? parseInt(yearStr, 10) : referenceDate.getFullYear()

    const start = new Date(year, monthIndex, 1)
    const end = new Date(year, monthIndex + 1, 0, 23, 59, 59, 999) // Last day of month

    const period = `${this.MONTH_NAMES[monthIndex]}_${year}`
    return { period, start, end }
  }

  /**
   * Parse quarter expressions like "q1 2024", "quarter 1", "q1"
   */
  private static parseQuarterExpression(input: string, referenceDate: Date): DateRange | null {
    const quarterPattern = /(?:q|quarter)\s*([1-4])(?:\s+(\d{4}))?/i
    const match = input.match(quarterPattern)

    if (!match) return null

    const quarter = parseInt(match[1], 10)
    const year = match[2] ? parseInt(match[2], 10) : referenceDate.getFullYear()

    const startMonth = (quarter - 1) * 3
    const start = new Date(year, startMonth, 1)
    const end = new Date(year, startMonth + 3, 0, 23, 59, 59, 999) // Last day of quarter

    const period = `q${quarter}_${year}`
    return { period, start, end }
  }

  /**
   * Parse year expressions like "2024", "last year"
   */
  private static parseYearExpression(input: string, _referenceDate: Date): DateRange | null {
    const yearPattern = /^(\d{4})$/
    const match = input.match(yearPattern)

    if (!match) return null

    const year = parseInt(match[1], 10)
    const start = new Date(year, 0, 1)
    const end = new Date(year, 11, 31, 23, 59, 59, 999)

    return { period: `year_${year}`, start, end }
  }

  /**
   * Parse specific dates like "august 25", "2024-08-25"
   */
  private static parseSpecificDate(input: string, referenceDate: Date): DateRange | null {
    // Try ISO date format first
    const isoPattern = /(\d{4})-(\d{1,2})-(\d{1,2})/
    const isoMatch = input.match(isoPattern)

    if (isoMatch) {
      const year = parseInt(isoMatch[1], 10)
      const month = parseInt(isoMatch[2], 10) - 1 // JS months are 0-indexed
      const day = parseInt(isoMatch[3], 10)

      const start = new Date(year, month, day)
      const end = new Date(year, month, day, 23, 59, 59, 999)

      return { period: `${year}-${isoMatch[2]}-${isoMatch[3]}`, start, end }
    }

    // Try "month day" format (e.g., "august 25")
    const monthDayPattern = /(\w+)\s+(\d{1,2})(?:\s+(\d{4}))?/i
    const monthDayMatch = input.match(monthDayPattern)

    if (monthDayMatch) {
      const monthStr = monthDayMatch[1].toLowerCase()
      const day = parseInt(monthDayMatch[2], 10)
      const year = monthDayMatch[3] ? parseInt(monthDayMatch[3], 10) : referenceDate.getFullYear()

      let monthIndex = this.MONTH_NAMES.indexOf(monthStr)
      if (monthIndex === -1) {
        monthIndex = this.MONTH_ABBREV.indexOf(monthStr)
      }

      if (monthIndex === -1) return null

      const start = new Date(year, monthIndex, day)
      const end = new Date(year, monthIndex, day, 23, 59, 59, 999)

      const period = `${year}-${(monthIndex + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`
      return { period, start, end }
    }

    return null
  }

  /**
   * Utility: Format date range for logging/debugging
   */
  static formatDateRange(range: DateRange): string {
    return `${range.period}: ${range.start.toISOString().split('T')[0]} to ${range.end.toISOString().split('T')[0]}`
  }
}