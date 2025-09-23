/**
 * Timezone utility functions for Toronto Eastern Time
 * Ensures consistent date calculations across ground truth and AI functions
 */

/**
 * Get current date in Toronto timezone
 */
export function getTorontoDate(): Date {
  const now = new Date()

  // Convert to Toronto timezone
  const torontoTime = new Date(now.toLocaleString("en-US", {timeZone: "America/Toronto"}))

  // Create date at midnight Toronto time
  return new Date(torontoTime.getFullYear(), torontoTime.getMonth(), torontoTime.getDate())
}

/**
 * Get date boundaries for timeframes in Toronto timezone
 */
export function getTorontoTimeframeDates(timeframe: string): {
  startDate: Date
  endDate: Date
} {
  const today = getTorontoDate()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  switch (timeframe) {
    case 'today':
      const todayEnd = new Date(today.getTime() + 24 * 60 * 60 * 1000)
      return {
        startDate: today,
        endDate: todayEnd,
      }
    case 'yesterday':
      return {
        startDate: yesterday,
        endDate: today,
      }
    case 'last_week':
      const lastWeekStart = new Date(today)
      lastWeekStart.setDate(lastWeekStart.getDate() - 7)
      return {
        startDate: lastWeekStart,
        endDate: today,
      }
    case 'last_month':
      const lastMonthStart = new Date(today)
      lastMonthStart.setMonth(lastMonthStart.getMonth() - 1)
      return {
        startDate: lastMonthStart,
        endDate: today,
      }
    default:
      throw new Error(`Unsupported timeframe: ${timeframe}`)
  }
}

/**
 * Debug helper to show date calculations
 */
export function debugTorontoTimes() {
  const utcNow = new Date()
  const torontoNow = new Date(utcNow.toLocaleString("en-US", {timeZone: "America/Toronto"}))
  const torontoToday = getTorontoDate()

  console.log('🕐 Timezone Debug:')
  console.log('  UTC Now:', utcNow.toISOString())
  console.log('  Toronto Now:', torontoNow.toString())
  console.log('  Toronto Today (midnight):', torontoToday.toISOString())

  const { startDate, endDate } = getTorontoTimeframeDates('today')
  console.log('  Today range:', startDate.toISOString(), 'to', endDate.toISOString())
}