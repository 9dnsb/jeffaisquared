/**
 * Constants for AI processing and configuration
 */

// Message processing constants
export const MESSAGE_PREVIEW_LENGTH = 200
export const MESSAGE_SLICE_LENGTH = 100
export const CONTEXT_MESSAGE_SLICE_LENGTH = 100
export const CONTEXT_PREVIEW_LENGTH = 200
export const CONTENT_SLICE_LENGTH = 150

// Threshold constants
export const MIN_MESSAGE_LENGTH = 10
export const SHORT_HELP_MESSAGE_LENGTH = 20
export const LONG_CONVERSATION_THRESHOLD = 10
export const SHORT_CONVERSATION_THRESHOLD = 3
export const RECENT_MESSAGE_SLICE_COUNT = -5
export const RECENT_CONTEXT_SLICE_COUNT = -3
export const MAX_QUESTIONS_COUNT = 3

// AI model configuration
export const OPENAI_MAX_TOKENS = 600
export const OPENAI_TEMPERATURE = 0.2
export const OPENAI_DATA_QUERY_MAX_TOKENS = 800
export const OPENAI_DATA_QUERY_TEMPERATURE = 0.1
export const OPENAI_GENERAL_ADVICE_MAX_TOKENS = 1000
export const OPENAI_GENERAL_ADVICE_TEMPERATURE = 0.3

// Performance and processing constants
export const CONTEXT_LIMIT = 150
export const RECORD_SLICE_LIMIT = 50
export const SAMPLE_RECORDS_LIMIT = 3
export const FALLBACK_COST = 0
export const FALLBACK_TOKENS = 0
export const FALLBACK_PROCESSING_TIME = 0

// Query and analysis constants
export const QUERY_RESULT_SLICE_COUNT = -3
export const SIGNIFICANT_CORRELATION_THRESHOLD = 3

// Formatting constants
export const DECIMAL_PLACES = 2

// Default strings
export const DEFAULT_FALLBACK_QUESTION = 'Could you please provide more details about what you are looking for?'
export const UNKNOWN_ERROR_MESSAGE = 'Unknown error'