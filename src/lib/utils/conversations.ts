import prisma from '../../../lib/prisma'
import { logger } from './logger'

// Utility function to safely convert to Prisma JSON
const toPrismaJson = (value: ChatMessageMetadata | undefined) => {
  if (value === undefined) {
    return undefined
  }
  // Return the value directly - let TypeScript infer the correct Prisma type
  return value
}
import type {
  Conversation,
  ChatMessage,
  ConversationWithMessages,
  ConversationListItem,
  PersistMessageRequest,
  PersistMessageResult,
  AutoTitleRequest,
  AutoTitleResult,
  ChatMessageMetadata
} from '../../types/chat'

// Constants for magic numbers and repeated strings
const CONVERSATION_CONSTANTS = {
  PREVIEW_LENGTH: 100,
  TITLE_GENERATION: {
    SHORT_MESSAGE_LIMIT: 50,
    SENTENCE_LIMIT: 80,
    TRUNCATED_LIMIT: 50,
    MIN_TITLE_LENGTH: 10
  },
  DEFAULT_MESSAGE_LIMIT: 10,
  AVERAGE_PRECISION: 100
} as const

const CONVERSATION_MESSAGES = {
  NOT_FOUND: 'Conversation not found',
  UNKNOWN_ERROR: 'Unknown error'
} as const

/**
 * Create a new conversation for a user
 */
export async function createConversation(
  userId: string,
  title?: string
): Promise<{ success: boolean; conversation?: Conversation; error?: string }> {
  const timer = logger.startTimer('Create Conversation')

  try {
    logger.conversationFlow('Creating new conversation', 'new', userId, { title: title || '' })

    const conversation = await prisma.conversation.create({
      data: {
        userId,
        title: title ?? null
      }
    })

    const duration = timer()

    logger.persistenceOperation('created', 'conversation', conversation.id, {
      id: conversation.id,
      title: conversation.title || '',
      userId: conversation.userId
    }, {
      processingTime: duration,
      userId
    })

    return { success: true, conversation }
  } catch (err) {
    const duration = timer()
    const error = err instanceof Error ? err : new Error(CONVERSATION_MESSAGES.UNKNOWN_ERROR)

    logger.error('Failed to create conversation', error, {
      processingTime: duration,
      userId,
      title
    })

    return { success: false, error: error.message }
  }
}

/**
 * Get a conversation by ID with optional message loading
 */
export async function getConversation(
  conversationId: string,
  includeMessages = true
): Promise<{ success: boolean; conversation?: ConversationWithMessages; error?: string }> {
  const timer = logger.startTimer('Get Conversation')

  try {
    logger.conversationFlow('Loading conversation', conversationId, undefined, { includeMessages })

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        messages: includeMessages
          ? {
              orderBy: { createdAt: 'asc' }
            }
          : false
      }
    })

    const duration = timer()

    if (!conversation) {
      logger.warn('Conversation not found', undefined, {
        processingTime: duration,
        conversationId
      })
      return { success: false, error: CONVERSATION_MESSAGES.NOT_FOUND }
    }

    logger.persistenceOperation('loaded', 'conversation', conversationId, undefined, {
      processingTime: duration,
      messageCount: includeMessages ? conversation.messages?.length || 0 : 0
    })

    return { success: true, conversation: conversation as ConversationWithMessages }
  } catch (err) {
    const duration = timer()
    const error = err instanceof Error ? err : new Error(CONVERSATION_MESSAGES.UNKNOWN_ERROR)

    logger.error('Failed to get conversation', error, {
      processingTime: duration,
      conversationId
    })

    return { success: false, error: error.message }
  }
}

/**
 * Get all conversations for a user with summary information
 */
export async function getUserConversations(
  userId: string
): Promise<{ success: boolean; conversations?: ConversationListItem[]; error?: string }> {
  const timer = logger.startTimer('Get User Conversations')

  try {
    logger.conversationFlow('Loading user conversations', 'list', userId)

    const conversations = await prisma.conversation.findMany({
      where: { userId },
      select: {
        id: true,
        title: true,
        updatedAt: true,
        messages: {
          select: {
            content: true,
            createdAt: true
          },
          orderBy: { createdAt: 'desc' },
          take: 1
        },
        _count: {
          select: {
            messages: true
          }
        }
      },
      orderBy: { updatedAt: 'desc' }
    })

    const duration = timer()

    const conversationList: ConversationListItem[] = conversations.map(conv => ({
      id: conv.id,
      title: conv.title,
      lastMessageAt: conv.messages[0]?.createdAt || conv.updatedAt,
      messageCount: conv._count.messages,
      lastMessage: conv.messages[0]?.content || ''
    }))

    logger.persistenceOperation('loaded', 'conversation list', undefined, undefined, {
      processingTime: duration,
      userId,
      conversationCount: conversationList.length
    })

    return { success: true, conversations: conversationList }
  } catch (err) {
    const duration = timer()
    const error = err instanceof Error ? err : new Error(CONVERSATION_MESSAGES.UNKNOWN_ERROR)

    logger.error('Failed to get user conversations', error, {
      processingTime: duration,
      userId
    })

    return { success: false, error: error.message }
  }
}

/**
 * Update conversation title
 */
export async function updateConversationTitle(
  conversationId: string,
  title: string
): Promise<{ success: boolean; conversation?: Conversation; error?: string }> {
  const timer = logger.startTimer('Update Conversation Title')

  try {
    logger.conversationFlow('Updating conversation title', conversationId, undefined, { title })

    const conversation = await prisma.conversation.update({
      where: { id: conversationId },
      data: { title }
    })

    const duration = timer()

    logger.persistenceOperation('updated', 'conversation title', conversationId, { title }, {
      processingTime: duration
    })

    return { success: true, conversation }
  } catch (err) {
    const duration = timer()
    const error = err instanceof Error ? err : new Error(CONVERSATION_MESSAGES.UNKNOWN_ERROR)

    logger.error('Failed to update conversation title', error, {
      processingTime: duration,
      conversationId,
      title
    })

    return { success: false, error: error.message }
  }
}

/**
 * Delete a conversation and all its messages
 */
export async function deleteConversation(
  conversationId: string
): Promise<{ success: boolean; error?: string }> {
  const timer = logger.startTimer('Delete Conversation')

  try {
    logger.conversationFlow('Deleting conversation', conversationId)

    await prisma.conversation.delete({
      where: { id: conversationId }
    })

    const duration = timer()

    logger.persistenceOperation('deleted', 'conversation', conversationId, undefined, {
      processingTime: duration
    })

    return { success: true }
  } catch (err) {
    const duration = timer()
    const error = err instanceof Error ? err : new Error(CONVERSATION_MESSAGES.UNKNOWN_ERROR)

    logger.error('Failed to delete conversation', error, {
      processingTime: duration,
      conversationId
    })

    return { success: false, error: error.message }
  }
}

/**
 * Persist a chat message to the database
 */
export async function persistMessage(
  request: PersistMessageRequest
): Promise<PersistMessageResult> {
  const timer = logger.startTimer('Persist Message')

  try {
    logger.persist('Saving message to database', request.content.slice(0, CONVERSATION_CONSTANTS.PREVIEW_LENGTH) + '...', {
      conversationId: request.conversationId,
      role: request.role
    })

    const message = await prisma.chatMessage.create({
      data: {
        conversationId: request.conversationId,
        role: request.role,
        content: request.content,
        metadata: toPrismaJson(request.metadata)
      }
    })

    // Update conversation's updatedAt timestamp
    await prisma.conversation.update({
      where: { id: request.conversationId },
      data: { updatedAt: new Date() }
    })

    const duration = timer()

    logger.persistenceOperation('created', 'chat message', message.id, undefined, {
      processingTime: duration,
      conversationId: request.conversationId,
      role: request.role,
      contentLength: request.content.length
    })

    return {
      success: true,
      messageId: message.id,
      metadata: { processingTime: duration }
    }
  } catch (err) {
    const duration = timer()
    const error = err instanceof Error ? err : new Error(CONVERSATION_MESSAGES.UNKNOWN_ERROR)

    logger.error('Failed to persist message', error, {
      processingTime: duration,
      conversationId: request.conversationId,
      role: request.role
    })

    return {
      success: false,
      error: error.message,
      metadata: { processingTime: duration }
    }
  }
}

/**
 * Get conversation history with optional limit
 */
export async function getConversationHistory(
  conversationId: string,
  limit?: number
): Promise<{ success: boolean; messages?: ChatMessage[]; error?: string }> {
  const timer = logger.startTimer('Get Conversation History')

  try {
    logger.conversationFlow('Loading conversation history', conversationId, undefined, { limit: limit ?? 0 })

    const messages = await prisma.chatMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      ...(limit && { take: limit })
    })

    const duration = timer()

    logger.persistenceOperation('loaded', 'conversation history', conversationId, undefined, {
      processingTime: duration,
      messageCount: messages.length,
      limit
    })

    const typedMessages: ChatMessage[] = messages.map(msg => ({
      ...msg,
      role: msg.role as 'user' | 'assistant',
      metadata: msg.metadata as ChatMessageMetadata | null
    }))

    return { success: true, messages: typedMessages }
  } catch (err) {
    const duration = timer()
    const error = err instanceof Error ? err : new Error(CONVERSATION_MESSAGES.UNKNOWN_ERROR)

    logger.error('Failed to get conversation history', error, {
      processingTime: duration,
      conversationId,
      limit
    })

    return { success: false, error: error.message }
  }
}

/**
 * Auto-generate a conversation title based on the first few messages
 */
export async function generateConversationTitle(
  request: AutoTitleRequest
): Promise<AutoTitleResult> {
  const timer = logger.startTimer('Generate Conversation Title')

  try {
    logger.ai('Generating conversation title', undefined, {
      conversationId: request.conversationId,
      messageCount: request.messages.length
    })

    // Extract first user message for context
    const firstUserMessage = request.messages.find(m => m.role === 'user')?.content || ''

    // Simple title generation based on content patterns
    let title = ''

    if (firstUserMessage.length < CONVERSATION_CONSTANTS.TITLE_GENERATION.SHORT_MESSAGE_LIMIT) {
      title = firstUserMessage
    } else {
      // Extract key phrases or use first sentence
      const firstSentence = firstUserMessage.split(/[.!?]/)[0]
      title = firstSentence && firstSentence.length < CONVERSATION_CONSTANTS.TITLE_GENERATION.SENTENCE_LIMIT ? firstSentence : firstUserMessage.slice(0, CONVERSATION_CONSTANTS.TITLE_GENERATION.TRUNCATED_LIMIT) + '...'
    }

    // Clean up title
    title = title.trim().replace(/^(what|how|why|when|where|can|could|would|should)\s+/i, '')
    title = title.charAt(0).toUpperCase() + title.slice(1)

    if (title.length < CONVERSATION_CONSTANTS.TITLE_GENERATION.MIN_TITLE_LENGTH) {
      title = 'Chat Conversation'
    }

    const duration = timer()

    // Update the conversation with the generated title
    await prisma.conversation.update({
      where: { id: request.conversationId },
      data: { title }
    })

    logger.success('Generated conversation title', title, {
      conversationId: request.conversationId,
      processingTime: duration
    })

    return {
      success: true,
      title,
      metadata: {
        model: 'rule-based',
        tokens: 0,
        cost: 0,
        processingTime: duration
      }
    }
  } catch (err) {
    const duration = timer()
    const error = err instanceof Error ? err : new Error(CONVERSATION_MESSAGES.UNKNOWN_ERROR)

    logger.error('Failed to generate conversation title', error, {
      processingTime: duration,
      conversationId: request.conversationId
    })

    return {
      success: false,
      error: error.message,
      metadata: {
        model: 'rule-based',
        tokens: 0,
        cost: 0,
        processingTime: duration
      }
    }
  }
}

/**
 * Check if user owns a conversation
 */
export async function validateConversationOwnership(
  conversationId: string,
  userId: string
): Promise<{ success: boolean; isOwner?: boolean; error?: string }> {
  const timer = logger.startTimer('Validate Conversation Ownership')

  try {
    logger.debug('Validating conversation ownership', undefined, {
      conversationId,
      userId
    })

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { userId: true }
    })

    const duration = timer()

    if (!conversation) {
      logger.warn('Conversation not found for ownership validation', undefined, {
        processingTime: duration,
        conversationId,
        userId
      })
      return { success: false, error: CONVERSATION_MESSAGES.NOT_FOUND }
    }

    const isOwner = conversation.userId === userId

    logger.debug('Conversation ownership validated', undefined, {
      processingTime: duration,
      conversationId,
      userId,
      isOwner
    })

    return { success: true, isOwner }
  } catch (err) {
    const duration = timer()
    const error = err instanceof Error ? err : new Error(CONVERSATION_MESSAGES.UNKNOWN_ERROR)

    logger.error('Failed to validate conversation ownership', error, {
      processingTime: duration,
      conversationId,
      userId
    })

    return { success: false, error: error.message }
  }
}

/**
 * Get recent context for conversation (last N messages)
 */
export async function getConversationContext(
  conversationId: string,
  messageLimit: number = CONVERSATION_CONSTANTS.DEFAULT_MESSAGE_LIMIT
): Promise<{ success: boolean; context?: ChatMessage[]; error?: string }> {
  const timer = logger.startTimer('Get Conversation Context')

  try {
    logger.conversationFlow('Loading conversation context', conversationId, undefined, { messageLimit })

    const messages = await prisma.chatMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
      take: messageLimit
    })

    // Reverse to get chronological order
    const context = messages.reverse()

    const duration = timer()

    logger.persistenceOperation('loaded', 'conversation context', conversationId, undefined, {
      processingTime: duration,
      messageCount: context.length,
      messageLimit
    })

    const typedContext: ChatMessage[] = context.map(msg => ({
      ...msg,
      role: msg.role as 'user' | 'assistant',
      metadata: msg.metadata as ChatMessageMetadata | null
    }))

    return { success: true, context: typedContext }
  } catch (err) {
    const duration = timer()
    const error = err instanceof Error ? err : new Error(CONVERSATION_MESSAGES.UNKNOWN_ERROR)

    logger.error('Failed to get conversation context', error, {
      processingTime: duration,
      conversationId,
      messageLimit
    })

    return { success: false, error: error.message }
  }
}

/**
 * Archive a conversation (soft delete by updating a flag)
 */
export async function archiveConversation(
  conversationId: string
): Promise<{ success: boolean; error?: string }> {
  const timer = logger.startTimer('Archive Conversation')

  try {
    logger.conversationFlow('Archiving conversation', conversationId)

    // For now, we'll just update the title to indicate archival
    // In a production system, you might add an 'archived' field to the schema
    const existingConversation = await prisma.conversation.findUnique({ where: { id: conversationId } })
    if (!existingConversation) {
      throw new Error(CONVERSATION_MESSAGES.NOT_FOUND)
    }

    await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        title: (existingConversation.title || 'Untitled') + ' [Archived]'
      }
    })

    const duration = timer()

    logger.persistenceOperation('archived', 'conversation', conversationId, undefined, {
      processingTime: duration
    })

    return { success: true }
  } catch (err) {
    const duration = timer()
    const error = err instanceof Error ? err : new Error(CONVERSATION_MESSAGES.UNKNOWN_ERROR)

    logger.error('Failed to archive conversation', error, {
      processingTime: duration,
      conversationId
    })

    return { success: false, error: error.message }
  }
}

/**
 * Get conversation statistics for analytics
 */
export async function getConversationStats(
  userId: string
): Promise<{
  success: boolean
  stats?: {
    totalConversations: number
    totalMessages: number
    averageMessagesPerConversation: number
    mostRecentActivity: Date | null
  }
  error?: string
}> {
  const timer = logger.startTimer('Get Conversation Stats')

  try {
    logger.debug('Calculating conversation statistics', undefined, { userId })

    const [totalConversations, totalMessages, recentActivity] = await Promise.all([
      prisma.conversation.count({ where: { userId } }),
      prisma.chatMessage.count({
        where: { conversation: { userId } }
      }),
      prisma.conversation.findFirst({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
        select: { updatedAt: true }
      })
    ])

    const averageMessagesPerConversation = totalConversations > 0
      ? Math.round((totalMessages / totalConversations) * CONVERSATION_CONSTANTS.AVERAGE_PRECISION) / CONVERSATION_CONSTANTS.AVERAGE_PRECISION
      : 0

    const duration = timer()

    const stats = {
      totalConversations,
      totalMessages,
      averageMessagesPerConversation,
      mostRecentActivity: recentActivity?.updatedAt || null
    }

    logger.data('Conversation statistics calculated', {
      totalConversations,
      totalMessages,
      averageMessagesPerConversation,
      mostRecentActivity: recentActivity?.updatedAt?.toISOString() || null
    }, {
      processingTime: duration,
      userId
    })

    return { success: true, stats }
  } catch (err) {
    const duration = timer()
    const error = err instanceof Error ? err : new Error(CONVERSATION_MESSAGES.UNKNOWN_ERROR)

    logger.error('Failed to get conversation statistics', error, {
      processingTime: duration,
      userId
    })

    return { success: false, error: error.message }
  }
}