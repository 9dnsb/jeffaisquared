/**
 * Chat and Conversation Types
 * Minimal types for conversation management (non-AI specific)
 */

// Message role in a conversation
export type MessageRole = 'user' | 'assistant'

// Chat message metadata structure
export interface ChatMessageMetadata {
  intent?: string
  intentConfidence?: number
  model?: string
  tokens?: number
  cost?: number
  processingTime?: number
  queryType?: string
  [key: string]: unknown
}

// Chat message structure
export interface ChatMessage {
  id: string
  conversationId: string
  role: MessageRole
  content: string
  metadata: ChatMessageMetadata | null
  createdAt: Date
  updatedAt: Date
}

// Conversation structure
export interface Conversation {
  id: string
  userId: string
  title: string | null
  createdAt: Date
  updatedAt: Date
}

// Conversation with messages
export interface ConversationWithMessages extends Conversation {
  messages: ChatMessage[]
}

// Conversation list item (for UI display)
export interface ConversationListItem {
  id: string
  userId: string
  title: string | null
  createdAt: Date
  updatedAt: Date
  messageCount?: number
  lastMessageAt?: Date
  lastMessage?: string
}

// Persist message request
export interface PersistMessageRequest {
  conversationId: string
  role: MessageRole
  content: string
  metadata?: ChatMessageMetadata
}

// Persist message result
export interface PersistMessageResult {
  success: boolean
  messageId?: string
  error?: string
  metadata?: ChatMessageMetadata
}

// Auto title request
export interface AutoTitleRequest {
  conversationId: string
  messages: ChatMessage[]
}

// Auto title result
export interface AutoTitleResult {
  success: boolean
  title?: string
  error?: string
  metadata?: ChatMessageMetadata
}

// Chat response (for API)
export interface ChatResponse {
  success: boolean
  message?: string
  conversationId?: string
  messageId?: string
  intent?: string
  error?: string
  metadata?: ChatMessageMetadata
}

// Chat interface props (for UI components)
export interface ChatInterfaceProps {
  userId: string
  initialConversationId?: string
  conversation?: ConversationWithMessages
  onSendMessage?: (message: string) => Promise<void>
}

// Conversation list props (for UI components)
export interface ConversationListProps {
  userId: string
  currentConversationId?: string
  onConversationSelect?: (conversationId: string) => void
  onNewConversation?: () => void
}
