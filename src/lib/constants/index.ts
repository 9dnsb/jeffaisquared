/**
 * Centralized constants to eliminate magic numbers
 * All numeric literals should be defined here with clear semantic meaning
 */

// Chat and Conversation Constants
export const CHAT_CONSTANTS = {
  // Conversation history limits
  CONVERSATION_HISTORY_LIMIT: 10,
  MESSAGE_PREVIEW_LENGTH: 100,
  DEFAULT_MESSAGE_LIMIT: 100,

  // Timeouts (in milliseconds)
  AI_REQUEST_TIMEOUT: 30000,
  DATABASE_TIMEOUT: 10000,

  // Token limits
  MAX_TOKENS_DEFAULT: 1000,
  MAX_TOKENS_LARGE: 2000,

  // Cost calculations (USD per token)
  GPT4_COST_PER_TOKEN: 0.00003,
  GPT4_MINI_COST_PER_TOKEN: 0.000015,

  // Temperature settings
  CLASSIFICATION_TEMPERATURE: 0.1,
  ADVICE_TEMPERATURE: 0.3,
  DATA_SUMMARY_TEMPERATURE: 0.3,
} as const

// HTTP Status Codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500,
} as const

// Database Query Constants
export const DATABASE_CONSTANTS = {
  MAX_RECORDS_DEFAULT: 100,
  MAX_RECORDS_LARGE: 1000,
  TOP_ITEMS_LIMIT: 20,
  SALES_SUMMARY_LIMIT: 100,

  // Query timeouts
  QUERY_TIMEOUT_MS: 5000,
  CONNECTION_TIMEOUT_MS: 10000,
} as const

// Validation Constants
export const VALIDATION_CONSTANTS = {
  MIN_STRING_LENGTH: 1,
  MAX_TITLE_LENGTH: 200,
  MAX_MESSAGE_LENGTH: 10000,
  MAX_USER_MESSAGE_LENGTH: 5000,
  MAX_QUERY_RECORDS: 1000,

  // Content validation
  MIN_ADVICE_LENGTH: 10,
  MAX_ADVICE_LENGTH: 2000,
} as const

// AI Model Constants
export const AI_MODELS = {
  GPT4: 'gpt-4o',
  GPT4_MINI: 'gpt-4o-mini',
  CLASSIFICATION_MODEL: 'gpt-4o-mini',
  ADVICE_MODEL: 'gpt-4o',
  DATA_QUERY_MODEL: 'gpt-4o',
} as const

// Logging Constants
export const LOG_CONSTANTS = {
  MAX_LOG_MESSAGE_LENGTH: 500,
  COST_DECIMAL_PLACES: 6,
  PERFORMANCE_DECIMAL_PLACES: 2,
} as const

// Export type-safe versions
export type ChatConstant = keyof typeof CHAT_CONSTANTS
export type HttpStatus = typeof HTTP_STATUS[keyof typeof HTTP_STATUS]
export type DatabaseConstant = keyof typeof DATABASE_CONSTANTS
export type ValidationConstant = keyof typeof VALIDATION_CONSTANTS
export type AIModel = typeof AI_MODELS[keyof typeof AI_MODELS]