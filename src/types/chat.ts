// Core chat types based on Prisma models
export interface Conversation {
  id: string
  userId: string
  title: string | null
  createdAt: Date
  updatedAt: Date
  messages?: ChatMessage[]
}

export interface ChatMessage {
  id: string
  conversationId: string
  role: 'user' | 'assistant'
  content: string
  metadata: ChatMessageMetadata | null
  createdAt: Date
  updatedAt: Date
}

// Chat message metadata for logging and analytics
export interface ChatMessageMetadata {
  // Intent classification
  intent?: 'data_query' | 'general_advice' | 'clarification'
  intentConfidence?: number

  // AI model information
  model?: string
  tokens?: number
  cost?: number

  // Processing performance
  processingTime?: number
  timestampStart?: string
  timestampEnd?: string

  // Query execution details (for data queries)
  queryPlan?: string
  queryType?: string
  queryResults?: Record<string, string | number | boolean | null>
  prismaQuery?: string

  // Error handling
  error?: string
  errorType?: string

  // Business context
  dataFilters?: Record<string, string | number | boolean | Date | null>
  businessContext?: string

  // Additional metadata
  [key: string]: string | number | boolean | Date | null | Record<string, string | number | boolean | Date | null> | undefined
}

// Intent classification types
export type ChatIntent = 'data_query' | 'general_advice' | 'clarification'

export interface IntentClassificationResult {
  intent: ChatIntent
  confidence: number
  reasoning: string
  requiresData: boolean
  metadata: {
    model: string
    tokens: number
    cost: number
    processingTime: number
  }
}

// Data query types
export interface DataQueryRequest {
  userMessage: string
  conversationHistory: ChatMessage[]
  intent: 'data_query'
  filters?: {
    dateRange?: {
      start: Date
      end: Date
    }
    locationIds?: string[]
    itemIds?: string[]
    minAmount?: number
    maxAmount?: number
  }
}

export interface DataQueryResult {
  success: boolean
  data?: Record<string, string | number | boolean | null> | Array<Record<string, string | number | boolean | null>>
  summary: string
  queryPlan: string
  queryType: string
  recordCount?: number
  metadata: {
    model: string
    processingTime: number
    prismaQuery: string
    filters: Record<string, string | number | boolean | Date | null>
  }
  error?: string
}

// General advice types
export interface GeneralAdviceRequest {
  userMessage: string
  conversationHistory: ChatMessage[]
  intent: 'general_advice'
  businessContext?: {
    recentSales?: Array<Record<string, string | number | boolean | null>>
    performanceMetrics?: Record<string, number>
  }
}

export interface GeneralAdviceResult {
  success: boolean
  advice: string
  actionItems?: string[]
  metadata: {
    model: string
    tokens: number
    cost: number
    processingTime: number
  }
  error?: string
}

// Clarification types
export interface ClarificationRequest {
  userMessage: string
  conversationHistory: ChatMessage[]
  intent: 'clarification'
  ambiguousAspects: string[]
}

export interface ClarificationResult {
  success: boolean
  questions: string[]
  suggestedFilters?: Record<string, string[] | Record<string, string>>
  metadata: {
    model: string
    tokens: number
    cost: number
    processingTime: number
  }
  error?: string
}

// API request/response types
export interface ChatRequest {
  message: string
  conversationId?: string
  userId: string
}

export interface ChatResponse {
  success: boolean
  message: string
  conversationId: string
  messageId: string
  intent: ChatIntent
  metadata: ChatMessageMetadata
  error?: string
}

// Conversation management types
export interface ConversationListItem {
  id: string
  title: string | null
  lastMessageAt: Date
  messageCount: number
  lastMessage?: string
}

export interface CreateConversationRequest {
  userId: string
  title?: string
}

export interface UpdateConversationRequest {
  id: string
  title?: string
}

// Frontend component types
export interface ChatInterfaceProps {
  userId: string
  initialConversationId?: string
}

export interface ConversationListProps {
  userId: string
  currentConversationId?: string
  onConversationSelect: (conversationId: string) => void
  onNewConversation: () => void
}

export interface MessageComponentProps {
  message: ChatMessage
  isLoading?: boolean
}

// Error types
export interface ChatError {
  type: 'validation' | 'ai_request' | 'database' | 'unknown'
  message: string
  details?: Record<string, string | number | boolean | null>
  conversationId?: string
  messageId?: string
}

// Configuration types
export interface ChatConfig {
  openaiApiKey: string
  models: {
    classification: string
    dataQuery: string
    generalAdvice: string
  }
  maxTokens: {
    classification: number
    dataQuery: number
    generalAdvice: number
  }
  timeouts: {
    aiRequest: number
    databaseQuery: number
  }
}

// Prisma query builder types
export interface PrismaQueryParams {
  table: 'Sale' | 'SaleItem' | 'Location' | 'Item'
  operation: 'findMany' | 'findFirst' | 'count' | 'aggregate'
  where?: Record<string, string | number | boolean | Date | Record<string, string | number | boolean | Date | null> | null>
  select?: Record<string, boolean>
  include?: Record<string, boolean | Record<string, boolean>>
  orderBy?: Record<string, 'asc' | 'desc'>
  take?: number
  skip?: number
}

export interface SafeQueryResult {
  success: boolean
  data?: Record<string, string | number | boolean | null> | Array<Record<string, string | number | boolean | null>>
  error?: string
  metadata: {
    queryPlan: string
    processingTime: number
    recordCount?: number
  }
}

// Chat flow state types
export interface ChatFlowState {
  conversationId: string | null
  isLoading: boolean
  currentMessage: string
  messages: ChatMessage[]
  error: string | null
}

// Title generation types
export interface TitleGenerationResult {
  title: string
  metadata: {
    model: string
    tokens: number
    cost: number
    processingTime: number
  }
}

// Performance monitoring types
export interface PerformanceMetrics {
  totalProcessingTime: number
  intentClassificationTime: number
  queryExecutionTime: number
  aiResponseTime: number
  persistenceTime: number
  tokenUsage: {
    total: number
    classification: number
    response: number
  }
  costs: {
    total: number
    classification: number
    response: number
  }
}

// Conversation context types for AI
export interface ConversationContext {
  messages: ChatMessage[]
  userId: string
  businessMetrics?: {
    totalSales: number
    averageTransaction: number
    topProducts: string[]
    recentTrends: Record<string, number>
  }
  timeRange?: {
    start: Date
    end: Date
  }
}

// Database persistence types
export interface PersistMessageRequest {
  conversationId: string
  role: 'user' | 'assistant'
  content: string
  metadata?: ChatMessageMetadata
}

export interface PersistMessageResult {
  success: boolean
  messageId?: string
  error?: string
  metadata: {
    processingTime: number
  }
}

// Auto-title generation types
export interface AutoTitleRequest {
  conversationId: string
  messages: ChatMessage[]
}

export interface AutoTitleResult {
  success: boolean
  title?: string
  error?: string
  metadata: {
    model: string
    tokens: number
    cost: number
    processingTime: number
  }
}

// Export utility types
export type ChatRole = ChatMessage['role']
export type MessageMetadata = ChatMessageMetadata
export type ConversationWithMessages = Conversation & { messages: ChatMessage[] }