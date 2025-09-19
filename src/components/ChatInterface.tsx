'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import type {
  ChatInterfaceProps,
  ChatMessage,
  ConversationWithMessages,
  ChatResponse
} from '../types/chat'
import MarkdownMessage from './MarkdownMessage'

// Component constants
const AUTO_SCROLL_DELAY = 120
const CONVERSATION_ID_DISPLAY_LENGTH = -8
const PERCENTAGE_MULTIPLIER = 100
const COST_DECIMAL_PLACES = 4

/**
 * Main chat interface component with full conversation persistence
 * and real-time message handling
 */
export default function ChatInterface({ userId, initialConversationId }: ChatInterfaceProps) {
  // State management
  const [currentConversation, setCurrentConversation] = useState<ConversationWithMessages | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoadingConversation, setIsLoadingConversation] = useState(false)

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  /**
   * Scroll to bottom of messages
   */
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  /**
   * Load conversation by ID
   */
  const loadConversation = useCallback(async (conversationId: string) => {
    console.log('🔄 Loading conversation:', conversationId)
    setIsLoadingConversation(true)
    setError(null)

    try {
      const response = await fetch(`/api/conversations/${conversationId}?includeMessages=true`, {
        credentials: 'include'
      })
      const data = await response.json() as {
        success: boolean
        conversation?: ConversationWithMessages
        error?: string
      }

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load conversation')
      }

      if (data.success && data.conversation) {
        console.log('✅ Conversation loaded:', data.conversation.id, 'Messages:', data.conversation.messages?.length || 0)
        setCurrentConversation(data.conversation)
        setMessages(data.conversation.messages || [])
        setError(null)
      } else {
        throw new Error('Invalid conversation response')
      }
    } catch (err) {
      console.error('❌ Failed to load conversation:', err)
      setError(err instanceof Error ? err.message : 'Failed to load conversation')
    } finally {
      setIsLoadingConversation(false)
    }
  }, [])

  /**
   * Create new conversation
   */
  const createNewConversation = useCallback(async () => {
    console.log('🆕 Creating new conversation')
    setCurrentConversation(null)
    setMessages([])
    setError(null)
  }, [])

  /**
   * Send message to chat API
   */
  const sendMessage = useCallback(async () => {
    if (!inputMessage.trim() || isLoading) return

    const messageToSend = inputMessage.trim()
    setInputMessage('')
    setError(null)
    setIsLoading(true)

    // Add user message to UI immediately
    const tempUserMessage: ChatMessage = {
      id: `temp-${Date.now()}`,
      conversationId: currentConversation?.id || 'temp',
      role: 'user',
      content: messageToSend,
      metadata: null,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    setMessages(prev => [...prev, tempUserMessage])

    console.log('📤 Sending message:', {
      message: messageToSend,
      conversationId: currentConversation?.id,
      userId
    })

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          message: messageToSend,
          conversationId: currentConversation?.id,
          userId
        })
      })

      const data = await response.json() as ChatResponse

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send message')
      }

      if (data.success) {
        console.log('✅ Message sent successfully:', {
          conversationId: data.conversationId,
          intent: data.intent,
          messageLength: data.message.length,
          tokens: data.metadata.tokens,
          cost: data.metadata.cost,
          processingTime: data.metadata.processingTime
        })

        // Update conversation if this is a new one
        if (!currentConversation || currentConversation.id !== data.conversationId) {
          setCurrentConversation(prev => prev ? { ...prev, id: data.conversationId } : {
            id: data.conversationId,
            userId,
            title: null,
            createdAt: new Date(),
            updatedAt: new Date(),
            messages: []
          })
        }

        // Create proper AI response message
        const aiMessage: ChatMessage = {
          id: data.messageId,
          conversationId: data.conversationId,
          role: 'assistant',
          content: data.message,
          metadata: data.metadata,
          createdAt: new Date(),
          updatedAt: new Date()
        }

        // Replace temp message and add AI response
        setMessages(prev => {
          const withoutTemp = prev.filter(msg => msg.id !== tempUserMessage.id)
          const properUserMessage: ChatMessage = {
            ...tempUserMessage,
            id: `user-${data.messageId}`,
            conversationId: data.conversationId
          }
          return [...withoutTemp, properUserMessage, aiMessage]
        })

        setError(null)
      } else {
        throw new Error(data.error || 'Unknown error occurred')
      }
    } catch (err) {
      console.error('❌ Failed to send message:', err)
      setError(err instanceof Error ? err.message : 'Failed to send message')

      // Remove temp message on error
      setMessages(prev => prev.filter(msg => msg.id !== tempUserMessage.id))
    } finally {
      setIsLoading(false)
    }
  }, [inputMessage, isLoading, currentConversation, userId])

  /**
   * Handle Enter key press
   */
  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }, [sendMessage])

  /**
   * Auto-resize textarea
   */
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputMessage(e.target.value)

    // Auto-resize textarea
    const textarea = e.target
    textarea.style.height = 'auto'
    textarea.style.height = `${Math.min(textarea.scrollHeight, AUTO_SCROLL_DELAY)}px`
  }, [])

  /**
   * Format timestamp
   */
  const formatTimestamp = useCallback((date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).format(new Date(date))
  }, [])

  /**
   * Render message metadata for debugging
   */
  const renderMessageMetadata = useCallback((message: ChatMessage) => {
    if (!message.metadata) return null

    const metadata = message.metadata
    return (
      <div className="text-xs text-gray-400 mt-1 space-y-1">
        {metadata.intent && (
          <div>Intent: {metadata.intent} {metadata.intentConfidence && `(${(metadata.intentConfidence * PERCENTAGE_MULTIPLIER).toFixed(0)}%)`}</div>
        )}
        {metadata.model && (
          <div>Model: {metadata.model}</div>
        )}
        {metadata.tokens && (
          <div>Tokens: {metadata.tokens} {metadata.cost && `($${metadata.cost.toFixed(COST_DECIMAL_PLACES)})`}</div>
        )}
        {metadata.processingTime && (
          <div>Time: {metadata.processingTime}ms</div>
        )}
        {metadata.queryType && (
          <div>Query: {metadata.queryType}</div>
        )}
      </div>
    )
  }, [])

  // Load initial conversation
  useEffect(() => {
    if (initialConversationId) {
      loadConversation(initialConversationId)
    }
  }, [initialConversationId, loadConversation])

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 p-3 sm:p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-heading font-semibold text-primary">
              {currentConversation?.title || 'New Conversation'}
            </h2>
            {currentConversation && (
              <p className="text-sm text-text-gray">
                ID: {currentConversation.id.slice(CONVERSATION_ID_DISPLAY_LENGTH)}
              </p>
            )}
          </div>
          <button
            onClick={createNewConversation}
            className="bg-accent text-white px-4 py-2 rounded-md hover:bg-accent/90 transition-colors font-heading font-medium"
          >
            New Chat
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-4">
        {isLoadingConversation && (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
            <span className="ml-2 text-text-gray">Loading conversation...</span>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <div className="mt-2 text-sm text-red-700">{error}</div>
              </div>
            </div>
          </div>
        )}

        {messages.length === 0 && !isLoadingConversation && !error && (
          <div className="text-center py-8 text-gray-500">
            <p className="text-lg mb-2">Start a conversation</p>
            <p className="text-sm">Ask me about your sales data, get business advice, or ask any questions!</p>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xs lg:max-w-md xl:max-w-lg px-4 py-2 rounded-lg ${
                message.role === 'user'
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-900 border'
              }`}
            >
              {message.role === 'assistant' ? (
                <MarkdownMessage content={message.content} />
              ) : (
                <div className="whitespace-pre-wrap">{message.content}</div>
              )}
              <div className="flex items-center justify-between mt-2">
                <span className={`text-xs ${
                  message.role === 'user' ? 'text-white/70' : 'text-gray-500'
                }`}>
                  {formatTimestamp(message.createdAt)}
                </span>
                {message.role === 'assistant' && message.metadata?.intent && (
                  <span className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded">
                    {message.metadata.intent}
                  </span>
                )}
              </div>
              {/* Debug metadata (remove in production) */}
              {message.role === 'assistant' && renderMessageMetadata(message)}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 text-gray-900 border max-w-xs lg:max-w-md xl:max-w-lg px-4 py-2 rounded-lg">
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-accent"></div>
                <span>Thinking...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-200 p-3 sm:p-4">
        <div className="flex space-x-2">
          <textarea
            ref={textareaRef}
            value={inputMessage}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            placeholder="Type your message..."
            className="flex-1 resize-none border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-secondary/50 focus:border-secondary/70 bg-white text-gray-900 placeholder-text-gray"
            rows={1}
            disabled={isLoading}
          />
          <button
            onClick={sendMessage}
            disabled={!inputMessage.trim() || isLoading}
            className={`px-4 py-2 rounded-md font-heading font-medium transition-colors ${
              !inputMessage.trim() || isLoading
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-accent text-white hover:bg-accent/90'
            }`}
          >
            {isLoading ? 'Sending...' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  )
}