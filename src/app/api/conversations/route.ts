import { NextRequest, NextResponse } from 'next/server'
import { logger } from '../../../lib/utils/logger'
import { validateConversationCreation } from '../../../lib/validation/schemas'
import { authenticateUser } from '../../../lib/auth-api-utils'
import {
  createConversation,
  getUserConversations,
  getConversationStats
} from '../../../lib/utils/conversations'
import type { ConversationListItem } from '../../../types/chat'

/**
 * GET - Retrieve all conversations for authenticated user
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const timer = logger.startTimer('Get User Conversations')

  try {
    logger.conversationFlow('GET conversations request received', 'list')

    // Authenticate user
    const authResult = await authenticateUser()
    if (authResult.error) {
      const duration = timer()
      logger.error('Get conversations - invalid session', undefined, {
        processingTime: duration
      })
      return authResult.error
    }

    const userId = authResult.userId

    // Get query parameters
    const { searchParams } = request.nextUrl
    const includeStats = searchParams.get('includeStats') === 'true'

    logger.conversationFlow('Loading user conversations', 'list', userId, {
      includeStats
    })

    // Get conversations and optionally stats in parallel
    const conversationsPromise = getUserConversations(userId)
    const statsPromise = includeStats ? getConversationStats(userId) : null

    const conversationsResult = await conversationsPromise
    const statsResult = statsPromise ? await statsPromise : null

    const duration = timer()

    if (!conversationsResult.success) {
      logger.error('Failed to get user conversations', conversationsResult.error, {
        processingTime: duration,
        userId
      })
      return NextResponse.json(
        { error: conversationsResult.error || 'Failed to retrieve conversations' },
        { status: 500 }
      )
    }

    const response: {
      success: boolean
      conversations: ConversationListItem[]
      stats?: {
        totalConversations: number
        totalMessages: number
        averageMessagesPerConversation: number
        mostRecentActivity: Date | null
      }
    } = {
      success: true,
      conversations: conversationsResult.conversations || []
    }

    if (includeStats && statsResult?.success) {
      response.stats = statsResult.stats
    }

    logger.success('User conversations retrieved', undefined, {
      processingTime: duration,
      userId,
      conversationCount: conversationsResult.conversations?.length || 0,
      includeStats
    })

    return NextResponse.json(response)

  } catch (err) {
    const duration = timer()
    const error = err instanceof Error ? err : new Error('Unknown error')

    logger.error('Get conversations failed with exception', error, {
      processingTime: duration
    })

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST - Create a new conversation
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const timer = logger.startTimer('Create New Conversation')

  try {
    logger.conversationFlow('POST conversation request received', 'new')

    // Authenticate user
    const authResult = await authenticateUser()
    if (authResult.error) {
      const duration = timer()
      logger.error('Create conversation - invalid session', undefined, {
        processingTime: duration
      })
      return authResult.error
    }

    const userId = authResult.userId

    // Parse and validate request body
    const requestBody = await request.json() as Record<string, string | number | boolean | null>

    // Add userId to request body for validation
    const requestWithUserId = {
      ...requestBody,
      userId
    }

    const validation = validateConversationCreation(requestWithUserId)

    if (!validation.success) {
      const duration = timer()
      logger.error('Create conversation validation failed', undefined, {
        processingTime: duration,
        validationError: validation.error,
        userId
      })
      return NextResponse.json(
        { error: validation.error || 'Invalid request format' },
        { status: 400 }
      )
    }

    const validatedData = validation.data!

    logger.conversationFlow('Creating new conversation', 'new', userId, {
      title: validatedData.title || null
    })

    // Create conversation
    const createResult = await createConversation(userId, validatedData.title)

    const duration = timer()

    if (!createResult.success || !createResult.conversation) {
      logger.error('Failed to create conversation', undefined, {
        processingTime: duration,
        ...(createResult.error && { error: new Error(createResult.error) }),
        userId
      })
      return NextResponse.json(
        { error: createResult.error || 'Failed to create conversation' },
        { status: 500 }
      )
    }

    logger.success('Conversation created successfully', undefined, {
      processingTime: duration,
      conversationId: createResult.conversation.id,
      userId,
      title: createResult.conversation.title
    })

    return NextResponse.json({
      success: true,
      conversation: createResult.conversation
    }, { status: 201 })

  } catch (err) {
    const duration = timer()
    const error = err instanceof Error ? err : new Error('Unknown error')

    logger.error('Create conversation failed with exception', error, {
      processingTime: duration
    })

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}