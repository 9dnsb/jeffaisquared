/**
 * Dynamic Date Parser - Converts natural language time periods to date ranges
 * Supports any user-requested time period like "last 2 days", "this month", "last 4 months", etc.
 */

import { getTorontoDate } from '../../utils/timezone'

export interface DateRange {
  startDate: Date
  endDate: Date
  description: string
}

export interface ParseResult {
  success: boolean
  dateRange?: DateRange
  error?: string
  originalInput: string
}

/**
 * Helper function to calculate date ranges for "last X" and "past X" patterns
 */
function calculateRelativeDateRange(
  now: Date,
  num: number,
  unit: string,
  descriptionPrefix: string
): DateRange {
  const endDate = new Date(now)
  endDate.setHours(23, 59, 59, 999)
  const startDate = new Date(now)

  switch (unit) {
    case 'day':
      startDate.setDate(startDate.getDate() - num)
      break
    case 'week':
      startDate.setDate(startDate.getDate() - (num * 7))
      break
    case 'month':
      startDate.setMonth(startDate.getMonth() - num)
      break
    case 'year':
      startDate.setFullYear(startDate.getFullYear() - num)
      break
  }
  startDate.setHours(0, 0, 0, 0)

  return {
    startDate,
    endDate,
    description: `${descriptionPrefix} ${num} ${unit}${num > 1 ? 's' : ''}`
  }
}

/**
 * Parse natural language time periods into date ranges
 */
export function parseDynamicTimeframe(input: string): ParseResult {
  const originalInput = input
  const lowerInput = input.toLowerCase().trim()
  const now = getTorontoDate()

  try {
    // Handle "today" and "yesterday"
    if (lowerInput === 'today') {
      const startOfToday = new Date(now)
      startOfToday.setHours(0, 0, 0, 0)
      const endOfToday = new Date(now)
      endOfToday.setHours(23, 59, 59, 999)

      return {
        success: true,
        dateRange: {
          startDate: startOfToday,
          endDate: endOfToday,
          description: 'Today'
        },
        originalInput
      }
    }

    if (lowerInput === 'yesterday') {
      const yesterday = new Date(now)
      yesterday.setDate(yesterday.getDate() - 1)
      const startOfYesterday = new Date(yesterday)
      startOfYesterday.setHours(0, 0, 0, 0)
      const endOfYesterday = new Date(yesterday)
      endOfYesterday.setHours(23, 59, 59, 999)

      return {
        success: true,
        dateRange: {
          startDate: startOfYesterday,
          endDate: endOfYesterday,
          description: 'Yesterday'
        },
        originalInput
      }
    }

    // Handle "this week", "this month", "this year"
    if (lowerInput.includes('this week')) {
      const startOfWeek = new Date(now)
      const dayOfWeek = startOfWeek.getDay() // 0 = Sunday, 1 = Monday, etc.
      const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1 // Make Monday the start
      startOfWeek.setDate(startOfWeek.getDate() - daysToSubtract)
      startOfWeek.setHours(0, 0, 0, 0)

      const endOfWeek = new Date(startOfWeek)
      endOfWeek.setDate(endOfWeek.getDate() + 6)
      endOfWeek.setHours(23, 59, 59, 999)

      return {
        success: true,
        dateRange: {
          startDate: startOfWeek,
          endDate: endOfWeek,
          description: 'This week'
        },
        originalInput
      }
    }

    if (lowerInput.includes('this month')) {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)

      return {
        success: true,
        dateRange: {
          startDate: startOfMonth,
          endDate: endOfMonth,
          description: 'This month'
        },
        originalInput
      }
    }

    if (lowerInput.includes('this year')) {
      const startOfYear = new Date(now.getFullYear(), 0, 1)
      const endOfYear = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999)

      return {
        success: true,
        dateRange: {
          startDate: startOfYear,
          endDate: endOfYear,
          description: 'This year'
        },
        originalInput
      }
    }

    // Handle "last X days/weeks/months/years" patterns
    const lastXPattern = /last\s+(\d+)\s+(day|week|month|year)s?/i
    const lastXMatch = lowerInput.match(lastXPattern)
    if (lastXMatch) {
      const [, number, unit] = lastXMatch
      const num = parseInt(number, 10)
      const dateRange = calculateRelativeDateRange(now, num, unit, 'Last')

      return {
        success: true,
        dateRange,
        originalInput
      }
    }

    // Handle "last week", "last month", "last year" (singular)
    if (lowerInput.includes('last week')) {
      const lastWeekStart = new Date(now)
      const dayOfWeek = now.getDay()
      const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1 // Make Monday the start
      lastWeekStart.setDate(lastWeekStart.getDate() - daysToSubtract - 7)
      lastWeekStart.setHours(0, 0, 0, 0)

      const lastWeekEnd = new Date(lastWeekStart)
      lastWeekEnd.setDate(lastWeekEnd.getDate() + 6)
      lastWeekEnd.setHours(23, 59, 59, 999)

      return {
        success: true,
        dateRange: {
          startDate: lastWeekStart,
          endDate: lastWeekEnd,
          description: 'Last week'
        },
        originalInput
      }
    }

    if (lowerInput.includes('last month')) {
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999)

      return {
        success: true,
        dateRange: {
          startDate: lastMonthStart,
          endDate: lastMonthEnd,
          description: 'Last month'
        },
        originalInput
      }
    }

    if (lowerInput.includes('last year')) {
      const lastYearStart = new Date(now.getFullYear() - 1, 0, 1)
      const lastYearEnd = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999)

      return {
        success: true,
        dateRange: {
          startDate: lastYearStart,
          endDate: lastYearEnd,
          description: 'Last year'
        },
        originalInput
      }
    }

    // Handle specific month names and years (e.g., "August 2025", "July 2025")
    const monthYearPattern = /(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{4})/i
    const monthYearMatch = lowerInput.match(monthYearPattern)
    if (monthYearMatch) {
      const [, monthName, yearStr] = monthYearMatch
      const year = parseInt(yearStr, 10)
      const monthIndex = [
        'january', 'february', 'march', 'april', 'may', 'june',
        'july', 'august', 'september', 'october', 'november', 'december'
      ].indexOf(monthName.toLowerCase())

      const startDate = new Date(year, monthIndex, 1)
      const endDate = new Date(year, monthIndex + 1, 0, 23, 59, 59, 999)

      return {
        success: true,
        dateRange: {
          startDate,
          endDate,
          description: `${monthName.charAt(0).toUpperCase() + monthName.slice(1)} ${year}`
        },
        originalInput
      }
    }

    // Handle "last 30 days", "last 90 days" specifically
    if (lowerInput.includes('last 30 days')) {
      const endDate = new Date(now)
      endDate.setHours(23, 59, 59, 999)
      const startDate = new Date(now)
      startDate.setDate(startDate.getDate() - 30)
      startDate.setHours(0, 0, 0, 0)

      return {
        success: true,
        dateRange: {
          startDate,
          endDate,
          description: 'Last 30 days'
        },
        originalInput
      }
    }

    // Handle "past X days/weeks/months" patterns
    const pastXPattern = /(?:past|previous)\s+(\d+)\s+(day|week|month|year)s?/i
    const pastXMatch = lowerInput.match(pastXPattern)
    if (pastXMatch) {
      const [, number, unit] = pastXMatch
      const num = parseInt(number, 10)
      const dateRange = calculateRelativeDateRange(now, num, unit, 'Past')

      return {
        success: true,
        dateRange,
        originalInput
      }
    }

    // Handle quarter references (Q1, Q2, Q3, Q4)
    const quarterPattern = /q([1-4])\s+(\d{4})/i
    const quarterMatch = lowerInput.match(quarterPattern)
    if (quarterMatch) {
      const [, quarterNum, yearStr] = quarterMatch
      const year = parseInt(yearStr, 10)
      const quarter = parseInt(quarterNum, 10)

      const quarterStartMonth = (quarter - 1) * 3
      const startDate = new Date(year, quarterStartMonth, 1)
      const endDate = new Date(year, quarterStartMonth + 3, 0, 23, 59, 59, 999)

      return {
        success: true,
        dateRange: {
          startDate,
          endDate,
          description: `Q${quarter} ${year}`
        },
        originalInput
      }
    }

    // Handle year-only references
    const yearPattern = /^\s*(\d{4})\s*$/
    const yearMatch = lowerInput.match(yearPattern)
    if (yearMatch) {
      const [, yearStr] = yearMatch
      const year = parseInt(yearStr, 10)

      const startDate = new Date(year, 0, 1)
      const endDate = new Date(year, 11, 31, 23, 59, 59, 999)

      return {
        success: true,
        dateRange: {
          startDate,
          endDate,
          description: `Year ${year}`
        },
        originalInput
      }
    }

    // If no pattern matches, return failure
    return {
      success: false,
      error: `Unable to parse time period: "${input}". Supported formats include: today, yesterday, this week, this month, last X days/weeks/months, August 2025, Q1 2024, 2025, etc.`,
      originalInput
    }

  } catch (error) {
    return {
      success: false,
      error: `Error parsing time period "${input}": ${error instanceof Error ? error.message : 'Unknown error'}`,
      originalInput
    }
  }
}

/**
 * Get a list of example time periods that can be parsed
 */
export function getSupportedTimeframExamples(): string[] {
  return [
    'today',
    'yesterday',
    'this week',
    'this month',
    'this year',
    'last week',
    'last month',
    'last year',
    'last 2 days',
    'last 3 weeks',
    'last 4 months',
    'last 30 days',
    'past 90 days',
    'August 2025',
    'July 2025',
    'Q1 2024',
    'Q2 2025',
    '2024',
    '2025'
  ]
}

/**
 * Test the dynamic date parser with various inputs
 */
export function testDynamicDateParser(): void {
  const testCases = [
    'today',
    'yesterday',
    'this week',
    'this month',
    'last 2 days',
    'last 3 weeks',
    'last 4 months',
    'August 2025',
    'Q1 2024',
    '2025',
    'invalid input'
  ]

  console.log('=== Dynamic Date Parser Test Results ===')

  for (const testCase of testCases) {
    const result = parseDynamicTimeframe(testCase)
    console.log(`Input: "${testCase}"`)
    console.log(`Success: ${result.success}`)

    if (result.success && result.dateRange) {
      console.log(`Range: ${result.dateRange.startDate.toISOString()} to ${result.dateRange.endDate.toISOString()}`)
      console.log(`Description: ${result.dateRange.description}`)
    } else {
      console.log(`Error: ${result.error}`)
    }
    console.log('---')
  }
}