/**
 * Type-safe validation schemas using Zod
 * Eliminates use of 'unknown' type and provides comprehensive validation
 */

import { z } from 'zod'
import { logger } from '../utils/logger'
import { VALIDATION_CONSTANTS } from '../constants'
import { ERROR_MESSAGES } from '../constants/errors'

// Validation timing wrapper for performance logging
function validateWithLogging<T>(
  schema: z.ZodSchema<T>,
  data: object | string,
  context: string
): { success: boolean; data?: T; error?: string } {
  const timer = logger.startTimer(`Validation: ${context}`)

  try {
    const logData = typeof data === 'string' ? data : undefined
    const metadata = typeof data === 'object' ? { dataKeys: Object.keys(data).join(', ') } : { dataType: typeof data }

    logger.debug(`Starting validation for ${context}`, logData, metadata)

    const validatedData = schema.parse(data)
    const duration = timer()

    logger.success(`Validation successful for ${context}`, undefined, {
      processingTime: duration
    })

    return { success: true, data: validatedData }
  } catch (err) {
    const duration = timer()

    if (err instanceof z.ZodError) {
      const errorMessage = err.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).join(', ')
      logger.error(`Validation failed for ${context}: ${errorMessage}`, err, {
        processingTime: duration,
        validationErrorCount: err.issues.length
      })
      return { success: false, error: errorMessage }
    }

    logger.error(`Unexpected validation error for ${context}`, err instanceof Error ? err : new Error(String(err)), {
      processingTime: duration
    })
    return { success: false, error: ERROR_MESSAGES.VALIDATION_FAILED }
  }
}

// Base chat message schemas
const chatMessageMetadataSchema = z.object({
  intent: z.enum(['data_query', 'general_advice', 'clarification']).optional(),
  intentConfidence: z.number().min(0).max(1).optional(),
  model: z.string().optional(),
  tokens: z.number().int().min(0).optional(),
  cost: z.number().min(0).optional(),
  processingTime: z.number().min(0).optional(),
  timestampStart: z.string().optional(),
  timestampEnd: z.string().optional(),
  userId: z.string().optional(),
  conversationId: z.string().optional(),
  queryType: z.string().optional(),
  queryPlan: z.string().optional(),
  dataSource: z.string().optional(),
  recordCount: z.number().int().min(0).optional(),
  filters: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])).optional(),
  validationErrors: z.array(z.string()).optional(),
  errorDetails: z.string().optional()
})

// Note: chatMessageSchema removed as it was only used for type inference

// Request schemas
const chatRequestSchema = z.object({
  message: z.string().min(VALIDATION_CONSTANTS.MIN_STRING_LENGTH, ERROR_MESSAGES.EMPTY_MESSAGE),
  conversationId: z.string().optional(),
  context: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional()
})

const createConversationSchema = z.object({
  title: z.string()
    .min(VALIDATION_CONSTANTS.MIN_STRING_LENGTH, ERROR_MESSAGES.FIELD_REQUIRED)
    .max(VALIDATION_CONSTANTS.MAX_TITLE_LENGTH, ERROR_MESSAGES.FIELD_TOO_LONG)
})

const updateConversationSchema = z.object({
  title: z.string()
    .min(VALIDATION_CONSTANTS.MIN_STRING_LENGTH, ERROR_MESSAGES.FIELD_REQUIRED)
    .max(VALIDATION_CONSTANTS.MAX_TITLE_LENGTH, ERROR_MESSAGES.FIELD_TOO_LONG)
    .optional()
})

// Message persistence schema
const persistMessageSchema = z.object({
  conversationId: z.string().min(1),
  role: z.enum(['user', 'assistant']),
  content: z.string().min(VALIDATION_CONSTANTS.MIN_STRING_LENGTH).max(VALIDATION_CONSTANTS.MAX_MESSAGE_LENGTH),
  metadata: chatMessageMetadataSchema.nullable().optional()
})

// AI response schemas
const aiMetadataSchema = z.object({
  model: z.string().min(1),
  tokens: z.number().int().min(0),
  cost: z.number().min(0),
  processingTime: z.number().min(0)
})

const intentClassificationResponseSchema = z.object({
  intent: z.enum(['data_query', 'general_advice', 'clarification']),
  confidence: z.number().min(0).max(1),
  reasoning: z.string().optional(),
  metadata: aiMetadataSchema
})

const dataQueryResultSchema = z.object({
  success: z.boolean(),
  data: z.any().optional(), // Allow any data structure from Prisma
  summary: z.string(),
  queryPlan: z.string(),
  queryType: z.string(),
  recordCount: z.number().int().min(0).optional(),
  metadata: z.object({
    processingTime: z.number().min(0),
    prismaQuery: z.string(),
    filters: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()]))
  }),
  error: z.string().optional()
})

const generalAdviceResultSchema = z.object({
  success: z.boolean(),
  advice: z.string().min(VALIDATION_CONSTANTS.MIN_ADVICE_LENGTH),
  actionItems: z.array(z.string()).optional(),
  metadata: aiMetadataSchema,
  error: z.string().optional()
})

const clarificationResultSchema = z.object({
  success: z.boolean(),
  questions: z.array(z.string().min(1)),
  suggestedFilters: z.record(z.string(), z.union([
    z.array(z.string()),
    z.record(z.string(), z.string())
  ])).optional(),
  metadata: aiMetadataSchema,
  error: z.string().optional()
})

// Prisma query schemas
const prismaQueryParamsSchema = z.object({
  table: z.enum(['Sale', 'SaleItem', 'Location', 'Item']),
  operation: z.enum(['findMany', 'findFirst', 'count', 'aggregate']),
  where: z.record(z.string(), z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.date(),
    z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.date(), z.null()])),
    z.null()
  ])).optional(),
  select: z.record(z.string(), z.boolean()).optional(),
  include: z.record(z.string(), z.union([z.boolean(), z.record(z.string(), z.boolean())])).optional(),
  orderBy: z.record(z.string(), z.enum(['asc', 'desc'])).optional(),
  take: z.number().int().min(1).max(VALIDATION_CONSTANTS.MAX_QUERY_RECORDS).optional(),
  skip: z.number().int().min(0).optional()
})

// OpenAI request/response schemas
const openaiRequestSchema = z.object({
  model: z.string().min(1),
  messages: z.array(z.object({
    role: z.enum(['system', 'user', 'assistant']),
    content: z.string().min(1)
  })),
  temperature: z.number().min(0).max(2).optional(),
  max_tokens: z.number().int().min(1).optional(),
  top_p: z.number().min(0).max(1).optional()
})

const openaiResponseSchema = z.object({
  id: z.string(),
  object: z.literal('chat.completion'),
  created: z.number(),
  model: z.string(),
  choices: z.array(z.object({
    index: z.number(),
    message: z.object({
      role: z.enum(['assistant']),
      content: z.string()
    }),
    finish_reason: z.enum(['stop', 'length', 'function_call', 'content_filter']).nullable()
  })),
  usage: z.object({
    prompt_tokens: z.number().int().min(0),
    completion_tokens: z.number().int().min(0),
    total_tokens: z.number().int().min(0)
  })
})

// Configuration schemas
const chatConfigSchema = z.object({
  OPENAI_API_KEY: z.string().min(1),
  OPENAI_ORGANIZATION: z.string().optional()
  // DATABASE_URL removed - not needed for client-side validation
})

// Export validation helper functions that accept any input type
export function validateChatRequest(data: object) {
  return validateWithLogging(chatRequestSchema, data, 'Chat Request')
}

export function validateIntentClassification(data: object) {
  return validateWithLogging(intentClassificationResponseSchema, data, 'Intent Classification')
}

export function validateDataQueryResult(data: object) {
  return validateWithLogging(dataQueryResultSchema, data, 'Data Query Result')
}

export function validateGeneralAdviceResult(data: object) {
  return validateWithLogging(generalAdviceResultSchema, data, 'General Advice Result')
}

export function validateClarificationResult(data: object) {
  return validateWithLogging(clarificationResultSchema, data, 'Clarification Result')
}

export function validatePrismaQuery(data: object) {
  return validateWithLogging(prismaQueryParamsSchema, data, 'Prisma Query')
}

export function validateOpenAIRequest(data: object) {
  return validateWithLogging(openaiRequestSchema, data, 'OpenAI Request')
}

export function validateOpenAIResponse(data: object) {
  return validateWithLogging(openaiResponseSchema, data, 'OpenAI Response')
}

export function validateChatConfig(data: object) {
  return validateWithLogging(chatConfigSchema, data, 'Chat Configuration')
}

export function validateConversationCreation(data: object) {
  return validateWithLogging(createConversationSchema, data, 'Create Conversation')
}

export function validateConversationUpdate(data: object) {
  return validateWithLogging(updateConversationSchema, data, 'Update Conversation')
}

export function validateMessagePersistence(data: object) {
  return validateWithLogging(persistMessageSchema, data, 'Message Persistence')
}

// Type exports for external use
export type ChatRequestType = z.infer<typeof chatRequestSchema>
// ChatResponseType removed - chatMessageSchema no longer exists
export type IntentClassificationType = z.infer<typeof intentClassificationResponseSchema>
export type DataQueryResultType = z.infer<typeof dataQueryResultSchema>
export type GeneralAdviceResultType = z.infer<typeof generalAdviceResultSchema>
export type ClarificationResultType = z.infer<typeof clarificationResultSchema>
export type PrismaQueryParamsType = z.infer<typeof prismaQueryParamsSchema>
export type OpenAIRequestType = z.infer<typeof openaiRequestSchema>
export type OpenAIResponseType = z.infer<typeof openaiResponseSchema>