// Logger constants
const LOGGER_CONSTANTS = {
  ID_DISPLAY_LENGTH: -8,
  COST_DECIMAL_PLACES: 4,
} as const

type LogData = string | Record<string, string | number | boolean | null>

interface LogMetadata {
  userId?: string
  conversationId?: string
  messageId?: string
  intent?: string
  model?: string
  tokens?: number
  cost?: number
  processingTime?: number
  queryPlan?: string
  error?: Error
  [key: string]: string | number | boolean | Date | Error | null | undefined
}

interface LogLevel {
  name: string
  emoji: string
  color: string
}

const LOG_LEVELS = {
  CHAT: { name: 'CHAT', emoji: '💬', color: '\x1b[36m' }, // Cyan
  INTENT: { name: 'INTENT', emoji: '🎯', color: '\x1b[35m' }, // Magenta
  DATA: { name: 'DATA', emoji: '📊', color: '\x1b[33m' }, // Yellow
  AI: { name: 'AI', emoji: '🤖', color: '\x1b[34m' }, // Blue
  PRISMA: { name: 'PRISMA', emoji: '🗄️', color: '\x1b[32m' }, // Green
  PERSIST: { name: 'PERSIST', emoji: '💾', color: '\x1b[96m' }, // Bright Cyan
  ERROR: { name: 'ERROR', emoji: '❌', color: '\x1b[31m' }, // Red
  SUCCESS: { name: 'SUCCESS', emoji: '✅', color: '\x1b[92m' }, // Bright Green
  WARN: { name: 'WARN', emoji: '⚠️', color: '\x1b[93m' }, // Bright Yellow
  DEBUG: { name: 'DEBUG', emoji: '🔍', color: '\x1b[90m' }, // Gray
  PERF: { name: 'PERF', emoji: '⏱️', color: '\x1b[95m' }, // Bright Magenta
} as const

const RESET_COLOR = '\x1b[0m'

class ChatLogger {
  private isEnabled: boolean = true

  private formatTimestamp(): string {
    return new Date().toISOString()
  }

  private formatMetadata(metadata?: LogMetadata): string {
    if (!metadata || Object.keys(metadata).length === 0) {
      return ''
    }

    const metaParts: string[] = []

    if (metadata.userId) metaParts.push(`👤 ${metadata.userId}`)
    if (metadata.conversationId)
      metaParts.push(
        `🗨️ ${metadata.conversationId.slice(
          LOGGER_CONSTANTS.ID_DISPLAY_LENGTH
        )}`
      )
    if (metadata.messageId)
      metaParts.push(
        `📝 ${metadata.messageId.slice(LOGGER_CONSTANTS.ID_DISPLAY_LENGTH)}`
      )
    if (metadata.intent) metaParts.push(`🎯 ${metadata.intent}`)
    if (metadata.model) metaParts.push(`🤖 ${metadata.model}`)
    if (metadata.tokens) metaParts.push(`🎫 ${metadata.tokens}`)
    if (metadata.cost)
      metaParts.push(
        `💰 $${metadata.cost.toFixed(LOGGER_CONSTANTS.COST_DECIMAL_PLACES)}`
      )
    if (metadata.processingTime)
      metaParts.push(`⏱️ ${metadata.processingTime}ms`)
    if (metadata.queryPlan) metaParts.push(`📋 ${metadata.queryPlan}`)

    // Add any additional metadata
    Object.entries(metadata).forEach(([key, value]) => {
      if (
        ![
          'userId',
          'conversationId',
          'messageId',
          'intent',
          'model',
          'tokens',
          'cost',
          'processingTime',
          'queryPlan',
          'error',
        ].includes(key)
      ) {
        if (typeof value === 'string' || typeof value === 'number') {
          metaParts.push(`${key}: ${value}`)
        } else {
          metaParts.push(`${key}: ${JSON.stringify(value)}`)
        }
      }
    })

    return metaParts.length > 0 ? ` | ${metaParts.join(' | ')}` : ''
  }

  private log(
    level: LogLevel,
    message: string,
    data?: LogData,
    metadata?: LogMetadata
  ): void {
    if (!this.isEnabled) return

    const timestamp = this.formatTimestamp()
    const metaString = this.formatMetadata(metadata)

    let logMessage = `${level.color}[${level.emoji} ${level.name}]${RESET_COLOR} ${timestamp} - ${message}${metaString}`

    // Add data if provided
    if (data !== undefined) {
      logMessage += `\n  📄 Data: ${
        typeof data === 'string' ? data : JSON.stringify(data, null, 2)
      }`
    }

    // Add error details if present
    if (metadata?.error) {
      logMessage += `\n  💥 Error: ${metadata.error.message}`
      if (metadata.error.stack) {
        logMessage += `\n  📚 Stack: ${metadata.error.stack}`
      }
    }

    console.log(logMessage)
  }

  // Chat system logging methods
  chat(message: string, data?: LogData, metadata?: LogMetadata): void {
    this.log(LOG_LEVELS.CHAT, message, data, metadata)
  }

  intent(message: string, data?: LogData, metadata?: LogMetadata): void {
    this.log(LOG_LEVELS.INTENT, message, data, metadata)
  }

  data(message: string, data?: LogData, metadata?: LogMetadata): void {
    this.log(LOG_LEVELS.DATA, message, data, metadata)
  }

  ai(message: string, data?: LogData, metadata?: LogMetadata): void {
    this.log(LOG_LEVELS.AI, message, data, metadata)
  }

  prisma(message: string, data?: LogData, metadata?: LogMetadata): void {
    this.log(LOG_LEVELS.PRISMA, message, data, metadata)
  }

  persist(message: string, data?: LogData, metadata?: LogMetadata): void {
    this.log(LOG_LEVELS.PERSIST, message, data, metadata)
  }

  error(message: string, error?: Error | string, metadata?: LogMetadata): void {
    const errorObj = error instanceof Error ? error : new Error(String(error))
    this.log(LOG_LEVELS.ERROR, message, undefined, {
      ...metadata,
      error: errorObj,
    })
  }

  success(message: string, data?: LogData, metadata?: LogMetadata): void {
    this.log(LOG_LEVELS.SUCCESS, message, data, metadata)
  }

  warn(message: string, data?: LogData, metadata?: LogMetadata): void {
    this.log(LOG_LEVELS.WARN, message, data, metadata)
  }

  debug(message: string, data?: LogData, metadata?: LogMetadata): void {
    this.log(LOG_LEVELS.DEBUG, message, data, metadata)
  }

  perf(message: string, data?: LogData, metadata?: LogMetadata): void {
    this.log(LOG_LEVELS.PERF, message, data, metadata)
  }

  // Performance timing utilities
  startTimer(label: string): () => number {
    const startTime = Date.now()
    this.perf(`Starting timer: ${label}`)

    return () => {
      const duration = Date.now() - startTime
      this.perf(`Timer completed: ${label}`, undefined, {
        processingTime: duration,
      })
      return duration
    }
  }

  // Context-aware logging for conversation flow
  conversationFlow(
    action: string,
    conversationId: string,
    userId?: string,
    data?: LogData
  ): void {
    const logMetadata: LogMetadata = {
      conversationId,
      ...(userId !== undefined && { userId }),
    }
    this.chat(`Conversation flow: ${action}`, data, logMetadata)
  }

  // AI interaction logging with token tracking
  aiInteraction(
    action: string,
    model: string,
    tokens?: number,
    cost?: number,
    data?: LogData,
    metadata?: LogMetadata
  ): void {
    const logMetadata: LogMetadata = {
      model,
      ...(tokens !== undefined && { tokens }),
      ...(cost !== undefined && { cost }),
      ...metadata,
    }
    this.ai(`AI ${action}`, data, logMetadata)
  }

  // Database operation logging
  dbOperation(
    operation: string,
    table: string,
    data?: LogData,
    metadata?: LogMetadata
  ): void {
    this.prisma(`Database ${operation} on ${table}`, data, metadata)
  }

  // Intent classification logging
  intentClassification(
    message: string,
    classifiedIntent: string,
    confidence?: number,
    metadata?: LogMetadata
  ): void {
    this.intent(`Intent classified: ${classifiedIntent}`, message, {
      intent: classifiedIntent,
      confidence,
      ...metadata,
    })
  }

  // Query execution logging
  queryExecution(
    queryType: string,
    queryPlan: string,
    results?: LogData,
    metadata?: LogMetadata
  ): void {
    this.data(`Query executed: ${queryType}`, results, {
      queryPlan,
      ...metadata,
    })
  }

  // Persistence operation logging
  persistenceOperation(
    operation: string,
    entityType: string,
    entityId?: string,
    data?: LogData,
    metadata?: LogMetadata
  ): void {
    this.persist(
      `${operation} ${entityType}${
        entityId
          ? ` [${entityId.slice(LOGGER_CONSTANTS.ID_DISPLAY_LENGTH)}]`
          : ''
      }`,
      data,
      metadata
    )
  }

  // Configuration methods
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled
  }
}

// Export a singleton instance
export const logger = new ChatLogger()

// Export types for external use
export type { LogMetadata, LogData }
