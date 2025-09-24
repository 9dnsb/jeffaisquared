/**
 * Timezone utility functions for Toronto Eastern Time
 * Ensures consistent date calculations across ground truth and AI functions
 */

/**
 * Get current date in Toronto timezone, converted to UTC for database queries
 * This matches the logic in get-todays-sales.js
 */
export function getTorontoDate(): Date {
  const now = new Date()
  const torontoToday = new Date(now.toLocaleString("en-US", { timeZone: "America/Toronto" }))

  // Set to start of day in Toronto (00:00:00)
  const startOfDayToronto = new Date(torontoToday)
  startOfDayToronto.setHours(0, 0, 0, 0)

  // Convert Toronto time to UTC for database query (matches get-todays-sales.js logic)
  const startOfDayUTC = new Date(startOfDayToronto.getTime() + (startOfDayToronto.getTimezoneOffset() * 60000))

  return startOfDayUTC
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

  // Calculate end of day boundaries to match get-todays-sales.js logic
  const torontoTodayEnd = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Toronto" }))
  torontoTodayEnd.setHours(23, 59, 59, 999)
  const todayEndUTC = new Date(torontoTodayEnd.getTime() + (torontoTodayEnd.getTimezoneOffset() * 60000))

  console.log('🕐 Timezone Debug:')
  console.log('  UTC Now:', utcNow.toISOString())
  console.log('  Toronto Now:', torontoNow.toString())
  console.log('  Toronto Today (midnight):', torontoToday.toISOString())
  console.log('  Today range:', torontoToday.toISOString(), 'to', todayEndUTC.toISOString())
}