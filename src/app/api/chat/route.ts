import { NextRequest, NextResponse } from 'next/server'
import { logger } from '../../../lib/utils/logger'
import { validateChatRequest } from '../../../lib/validation/schemas'
import { createSupabaseServerClient } from '../../../../lib/supabase-server'
import { intentClassifier } from '../../../lib/ai/intentClassifier'
import { dataQueryHandler } from '../../../lib/ai-v2/dataQueryHandler'
import { generalChatHandler } from '../../../lib/ai/generalChatHandler'
import { clarificationHandler } from '../../../lib/ai/clarificationHandler'
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
  PerformanceMetrics,
  ChatMessage
} from '../../../types/chat'

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

    // Step 6: Process message through three-tier system
    const processResult = await processMessageThroughTiers(
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
 * Process message through three-tier AI system
 */
async function processMessageThroughTiers(
  userMessage: string,
  conversationHistory: ChatMessage[],
  userId: string
): Promise<{
  response: string
  intent: ChatIntent
  metadata: ChatMessageMetadata
}> {
  const overallTimer = logger.startTimer('Three-Tier Processing')
  const performanceMetrics: Partial<PerformanceMetrics> = {
    totalProcessingTime: 0,
    intentClassificationTime: 0,
    queryExecutionTime: 0,
    aiResponseTime: 0,
    persistenceTime: 0,
    tokenUsage: { total: 0, classification: 0, response: 0 },
    costs: { total: 0, classification: 0, response: 0 }
  }

  try {
    logger.chat('Starting three-tier message processing', userMessage.slice(0, PERFORMANCE_METRICS_LIMIT), {
      userId,
      historyLength: conversationHistory.length
    })

    // Tier 1: Intent Classification
    const classificationTimer = logger.startTimer('Intent Classification Tier')
    const intentResult = await intentClassifier.classifyIntent(
      userMessage,
      conversationHistory,
      userId
    )
    const classificationTime = classificationTimer()

    performanceMetrics.intentClassificationTime = classificationTime
    performanceMetrics.tokenUsage!.classification = intentResult.metadata.tokens
    performanceMetrics.costs!.classification = intentResult.metadata.cost

    logger.intent('Intent classification completed', undefined, {
      intent: intentResult.intent,
      confidence: intentResult.confidence,
      processingTime: classificationTime,
      reasoning: intentResult.reasoning
    })

    // Tier 2 & 3: Execute based on intent
    let response: string
    let responseMetadata: Record<string, string | number | boolean | Date | null> = {}

    const executionTimer = logger.startTimer('Intent Execution Tier')

    switch (intentResult.intent) {
      case 'data_query':
        const dataResult = await dataQueryHandler.processDataQuery({
          userMessage,
          conversationHistory,
          intent: 'data_query'
        })

        response = dataResult.success ? dataResult.summary : (dataResult.error || 'Failed to process data query')
        responseMetadata = {
          processingTime: dataResult.metadata.processingTime,
          queryPlan: dataResult.queryPlan,
          queryType: dataResult.queryType,
          prismaQuery: dataResult.metadata.prismaQuery
        }
        performanceMetrics.queryExecutionTime = dataResult.metadata.processingTime

        logger.queryExecution(
          'data_query',
          dataResult.queryPlan,
          undefined,
          {
            success: dataResult.success,
            recordCount: dataResult.recordCount,
            processingTime: dataResult.metadata.processingTime
          }
        )
        break

      case 'general_advice':
        const adviceResult = await generalChatHandler.processGeneralAdvice({
          userMessage,
          conversationHistory,
          intent: 'general_advice'
        })

        response = adviceResult.success ? adviceResult.advice : (adviceResult.error || 'Failed to generate advice')
        responseMetadata = adviceResult.metadata
        performanceMetrics.aiResponseTime = adviceResult.metadata.processingTime

        logger.ai('General advice generated', undefined, {
          success: adviceResult.success,
          adviceLength: response.length,
          actionItemCount: adviceResult.actionItems?.length || 0,
          processingTime: adviceResult.metadata.processingTime
        })
        break

      case 'clarification':
        const clarificationResult = await clarificationHandler.processClarificationRequest({
          userMessage,
          conversationHistory,
          intent: 'clarification',
          ambiguousAspects: ['user_intent', 'scope', 'context']
        })

        const questions = clarificationResult.success ? clarificationResult.questions : [
          'Could you please provide more details about what you are looking for?'
        ]
        response = `I need a bit more information to help you effectively:\n\n${questions.map(q => `• ${q}`).join('\n')}`
        responseMetadata = clarificationResult.metadata
        performanceMetrics.aiResponseTime = clarificationResult.metadata.processingTime

        logger.intent('Clarification questions generated', undefined, {
          success: clarificationResult.success,
          questionCount: questions.length,
          processingTime: clarificationResult.metadata.processingTime
        })
        break

      default:
        response = 'I apologize, but I encountered an issue determining how to help you. Could you please rephrase your request?'
        responseMetadata = {
          model: 'fallback',
          tokens: 0,
          cost: 0,
          processingTime: 0
        }
    }

    const executionTime = executionTimer()

    // Update performance metrics
    performanceMetrics.tokenUsage!.response = (typeof responseMetadata['tokens'] === 'number' ? responseMetadata['tokens'] : 0)
    performanceMetrics.costs!.response = (typeof responseMetadata['cost'] === 'number' ? responseMetadata['cost'] : 0)
    performanceMetrics.tokenUsage!.total =
      performanceMetrics.tokenUsage!.classification + performanceMetrics.tokenUsage!.response
    performanceMetrics.costs!.total =
      performanceMetrics.costs!.classification + performanceMetrics.costs!.response

    const totalTime = overallTimer()
    performanceMetrics.totalProcessingTime = totalTime

    // Build comprehensive metadata
    const metadata: ChatMessageMetadata = {
      intent: intentResult.intent,
      intentConfidence: intentResult.confidence,
      model: (typeof responseMetadata['model'] === 'string' ? responseMetadata['model'] : 'unknown'),
      tokens: performanceMetrics.tokenUsage!.total,
      cost: performanceMetrics.costs!.total,
      processingTime: totalTime,
      timestampStart: new Date(Date.now() - totalTime).toISOString(),
      timestampEnd: new Date().toISOString(),

      // Performance breakdown
      performanceBreakdown: {
        intentClassificationTime: performanceMetrics.intentClassificationTime,
        executionTime,
        totalTime
      },

      // Intent-specific metadata
      ...(intentResult.intent === 'data_query' && {
        queryPlan: (typeof responseMetadata['queryPlan'] === 'string' ? responseMetadata['queryPlan'] : undefined),
        queryType: (typeof responseMetadata['queryType'] === 'string' ? responseMetadata['queryType'] : 'unknown'),
        prismaQuery: (typeof responseMetadata['prismaQuery'] === 'string' ? responseMetadata['prismaQuery'] : undefined)
      }),

      // Business context
      businessContext: `Intent: ${intentResult.intent}, Confidence: ${intentResult.confidence}`,

      // Reasoning and classification details
      intentReasoning: intentResult.reasoning,
      classificationMetadata: {
        model: intentResult.metadata.model,
        tokens: intentResult.metadata.tokens,
        cost: intentResult.metadata.cost,
        processingTime: intentResult.metadata.processingTime
      }
    }

    logger.success('Three-tier processing completed', undefined, {
      processingTime: totalTime,
      intent: intentResult.intent,
      confidence: intentResult.confidence,
      responseLength: response.length,
      totalTokens: metadata.tokens,
      totalCost: metadata.cost,
      userId
    })

    return {
      response,
      intent: intentResult.intent,
      metadata
    }

  } catch (err) {
    const duration = overallTimer()
    const error = err instanceof Error ? err : new Error(UNKNOWN_ERROR_MESSAGE)

    logger.error('Three-tier processing failed', error, {
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

