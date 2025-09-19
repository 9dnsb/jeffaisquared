import { NextRequest, NextResponse } from 'next/server'
import { logger } from '../../../lib/utils/logger'
import { dynamicDataQueryHandler } from '../../../lib/ai/dynamicDataQueryHandler'
import type { ChatMessage } from '../../../types/chat'

/**
 * Test endpoint for dynamic query testing without authentication
 * Only for development/testing purposes
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const timer = logger.startTimer('Test Query Request')

  try {
    const body = (await request.json()) as {
      message?: unknown
      conversationHistory?: unknown
    }
    const { message, conversationHistory = [] } = body

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required and must be a string' },
        { status: 400 }
      )
    }

    // eslint-disable-next-line no-magic-numbers
    logger.chat('🧪 Test query request', message.slice(0, 100))

    // Process as data query
    const result = await dynamicDataQueryHandler.processDataQuery({
      userMessage: message,
      conversationHistory: conversationHistory as ChatMessage[],
      intent: 'data_query',
    })

    const duration = timer()

    logger.success('Test query completed', undefined, {
      processingTime: duration,
      success: result.success,
      recordCount: result.recordCount,
    })

    return NextResponse.json({
      ...result,
      metadata: {
        ...result.metadata,
        processingTime: duration,
      },
    })
  } catch (err) {
    const duration = timer()
    const error = err instanceof Error ? err : new Error('Unknown error')

    logger.error('Test query failed', error, {
      processingTime: duration,
    })

    return NextResponse.json(
      {
        success: false,
        error: error.message,
        summary: 'An error occurred while processing your query.',
      },
      { status: 500 }
    )
  }
}
