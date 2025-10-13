import { NextRequest, NextResponse } from 'next/server'
import { logger } from '../../../../lib/utils/logger'
import { validateConversationUpdate } from '../../../../lib/validation/schemas'
import { authenticateUser } from '../../../../lib/auth-api-utils'
import {
  getConversation,
  updateConversationTitle,
  deleteConversation,
  validateConversationOwnership,
  getConversationHistory
} from '../../../../lib/utils/conversations'

// Error message constants
const AUTHENTICATION_REQUIRED_ERROR = 'Authentication required'
const CONVERSATION_NOT_FOUND_ERROR = 'Conversation not found'
const INTERNAL_SERVER_ERROR = 'Internal server error'
const UNKNOWN_ERROR_MESSAGE = 'Unknown error'

// Helper function to validate session and ownership
async function validateConversationAccess(
  conversationId: string,
  timer: () => number
): Promise<{ userId: string } | NextResponse> {
  // Authenticate user
  const authResult = await authenticateUser()
  if (authResult.error) {
    const duration = timer()
    logger.error('Conversation access - invalid session', undefined, {
      processingTime: duration,
      conversationId
    })
    return authResult.error
  }

  const userId = authResult.userId

  // Validate conversation ownership
  const ownershipResult = await validateConversationOwnership(conversationId, userId)
  if (!ownershipResult.success || !ownershipResult.isOwner) {
    const duration = timer()
    logger.warn('Conversation access denied', undefined, {
      processingTime: duration,
      conversationId,
      userId,
      ...(ownershipResult.error && { error: new Error(ownershipResult.error) })
    })
    return NextResponse.json(
      { error: CONVERSATION_NOT_FOUND_ERROR },
      { status: 404 }
    )
  }

  return { userId }
}

/**
 * GET - Retrieve a specific conversation with messages
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const timer = logger.startTimer('Get Single Conversation')

  try {
    const { id: conversationId } = await params

    logger.conversationFlow('GET conversation request received', conversationId)

    // Validate session and ownership
    const accessResult = await validateConversationAccess(conversationId, timer)
    if (accessResult instanceof NextResponse) {
      return accessResult
    }
    const { userId } = accessResult

    // Get query parameters
    const { searchParams } = request.nextUrl
    const includeMessages = searchParams.get('includeMessages') !== 'false'
    const messageLimit = searchParams.get('messageLimit')

    logger.conversationFlow('Loading conversation', conversationId, userId, {
      includeMessages,
      messageLimit
    })

    let result
    if (includeMessages && messageLimit) {
      // Get conversation with limited messages
      const historyResult = await getConversationHistory(conversationId, parseInt(messageLimit))
      const conversationResult = await getConversation(conversationId, false)

      if (conversationResult.success && historyResult.success) {
        result = {
          success: true,
          conversation: {
            ...conversationResult.conversation,
            messages: historyResult.messages || []
          }
        }
      } else {
        result = conversationResult
      }
    } else {
      // Get conversation with all messages
      result = await getConversation(conversationId, includeMessages)
    }

    const duration = timer()

    if (!result.success || !result.conversation) {
      logger.error('Failed to get conversation', undefined, {
        processingTime: duration,
        ...(result.error && { error: new Error(result.error) }),
        conversationId,
        userId
      })
      return NextResponse.json(
        { error: result.error ? result.error : CONVERSATION_NOT_FOUND_ERROR },
        { status: 404 }
      )
    }

    logger.success('Conversation retrieved', undefined, {
      processingTime: duration,
      conversationId,
      userId,
      messageCount: result.conversation.messages?.length || 0,
      includeMessages
    })

    return NextResponse.json({
      success: true,
      conversation: result.conversation
    })

  } catch (err) {
    const duration = timer()
    const error = err instanceof Error ? err : new Error(UNKNOWN_ERROR_MESSAGE)

    logger.error('Get conversation failed with exception', error, {
      processingTime: duration,
      conversationId: (await params).id
    })

    return NextResponse.json(
      { error: INTERNAL_SERVER_ERROR },
      { status: 500 }
    )
  }
}

/**
 * PATCH - Update conversation (e.g., title)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const timer = logger.startTimer('Update Conversation')

  try {
    const { id: conversationId } = await params

    logger.conversationFlow('PATCH conversation request received', conversationId)

    // Validate session and ownership
    const accessResult = await validateConversationAccess(conversationId, timer)
    if (accessResult instanceof NextResponse) {
      return accessResult
    }
    const { userId } = accessResult

    // Parse and validate request body
    const requestBody = await request.json() as Record<string, string | number | boolean | null>

    // Add id to request body for validation
    const requestWithId = {
      ...requestBody,
      id: conversationId
    }

    const validation = validateConversationUpdate(requestWithId)

    if (!validation.success) {
      const duration = timer()
      logger.error('Update conversation validation failed', undefined, {
        processingTime: duration,
        validationError: validation.error,
        conversationId,
        userId
      })
      return NextResponse.json(
        { error: validation.error || 'Invalid request format' },
        { status: 400 }
      )
    }

    const validatedData = validation.data!

    logger.conversationFlow('Updating conversation', conversationId, userId, {
      title: validatedData.title || null
    })

    // Update conversation
    const updateResult = await updateConversationTitle(conversationId, validatedData.title!)

    const duration = timer()

    if (!updateResult.success || !updateResult.conversation) {
      logger.error('Failed to update conversation', undefined, {
        processingTime: duration,
        ...(updateResult.error && { error: new Error(updateResult.error) }),
        conversationId,
        userId
      })
      return NextResponse.json(
        { error: updateResult.error || 'Failed to update conversation' },
        { status: 500 }
      )
    }

    logger.success('Conversation updated successfully', undefined, {
      processingTime: duration,
      conversationId,
      userId,
      newTitle: updateResult.conversation.title
    })

    return NextResponse.json({
      success: true,
      conversation: updateResult.conversation
    })

  } catch (err) {
    const duration = timer()
    const error = err instanceof Error ? err : new Error(UNKNOWN_ERROR_MESSAGE)

    logger.error('Update conversation failed with exception', error, {
      processingTime: duration,
      conversationId: (await params).id
    })

    return NextResponse.json(
      { error: INTERNAL_SERVER_ERROR },
      { status: 500 }
    )
  }
}

/**
 * DELETE - Delete a conversation and all its messages
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const timer = logger.startTimer('Delete Conversation')

  try {
    const { id: conversationId } = await params

    logger.conversationFlow('DELETE conversation request received', conversationId)

    // Validate session and ownership
    const accessResult = await validateConversationAccess(conversationId, timer)
    if (accessResult instanceof NextResponse) {
      return accessResult
    }
    const { userId } = accessResult

    logger.conversationFlow('Deleting conversation', conversationId, userId)

    // Delete conversation
    const deleteResult = await deleteConversation(conversationId)

    const duration = timer()

    if (!deleteResult.success) {
      logger.error('Failed to delete conversation', undefined, {
        processingTime: duration,
        ...(deleteResult.error && { error: new Error(deleteResult.error) }),
        conversationId,
        userId
      })
      return NextResponse.json(
        { error: deleteResult.error || 'Failed to delete conversation' },
        { status: 500 }
      )
    }

    logger.success('Conversation deleted successfully', undefined, {
      processingTime: duration,
      conversationId,
      userId
    })

    return NextResponse.json({
      success: true,
      message: 'Conversation deleted successfully'
    })

  } catch (err) {
    const duration = timer()
    const error = err instanceof Error ? err : new Error(UNKNOWN_ERROR_MESSAGE)

    logger.error('Delete conversation failed with exception', error, {
      processingTime: duration,
      conversationId: (await params).id
    })

    return NextResponse.json(
      { error: INTERNAL_SERVER_ERROR },
      { status: 500 }
    )
  }
}