import { NextRequest, NextResponse } from 'next/server'
import { logger } from '../../../lib/utils/logger'
import { validateChatRequest } from '../../../lib/validation/schemas'
import { createSupabaseServerClient } from '../../../../lib/supabase-server'
import { functionCaller } from '../../../lib/ai-v3/function-caller'
import { generalChatHandler } from '../../../lib/ai/generalChatHandler'
import {
  createConversation,
  getConversation,
  persistMessage,
  generateConversationTitle,
  getConversationContext
} from '../../../lib/utils/conversations'
import type {
  ChatRequest,
  ChatResponse,
  ChatIntent,
  ChatMessageMetadata,
  ChatMessage
} from '../../../types/chat'
import type { QueryRequest } from '../../../lib/ai-v3/types'

// Constants for chat processing
const PERFORMANCE_METRICS_LIMIT = 100
const TITLE_GENERATION_MESSAGE_LIMIT = 100
const FULL_CONVERSATION_LIMIT = 1000 // High limit to get all conversation messages
const UNKNOWN_ERROR_MESSAGE = 'Unknown error'

/**
 * Main chat API endpoint with full conversation persistence
 * Processes user messages through three-tier AI system with comprehensive logging
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const overallTimer = logger.startTimer('Complete Chat Request')

  try {
    logger.chat('🚀 New chat request received')

    // Step 1: Validate session
    const supabase = await createSupabaseServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      const duration = overallTimer()
      logger.error('Chat request - invalid session', undefined, {
        processingTime: duration,
        authError: authError?.message
      })
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const userId = user.id

    // Step 2: Parse and validate request
    const requestBody = await request.json() as Record<string, string | number | boolean | null>
    const validation = validateChatRequest(requestBody)

    if (!validation.success) {
      const duration = overallTimer()
      logger.error('Chat request validation failed', undefined, {
        processingTime: duration,
        validationError: validation.error,
        userId
      })
      return NextResponse.json(
        { error: validation.error || 'Invalid request format' },
        { status: 400 }
      )
    }

    const chatRequest = validation.data as ChatRequest

    logger.chat('Chat request validated', undefined, {
      userId,
      hasConversationId: !!chatRequest.conversationId,
      messageLength: chatRequest.message.length
    })

    // Step 3: Get or create conversation
    const conversationResult = await getOrCreateConversation(
      chatRequest.conversationId,
      userId
    )

    if (!conversationResult.success || !conversationResult.conversationId) {
      const duration = overallTimer()
      logger.error('Failed to get/create conversation', undefined, {
        processingTime: duration,
        ...(conversationResult.error && { error: new Error(conversationResult.error) }),
        userId
      })
      return NextResponse.json(
        { error: conversationResult.error || 'Failed to manage conversation' },
        { status: 500 }
      )
    }

    const conversationId = conversationResult.conversationId

    // Step 4: Get conversation context (all messages)
    const contextResult = await getConversationContext(conversationId, FULL_CONVERSATION_LIMIT)
    const conversationHistory = contextResult.success ? (contextResult.context || []) : []

    // Step 5: Persist user message
    const userMessageResult = await persistMessage({
      conversationId,
      role: 'user',
      content: chatRequest.message
    })

    if (!userMessageResult.success) {
      logger.warn('Failed to persist user message', undefined, {
        ...(userMessageResult.error && { error: new Error(userMessageResult.error) }),
        conversationId,
        userId
      })
    }

    // Step 6: Process message through function calling system
    const processResult = await processMessageWithFunctionCalling(
      chatRequest.message,
      conversationHistory,
      userId
    )

    // Step 7: Persist AI response
    const aiMessageResult = await persistMessage({
      conversationId,
      role: 'assistant',
      content: processResult.response,
      metadata: processResult.metadata
    })

    if (!aiMessageResult.success) {
      logger.warn('Failed to persist AI message', undefined, {
        ...(aiMessageResult.error && { error: new Error(aiMessageResult.error) }),
        conversationId,
        userId
      })
    }

    // Step 8: Auto-generate title if new conversation
    if (conversationResult.isNew && conversationHistory.length <= 1) {
      generateConversationTitle({
        conversationId,
        messages: [
          {
            id: 'temp-user',
            conversationId,
            role: 'user',
            content: chatRequest.message,
            metadata: null,
            createdAt: new Date(),
            updatedAt: new Date()
          },
          {
            id: 'temp-assistant',
            conversationId,
            role: 'assistant',
            content: processResult.response,
            metadata: null,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        ]
      }).catch(err => {
        logger.warn('Title generation failed (non-blocking)', err)
      })
    }

    const duration = overallTimer()

    // Step 9: Build and return response
    const chatResponse: ChatResponse = {
      success: true,
      message: processResult.response,
      conversationId,
      messageId: aiMessageResult.messageId || 'unknown',
      intent: processResult.intent,
      metadata: {
        ...processResult.metadata,
        processingTime: duration,
        totalProcessingTime: duration
      }
    }

    logger.success('Chat request completed successfully', undefined, {
      processingTime: duration,
      conversationId,
      intent: processResult.intent,
      responseLength: processResult.response.length,
      userId,
      totalTokens: processResult.metadata.tokens,
      totalCost: processResult.metadata.cost
    })

    return NextResponse.json(chatResponse)

  } catch (err) {
    const duration = overallTimer()
    const error = err instanceof Error ? err : new Error(UNKNOWN_ERROR_MESSAGE)

    logger.error('Chat request failed with exception', error, {
      processingTime: duration
    })

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Get existing conversation or create new one
 */
async function getOrCreateConversation(
  conversationId: string | undefined,
  userId: string
): Promise<{
  success: boolean
  conversationId?: string
  isNew?: boolean
  error?: string
}> {
  const timer = logger.startTimer('Get/Create Conversation')

  try {
    if (conversationId) {
      // Try to get existing conversation
      const existingResult = await getConversation(conversationId, false)

      if (existingResult.success && existingResult.conversation) {
        // Verify ownership
        if (existingResult.conversation.userId !== userId) {
          const duration = timer()
          logger.warn('Conversation ownership mismatch', undefined, {
            processingTime: duration,
            conversationId,
            userId,
            ownerId: existingResult.conversation.userId
          })
          return { success: false, error: 'Conversation not found' }
        }

        const duration = timer()
        logger.conversationFlow('Using existing conversation', conversationId, userId, {
          processingTime: duration
        })

        return {
          success: true,
          conversationId,
          isNew: false
        }
      }
    }

    // Create new conversation
    const newResult = await createConversation(userId)

    if (!newResult.success || !newResult.conversation) {
      const duration = timer()
      logger.error('Failed to create new conversation', undefined, {
        processingTime: duration,
        ...(newResult.error && { error: new Error(newResult.error) }),
        userId
      })
      return { success: false, error: newResult.error || 'Failed to create conversation' }
    }

    const duration = timer()
    logger.conversationFlow('Created new conversation', newResult.conversation.id, userId, {
      processingTime: duration
    })

    return {
      success: true,
      conversationId: newResult.conversation.id,
      isNew: true
    }
  } catch (err) {
    const duration = timer()
    const error = err instanceof Error ? err : new Error(UNKNOWN_ERROR_MESSAGE)

    logger.error('Get/create conversation failed', error, {
      processingTime: duration,
      userId
    })

    return { success: false, error: error.message }
  }
}

/**
 * Process message using function calling with general chat fallback
 */
async function processMessageWithFunctionCalling(
  userMessage: string,
  conversationHistory: ChatMessage[],
  userId: string
): Promise<{
  response: string
  intent: ChatIntent
  metadata: ChatMessageMetadata
}> {
  const overallTimer = logger.startTimer('Function Calling Processing')

  try {
    logger.chat('Starting function calling message processing', userMessage.slice(0, PERFORMANCE_METRICS_LIMIT), {
      userId,
      historyLength: conversationHistory.length
    })

    // Convert conversation history to AI v3 format
    const aiV3ConversationHistory = conversationHistory.map(msg => ({
      id: msg.id,
      role: msg.role,
      content: msg.content,
      timestamp: msg.createdAt,
      metadata: msg.metadata ? {
        queryType: typeof msg.metadata === 'object' && msg.metadata !== null && 'queryType' in msg.metadata
          ? String(msg.metadata.queryType)
          : undefined,
        processingTime: typeof msg.metadata === 'object' && msg.metadata !== null && 'processingTime' in msg.metadata
          ? Number(msg.metadata.processingTime)
          : undefined
      } : undefined
    }))

    // Try function calling first (for data queries and business analysis)
    const queryRequest: QueryRequest = {
      userMessage,
      conversationHistory: aiV3ConversationHistory,
      intent: 'data_query',
      userId
    }

    const functionResult = await functionCaller.processQuery(queryRequest)

    const totalTime = overallTimer()

    // If function calling succeeded (with data OR text-only response), use that response
    if (functionResult.success && (functionResult.data.length > 0 || functionResult.summary)) {
      const metadata: ChatMessageMetadata = {
        intent: 'data_query',
        intentConfidence: 0.9, // High confidence since function was successfully called
        model: 'gpt-4o',
        tokens: 0, // TODO: Extract from function caller
        cost: 0, // TODO: Extract from function caller
        processingTime: totalTime,
        timestampStart: new Date(Date.now() - totalTime).toISOString(),
        timestampEnd: new Date().toISOString(),

        // Performance breakdown
        performanceBreakdown: {
          intentClassificationTime: 0, // No explicit classification
          executionTime: functionResult.metadata.processingTime,
          totalTime
        },

        // Data query specific metadata
        queryPlan: functionResult.metadata.queryPlan,
        queryType: functionResult.data.length > 0 ? 'function_call' : 'text_only_context',
        prismaQuery: functionResult.metadata.queryPlan,

        // Business context
        businessContext: functionResult.data.length > 0
          ? `Function calling: ${functionResult.metadata.queryComplexity} complexity, ${functionResult.metadata.recordCount} records`
          : `Text-only response using conversation context`,

        // Function calling metadata
        intentReasoning: functionResult.data.length > 0
          ? 'Function calling determined this is a data query'
          : 'Model used conversation context to answer',
        classificationMetadata: {
          model: 'gpt-4o',
          tokens: 0,
          cost: 0,
          processingTime: 0
        }
      }

      logger.success('Function calling completed successfully', undefined, {
        processingTime: totalTime,
        intent: 'data_query',
        responseLength: functionResult.summary.length,
        recordCount: functionResult.metadata.recordCount,
        userId
      })

      return {
        response: functionResult.summary,
        intent: 'data_query',
        metadata
      }
    }

    // Fallback to general chat handler if function calling failed
    // This handles general questions, advice requests, and clarifications
    logger.chat('Function calling failed or returned no response, falling back to general chat handler')

    const adviceResult = await generalChatHandler.processGeneralAdvice({
      userMessage,
      conversationHistory,
      intent: 'general_advice'
    })

    const fallbackTime = overallTimer()

    const response = adviceResult.success
      ? adviceResult.advice
      : 'I apologize, but I encountered an error processing your message. Please try again.'

    const metadata: ChatMessageMetadata = {
      intent: 'general_advice',
      intentConfidence: 0.7,
      model: adviceResult.metadata.model,
      tokens: adviceResult.metadata.tokens,
      cost: adviceResult.metadata.cost,
      processingTime: fallbackTime,
      timestampStart: new Date(Date.now() - fallbackTime).toISOString(),
      timestampEnd: new Date().toISOString(),

      performanceBreakdown: {
        intentClassificationTime: 0,
        executionTime: adviceResult.metadata.processingTime,
        totalTime: fallbackTime
      },

      businessContext: 'General chat fallback - no data query detected',
      intentReasoning: 'Function calling did not return results, using general chat handler'
    }

    logger.success('General chat fallback completed', undefined, {
      processingTime: fallbackTime,
      intent: 'general_advice',
      responseLength: response.length,
      userId
    })

    return {
      response,
      intent: 'general_advice',
      metadata
    }

  } catch (err) {
    const duration = overallTimer()
    const error = err instanceof Error ? err : new Error(UNKNOWN_ERROR_MESSAGE)

    logger.error('Function calling processing failed', error, {
      processingTime: duration,
      userId,
      userMessage: userMessage.slice(0, TITLE_GENERATION_MESSAGE_LIMIT)
    })

    return {
      response: 'I apologize, but I encountered an unexpected error processing your message. Please try again.',
      intent: 'clarification',
      metadata: {
        error: error.message,
        errorType: 'processing_failure',
        processingTime: duration,
        model: 'error_fallback',
        tokens: 0,
        cost: 0
      }
    }
  }
}

