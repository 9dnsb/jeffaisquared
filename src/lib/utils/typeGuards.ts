/**
 * Type guards and validation utilities
 * Provides runtime type checking to eliminate unsafe assignments
 */

import type { ChatMessage } from '../../types/chat'

// HTTP Status Code Constants
const HTTP_STATUS_RANGE = {
  MIN_VALID_STATUS: 100,
  MAX_VALID_STATUS: 600,
} as const

/**
 * Type guard for checking if value is a non-null object
 */
export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Type guard for checking if value is a non-empty string
 */
export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

/**
 * Type guard for checking if value is a positive number
 */
export function isPositiveNumber(value: unknown): value is number {
  return typeof value === 'number' && value > 0 && !isNaN(value) && isFinite(value)
}

/**
 * Type guard for checking if value is a valid Date
 */
export function isValidDate(value: unknown): value is Date {
  return value instanceof Date && !isNaN(value.getTime())
}

/**
 * Type guard for ChatMessage array
 */
export function isChatMessageArray(value: unknown): value is ChatMessage[] {
  if (!Array.isArray(value)) {
    return false
  }

  return value.every(item =>
    isObject(item) &&
    'id' in item &&
    'role' in item &&
    'content' in item &&
    'createdAt' in item &&
    typeof item['id'] === 'string' &&
    (item['role'] === 'user' || item['role'] === 'assistant') &&
    typeof item['content'] === 'string' &&
    isValidDate(item['createdAt'])
  )
}

/**
 * Type guard for checking if object has specific properties
 */
export function hasProperties<T extends Record<string, unknown>>(
  obj: unknown,
  properties: string[]
): obj is T {
  if (!isObject(obj)) {
    return false
  }

  return properties.every(prop => prop in obj)
}

/**
 * Type guard for checking if value is a string array
 */
export function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(item => typeof item === 'string')
}

/**
 * Type guard for checking if value is a number array
 */
export function isNumberArray(value: unknown): value is number[] {
  return Array.isArray(value) && value.every(item => typeof item === 'number')
}

/**
 * Type guard for checking API success response structure
 */
export function isSuccessResponse<T>(
  response: unknown
): response is { success: true; data: T } {
  return (
    isObject(response) &&
    'success' in response &&
    response['success'] === true &&
    'data' in response
  )
}

/**
 * Type guard for checking API error response structure
 */
export function isErrorResponse(
  response: unknown
): response is { success: false; error: string } {
  return (
    isObject(response) &&
    'success' in response &&
    response['success'] === false &&
    'error' in response &&
    typeof response['error'] === 'string'
  )
}

/**
 * Type guard for checking if value is a valid HTTP status code
 */
export function isValidHttpStatus(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= HTTP_STATUS_RANGE.MIN_VALID_STATUS &&
    value < HTTP_STATUS_RANGE.MAX_VALID_STATUS
  )
}

/**
 * Type guard for checking if value is a valid UUID
 */
export function isValidUuid(value: unknown): value is string {
  if (typeof value !== 'string') {
    return false
  }

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(value)
}

/**
 * Type guard for checking metadata structure
 */
export function isValidMetadata(
  value: unknown
): value is { model: string; tokens: number; cost: number; processingTime: number } {
  return (
    isObject(value) &&
    'model' in value &&
    'tokens' in value &&
    'cost' in value &&
    'processingTime' in value &&
    typeof value['model'] === 'string' &&
    typeof value['tokens'] === 'number' &&
    typeof value['cost'] === 'number' &&
    typeof value['processingTime'] === 'number' &&
    value['tokens'] >= 0 &&
    value['cost'] >= 0 &&
    value['processingTime'] >= 0
  )
}

/**
 * Assertion function that throws if condition is false
 */
export function assert(condition: unknown, message = 'Assertion failed'): asserts condition {
  if (!condition) {
    throw new Error(message)
  }
}

/**
 * Assertion function for non-null values
 */
export function assertExists<T>(value: T | null | undefined, message = 'Value does not exist'): asserts value is T {
  if (value === null || value === undefined) {
    throw new Error(message)
  }
}

/**
 * Safe type casting with runtime validation
 */
export function safeCast<T>(
  value: unknown,
  validator: (value: unknown) => value is T,
  errorMessage = 'Type casting failed'
): T {
  if (validator(value)) {
    return value
  }
  throw new Error(errorMessage)
}