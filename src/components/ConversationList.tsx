'use client'

import React, { useState, useEffect, useCallback } from 'react'
import type {
  ConversationListProps,
  ConversationListItem
} from '../types/chat'

// Time calculation constants
const MILLISECONDS_PER_SECOND = 1000
const SECONDS_PER_MINUTE = 60
const MINUTES_PER_HOUR = 60
const HOURS_PER_DAY = 24
const DAYS_PER_WEEK = 7
const DAYS_PER_MONTH = 30
const WEEKS_PER_MONTH = 4
const DISPLAY_CHARACTER_LIMIT = 50
const TITLE_DISPLAY_LENGTH = 30

/**
 * Conversation list sidebar component for managing chat conversations
 */
export default function ConversationList({
  userId,
  currentConversationId,
  onConversationSelect,
  onNewConversation
}: ConversationListProps) {
  // State management
  const [conversations, setConversations] = useState<ConversationListItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState<{
    totalConversations: number
    totalMessages: number
    averageMessagesPerConversation: number
    mostRecentActivity: Date | null
  } | null>(null)
  const [isCreatingNew, setIsCreatingNew] = useState(false)

  /**
   * Load conversations from API
   */
  const loadConversations = useCallback(async () => {
    console.log('🔄 Loading conversations for user:', userId)
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/conversations?includeStats=true')
      const data = await response.json() as {
        success: boolean
        conversations?: ConversationListItem[]
        stats?: {
          totalConversations: number
          totalMessages: number
          averageMessagesPerConversation: number
          mostRecentActivity: Date | null
        }
        error?: string
      }

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load conversations')
      }

      if (data.success) {
        console.log('✅ Conversations loaded:', data.conversations?.length || 0)
        setConversations(data.conversations || [])
        setStats(data.stats || null)
        setError(null)
      } else {
        throw new Error('Invalid conversations response')
      }
    } catch (err) {
      console.error('❌ Failed to load conversations:', err)
      setError(err instanceof Error ? err.message : 'Failed to load conversations')
    } finally {
      setIsLoading(false)
    }
  }, [userId])

  /**
   * Create new conversation
   */
  const handleNewConversation = useCallback(async () => {
    console.log('🆕 Creating new conversation')
    setIsCreatingNew(true)
    setError(null)

    try {
      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: null // Will be auto-generated
        })
      })

      const data = await response.json() as {
        success: boolean
        conversation?: {
          id: string
          title: string | null
          createdAt?: string
        }
        error?: string
      }

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create conversation')
      }

      if (data.success && data.conversation) {
        console.log('✅ New conversation created:', data.conversation.id)

        // Add to conversations list
        const newConversationItem: ConversationListItem = {
          id: data.conversation.id,
          title: data.conversation.title,
          lastMessageAt: new Date(data.conversation.createdAt || Date.now()),
          messageCount: 0
        }

        setConversations(prev => [newConversationItem, ...prev])
        onNewConversation()
        onConversationSelect(data.conversation.id)
        setError(null)
      } else {
        throw new Error('Invalid conversation creation response')
      }
    } catch (err) {
      console.error('❌ Failed to create conversation:', err)
      setError(err instanceof Error ? err.message : 'Failed to create conversation')
    } finally {
      setIsCreatingNew(false)
    }
  }, [onNewConversation, onConversationSelect])

  /**
   * Delete conversation
   */
  const handleDeleteConversation = useCallback(async (conversationId: string, e: React.MouseEvent) => {
    e.stopPropagation() // Prevent conversation selection

    if (!window.confirm('Are you sure you want to delete this conversation? This action cannot be undone.')) {
      return
    }

    console.log('🗑️ Deleting conversation:', conversationId)

    try {
      const response = await fetch(`/api/conversations/${conversationId}`, {
        method: 'DELETE'
      })

      const data = await response.json() as {
        success: boolean
        error?: string
      }

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete conversation')
      }

      if (data.success) {
        console.log('✅ Conversation deleted:', conversationId)

        // Remove from conversations list
        setConversations(prev => prev.filter(conv => conv.id !== conversationId))

        // If this was the current conversation, create a new one
        if (currentConversationId === conversationId) {
          onNewConversation()
        }

        setError(null)
      } else {
        throw new Error('Invalid conversation deletion response')
      }
    } catch (err) {
      console.error('❌ Failed to delete conversation:', err)
      setError(err instanceof Error ? err.message : 'Failed to delete conversation')
    }
  }, [currentConversationId, onNewConversation])

  /**
   * Format timestamp for display
   */
  const formatRelativeTime = useCallback((date: Date) => {
    const now = new Date()
    const diffInMinutes = Math.floor((now.getTime() - new Date(date).getTime()) / (MILLISECONDS_PER_SECOND * SECONDS_PER_MINUTE))

    if (diffInMinutes < 1) return 'Just now'
    if (diffInMinutes < MINUTES_PER_HOUR) return `${diffInMinutes}m ago`

    const diffInHours = Math.floor(diffInMinutes / MINUTES_PER_HOUR)
    if (diffInHours < HOURS_PER_DAY) return `${diffInHours}h ago`

    const diffInDays = Math.floor(diffInHours / HOURS_PER_DAY)
    if (diffInDays < DAYS_PER_WEEK) return `${diffInDays}d ago`

    const diffInWeeks = Math.floor(diffInDays / DAYS_PER_WEEK)
    if (diffInWeeks < WEEKS_PER_MONTH) return `${diffInWeeks}w ago`

    const diffInMonths = Math.floor(diffInDays / DAYS_PER_MONTH)
    return `${diffInMonths}mo ago`
  }, [])

  /**
   * Truncate title for display
   */
  const truncateTitle = useCallback((title: string | null, maxLength = TITLE_DISPLAY_LENGTH) => {
    if (!title) return 'New Conversation'
    return title.length > maxLength ? `${title.slice(0, maxLength)}...` : title
  }, [])

  /**
   * Truncate last message for display
   */
  const truncateMessage = useCallback((message: string | undefined, maxLength = DISPLAY_CHARACTER_LIMIT) => {
    if (!message) return ''
    return message.length > maxLength ? `${message.slice(0, maxLength)}...` : message
  }, [])

  // Load conversations on mount
  useEffect(() => {
    loadConversations()
  }, [loadConversations])

  return (
    <div className="h-full bg-gray-50 border-r border-gray-200 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Conversations</h2>
          <button
            onClick={handleNewConversation}
            disabled={isCreatingNew}
            className={`p-2 rounded-md transition-colors ${
              isCreatingNew
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
            title="New Conversation"
          >
            {isCreatingNew ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            )}
          </button>
        </div>

        {/* Stats */}
        {stats && (
          <div className="text-sm text-gray-600 space-y-1">
            <div>Total: {stats.totalConversations} conversations</div>
            <div>Messages: {stats.totalMessages}</div>
            {stats.averageMessagesPerConversation > 0 && (
              <div>Avg: {stats.averageMessagesPerConversation} messages/chat</div>
            )}
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-50 border-b border-red-200">
          <div className="text-sm text-red-700">{error}</div>
          <button
            onClick={loadConversations}
            className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
          >
            Try again
          </button>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-sm text-gray-600">Loading conversations...</p>
          </div>
        </div>
      )}

      {/* Conversations List */}
      {!isLoading && (
        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              <p className="text-sm">No conversations yet</p>
              <p className="text-xs mt-1">Start a new conversation to begin</p>
            </div>
          ) : (
            <div className="space-y-1 p-2">
              {conversations.map((conversation) => (
                <div
                  key={conversation.id}
                  onClick={() => onConversationSelect(conversation.id)}
                  className={`group cursor-pointer rounded-md p-3 transition-colors hover:bg-white ${
                    currentConversationId === conversation.id
                      ? 'bg-white border border-blue-200 shadow-sm'
                      : 'hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className={`text-sm font-medium truncate ${
                        currentConversationId === conversation.id
                          ? 'text-blue-900'
                          : 'text-gray-900'
                      }`}>
                        {truncateTitle(conversation.title)}
                      </h3>

                      {conversation.lastMessage && (
                        <p className="text-xs text-gray-500 mt-1 truncate">
                          {truncateMessage(conversation.lastMessage)}
                        </p>
                      )}

                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-gray-400">
                          {formatRelativeTime(conversation.lastMessageAt)}
                        </span>

                        {conversation.messageCount > 0 && (
                          <span className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded-full">
                            {conversation.messageCount}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Delete button */}
                    <button
                      onClick={(e) => handleDeleteConversation(conversation.id, e)}
                      className="opacity-0 group-hover:opacity-100 ml-2 p-1 rounded hover:bg-red-100 text-gray-400 hover:text-red-600 transition-all"
                      title="Delete conversation"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Refresh button */}
      {!isLoading && (
        <div className="p-4 border-t border-gray-200 bg-white">
          <button
            onClick={loadConversations}
            className="w-full text-sm text-gray-600 hover:text-gray-800 py-2 px-3 rounded-md hover:bg-gray-100 transition-colors"
          >
            Refresh
          </button>
        </div>
      )}
    </div>
  )
}