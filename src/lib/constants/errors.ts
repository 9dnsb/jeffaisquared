/**
 * Centralized error messages to eliminate duplicate strings
 * All error messages should be defined here for consistency and maintainability
 */

// General Error Messages
export const ERROR_MESSAGES = {
  // Generic errors
  UNKNOWN_ERROR: 'An unexpected error occurred',
  INVALID_REQUEST: 'Invalid request format',
  MISSING_REQUIRED_FIELD: 'Missing required field',
  INTERNAL_SERVER_ERROR: 'Internal server error',

  // Authentication and Authorization
  UNAUTHORIZED_ACCESS: 'Unauthorized access',
  INVALID_CREDENTIALS: 'Invalid credentials provided',
  ACCESS_FORBIDDEN: 'Access forbidden',
  SESSION_EXPIRED: 'Session has expired',

  // Validation Errors
  VALIDATION_FAILED: 'Request validation failed',
  INVALID_EMAIL_FORMAT: 'Invalid email format',
  INVALID_DATE_FORMAT: 'Invalid date format',
  FIELD_REQUIRED: 'This field is required',
  FIELD_TOO_LONG: 'Field exceeds maximum length',
  FIELD_TOO_SHORT: 'Field is below minimum length',

  // Conversation Errors
  CONVERSATION_NOT_FOUND: 'Conversation not found',
  CONVERSATION_CREATE_FAILED: 'Failed to create conversation',
  CONVERSATION_UPDATE_FAILED: 'Failed to update conversation',
  CONVERSATION_DELETE_FAILED: 'Failed to delete conversation',
  INVALID_CONVERSATION_ID: 'Invalid conversation ID',

  // Message Errors
  MESSAGE_NOT_FOUND: 'Message not found',
  MESSAGE_CREATE_FAILED: 'Failed to create message',
  MESSAGE_TOO_LONG: 'Message exceeds maximum length',
  EMPTY_MESSAGE: 'Message cannot be empty',

  // AI Service Errors
  AI_SERVICE_UNAVAILABLE: 'AI service is currently unavailable',
  AI_REQUEST_FAILED: 'AI request failed',
  AI_RESPONSE_INVALID: 'Invalid AI response format',
  AI_QUOTA_EXCEEDED: 'AI service quota exceeded',
  AI_TIMEOUT: 'AI request timed out',
  OPENAI_API_ERROR: 'OpenAI API error',

  // Database Errors
  DATABASE_CONNECTION_FAILED: 'Database connection failed',
  DATABASE_QUERY_FAILED: 'Database query failed',
  DATABASE_TIMEOUT: 'Database operation timed out',
  RECORD_NOT_FOUND: 'Record not found',
  DUPLICATE_RECORD: 'Record already exists',

  // Business Logic Errors
  INSUFFICIENT_DATA: 'Insufficient data for analysis',
  INVALID_DATE_RANGE: 'Invalid date range specified',
  NO_DATA_AVAILABLE: 'No data available for the requested period',
  QUERY_TOO_COMPLEX: 'Query is too complex to process',

  // Intent Classification Errors
  INTENT_CLASSIFICATION_FAILED: 'Failed to classify user intent',
  AMBIGUOUS_INTENT: 'User intent is ambiguous',
  UNSUPPORTED_INTENT: 'Intent type not supported',

  // Data Query Errors
  INVALID_QUERY_PARAMETERS: 'Invalid query parameters',
  QUERY_EXECUTION_FAILED: 'Query execution failed',
  QUERY_TIMEOUT: 'Query timed out',
  UNSAFE_QUERY: 'Query failed safety validation',

  // File and Resource Errors
  FILE_NOT_FOUND: 'File not found',
  FILE_READ_ERROR: 'Failed to read file',
  FILE_WRITE_ERROR: 'Failed to write file',
  RESOURCE_LIMIT_EXCEEDED: 'Resource limit exceeded',
} as const

// Success Messages
export const SUCCESS_MESSAGES = {
  CONVERSATION_CREATED: 'Conversation created successfully',
  CONVERSATION_UPDATED: 'Conversation updated successfully',
  CONVERSATION_DELETED: 'Conversation deleted successfully',
  MESSAGE_SENT: 'Message sent successfully',
  DATA_EXPORTED: 'Data exported successfully',
  SETTINGS_SAVED: 'Settings saved successfully',
} as const

// Warning Messages
export const WARNING_MESSAGES = {
  PERFORMANCE_DEGRADED: 'Performance may be degraded',
  USING_FALLBACK: 'Using fallback method',
  PARTIAL_RESULTS: 'Showing partial results',
  RATE_LIMIT_APPROACHING: 'Rate limit approaching',
  QUOTA_WARNING: 'Approaching usage quota',
} as const

// Helper functions for error formatting
export function formatValidationError(field: string, message: string): string {
  return `${field}: ${message}`
}

export function formatApiError(status: number, message: string): string {
  return `API Error ${status}: ${message}`
}

export function formatDatabaseError(operation: string, details?: string): string {
  const base = `Database ${operation} failed`
  return details ? `${base}: ${details}` : base
}

// Type exports
export type ErrorMessage = typeof ERROR_MESSAGES[keyof typeof ERROR_MESSAGES]
export type SuccessMessage = typeof SUCCESS_MESSAGES[keyof typeof SUCCESS_MESSAGES]
export type WarningMessage = typeof WARNING_MESSAGES[keyof typeof WARNING_MESSAGES]