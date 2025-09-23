/**
 * OpenAI Rate Limiting Utility
 * Handles exponential backoff for rate limit errors
 * Optimized for high-tier usage limits:
 * - GPT-4o: 450,000 TPM, 5,000 RPM, 1,350,000 TPD
 * - GPT-4o-mini: 2,000,000 TPM, 5,000 RPM, 20,000,000 TPD
 */

import { logger } from '../utils/logger'

export interface RateLimitError extends Error {
  status?: number
  type?: string
}

export class RateLimiter {
  /**
   * Execute function with exponential backoff retry on rate limits
   */
  static async withRetry<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    initialDelay: number = 1000,
    maxDelay: number = 60000
  ): Promise<T> {
    let attempt = 0
    let delay = initialDelay

    while (attempt <= maxRetries) {
      try {
        return await fn()
      } catch (error) {
        attempt++

        // Check if this is a rate limit error
        const isRateLimit = this.isRateLimitError(error)

        if (!isRateLimit || attempt > maxRetries) {
          throw error
        }

        // Calculate delay with exponential backoff and jitter
        const jitter = Math.random() * 0.1 * delay // 10% jitter
        const totalDelay = Math.min(delay + jitter, maxDelay)

        logger.warn(`Rate limit hit, retrying in ${Math.round(totalDelay)}ms`, undefined, {
          attempt,
          maxRetries,
          delay: totalDelay,
          errorMessage: error instanceof Error ? error.message : 'Unknown error'
        })

        await this.sleep(totalDelay)

        // Exponential backoff: double the delay for next attempt
        delay = Math.min(delay * 2, maxDelay)
      }
    }

    throw new Error('Max retries exceeded')
  }

  /**
   * Check if error is from OpenAI rate limiting
   */
  private static isRateLimitError(error: unknown): boolean {
    if (!(error instanceof Error)) return false

    const rateLimitIndicators = [
      'rate_limit_exceeded',
      'rate limit',
      'too many requests',
      'quota exceeded',
      'Rate limit reached'
    ]

    const errorMessage = error.message.toLowerCase()
    const hasStatusCode = (error as any).status === 429
    const hasRateLimitType = (error as any).type === 'rate_limit_exceeded'
    const hasRateLimitMessage = rateLimitIndicators.some(indicator =>
      errorMessage.includes(indicator.toLowerCase())
    )

    return hasStatusCode || hasRateLimitType || hasRateLimitMessage
  }

  /**
   * Sleep for specified milliseconds
   */
  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Add delay between consecutive API calls to prevent rate limiting
   */
  static async rateLimitDelay(delayMs: number = 1000): Promise<void> {
    await this.sleep(delayMs)
  }
}