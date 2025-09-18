/**
 * Shared serialization utilities
 * Eliminates code duplication and ensures consistent serialization across the app
 */

import type { LogData } from './logger'
import { LOG_CONSTANTS } from '../constants'

/**
 * Serializes complex filter objects for logging purposes
 * Converts nested objects, arrays, and dates to simple string representations
 */
export function serializeFiltersForLogging(filters: unknown): LogData {
  if (!filters || typeof filters !== 'object') {
    return typeof filters === 'string' ? filters : '[no_data]'
  }

  const serialized: Record<string, string | number | boolean | null> = {}

  for (const [key, value] of Object.entries(filters)) {
    serialized[key] = serializeValue(value)
  }

  return serialized
}

/**
 * Serializes a single value for logging
 */
function serializeValue(value: unknown): string | number | boolean | null {
  if (value === null || value === undefined) {
    return null
  }

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value
  }

  if (value instanceof Date) {
    return value.toISOString()
  }

  if (Array.isArray(value)) {
    return value.length > 0 ? value.join(', ') : 'empty_array'
  }

  if (typeof value === 'object') {
    try {
      return JSON.stringify(value)
    } catch {
      return '[complex_object]'
    }
  }

  return String(value)
}

/**
 * Serializes error objects for consistent error handling
 */
export function serializeError(error: unknown): { message: string; stack?: string } {
  if (error instanceof Error) {
    return {
      message: error.message,
      stack: error.stack
    }
  }

  if (typeof error === 'string') {
    return { message: error }
  }

  if (typeof error === 'object' && error !== null && 'message' in error) {
    return {
      message: String((error as { message: unknown }).message)
    }
  }

  return { message: 'Unknown error occurred' }
}

/**
 * Safely extracts string values from unknown objects
 */
export function extractString(obj: unknown, key: string, defaultValue = ''): string {
  if (typeof obj === 'object' && obj !== null && key in obj) {
    const value = (obj as Record<string, unknown>)[key]
    return typeof value === 'string' ? value : defaultValue
  }
  return defaultValue
}

/**
 * Safely extracts number values from unknown objects
 */
export function extractNumber(obj: unknown, key: string, defaultValue = 0): number {
  if (typeof obj === 'object' && obj !== null && key in obj) {
    const value = (obj as Record<string, unknown>)[key]
    return typeof value === 'number' ? value : defaultValue
  }
  return defaultValue
}

/**
 * Safely extracts boolean values from unknown objects
 */
export function extractBoolean(obj: unknown, key: string, defaultValue = false): boolean {
  if (typeof obj === 'object' && obj !== null && key in obj) {
    const value = (obj as Record<string, unknown>)[key]
    return typeof value === 'boolean' ? value : defaultValue
  }
  return defaultValue
}

/**
 * Type guard to check if an object has required properties
 */
export function hasRequiredProperties<T extends Record<string, unknown>>(
  obj: unknown,
  properties: (keyof T)[]
): obj is T {
  if (typeof obj !== 'object' || obj === null) {
    return false
  }

  return properties.every(prop => prop in obj)
}

/**
 * Safely parses JSON with error handling
 */
export function safeJsonParse<T = unknown>(jsonString: string): { success: true; data: T } | { success: false; error: string } {
  try {
    const data = JSON.parse(jsonString) as T
    return { success: true, data }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Invalid JSON'
    }
  }
}

/**
 * Truncates strings to specified length for logging
 */
export function truncateForLogging(str: string, maxLength = LOG_CONSTANTS.MAX_LOG_MESSAGE_LENGTH): string {
  if (str.length <= maxLength) {
    return str
  }
  return `${str.slice(0, maxLength)}...`
}

/**
 * Sanitizes data for logging (removes sensitive information)
 */
export function sanitizeForLogging(data: Record<string, unknown>): Record<string, unknown> {
  const sensitiveKeys = ['password', 'token', 'secret', 'key', 'authorization']
  const sanitized: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(data)) {
    const lowerKey = key.toLowerCase()
    if (sensitiveKeys.some(sensitive => lowerKey.includes(sensitive))) {
      sanitized[key] = '[REDACTED]'
    } else {
      sanitized[key] = value
    }
  }

  return sanitized
}