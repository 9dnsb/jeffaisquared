'use client'

import React, { useState, useRef, useEffect } from 'react'

// ============================================================================
// Types
// ============================================================================

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  // Store query results with each assistant message
  queryState?: {
    sql: string
    explanation: string
    results: Record<string, unknown>[]
    error: string | null
  }
  responseId?: string // OpenAI response ID for conversation continuity
}

interface StreamState {
  status: string
  schemaContext: string[]
  sql: string
  explanation: string
  results: Record<string, unknown>[]
  error: string | null
  isStreaming: boolean
}

interface SSEEvent {
  type:
    | 'status'
    | 'schema'
    | 'sql'
    | 'results'
    | 'error'
    | 'complete'
    | 'response_id'
  message?: string
  context?: string[]
  query?: string
  explanation?: string
  data?: Record<string, unknown>[]
  error?: string
  responseId?: string
}

// ============================================================================
// Main Component
// ============================================================================

export default function ChatInterface({ userId }: { userId: string }) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [streamState, setStreamState] = useState<StreamState>({
    status: '',
    schemaContext: [],
    sql: '',
    explanation: '',
    results: [],
    error: null,
    isStreaming: false,
  })
  const [debugInfo, setDebugInfo] = useState<string>('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const lastStreamingRef = useRef(false)
  const currentMessageIdRef = useRef<string | null>(null)

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamState])

  // Save streaming results to message when streaming completes
  useEffect(() => {
    // Detect when streaming transitions from true to false
    if (lastStreamingRef.current && !streamState.isStreaming && currentMessageIdRef.current) {
      const messageId = currentMessageIdRef.current
      console.log('[ChatInterface] Streaming completed, saving to message:', {
        messageId,
        sql: streamState.sql,
        explanation: streamState.explanation,
        resultsLength: streamState.results.length,
        results: streamState.results,
      })

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId
            ? {
                ...msg,
                queryState: {
                  sql: streamState.sql,
                  explanation: streamState.explanation,
                  results: streamState.results,
                  error: streamState.error,
                },
              }
            : msg
        )
      )

      currentMessageIdRef.current = null
    }
    lastStreamingRef.current = streamState.isStreaming
  }, [streamState.isStreaming, streamState.sql, streamState.explanation, streamState.results, streamState.error])

  // ============================================================================
  // SSE Streaming Handler
  // ============================================================================

  const streamQuery = async (question: string, messageId: string) => {
    // Set current message ID for useEffect to save results when streaming completes
    currentMessageIdRef.current = messageId

    // Reset stream state
    setStreamState({
      status: '',
      schemaContext: [],
      sql: '',
      explanation: '',
      results: [],
      error: null,
      isStreaming: true,
    })

    // Track final state locally
    let finalState = {
      sql: '',
      explanation: '',
      results: [] as Record<string, unknown>[],
      error: null as string | null,
      responseId: undefined as string | undefined,
    }

    // Build conversation history for context (all messages in current chat)
    // Include SQL queries and result summaries for assistant messages
    const conversationHistory = messages.map((msg) => ({
      role: msg.role,
      content:
        msg.role === 'user'
          ? msg.content
          : msg.queryState
            ? `${msg.queryState.explanation}\n\nSQL Query:\n${msg.queryState.sql}\n\nResults: ${msg.queryState.results.length} row(s) with columns: ${Object.keys(msg.queryState.results[0] || {}).join(', ')}`
            : 'Query executed',
    }))

    try {
      const response = await fetch('/api/text-to-sql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          conversationHistory,
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const reader = response.body?.getReader()
      if (!reader) throw new Error('No response stream')

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') continue

            try {
              const event = JSON.parse(data) as SSEEvent
              console.log('[ChatInterface] SSE event received:', event.type, event)

              setStreamState((prev) => {
                const next = { ...prev }

                switch (event.type) {
                  case 'status':
                    next.status = event.message || ''
                    break
                  case 'schema':
                    next.schemaContext = event.context || []
                    break
                  case 'sql':
                    next.sql = event.query || ''
                    next.explanation = event.explanation || ''
                    finalState.sql = event.query || ''
                    finalState.explanation = event.explanation || ''
                    break
                  case 'results':
                    next.results = event.data || []
                    next.isStreaming = false
                    finalState.results = event.data || []
                    setDebugInfo(`Results received: ${JSON.stringify(event.data)}`)
                    console.log('[ChatInterface] Results received:', {
                      dataLength: event.data?.length,
                      data: event.data,
                      finalStateLength: finalState.results.length,
                    })
                    break
                  case 'error':
                    next.error = event.error || 'Unknown error'
                    next.isStreaming = false
                    finalState.error = event.error || 'Unknown error'
                    break
                  case 'response_id':
                    // Store response ID for conversation continuity
                    finalState.responseId = event.responseId
                    break
                  case 'complete':
                    next.isStreaming = false
                    break
                }

                return next
              })
            } catch (parseErr) {
              console.error('Failed to parse SSE:', parseErr)
            }
          }
        }
      }

      // Streaming complete - useEffect will handle saving results to message
      // using streamState (React state) instead of finalState (local variable)
      console.log('[ChatInterface] Stream ended, waiting for useEffect to save results')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Stream failed'
      setStreamState((prev) => ({
        ...prev,
        error: errorMessage,
        isStreaming: false,
      }))

      // Save error to message
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId
            ? {
                ...msg,
                queryState: {
                  sql: '',
                  explanation: '',
                  results: [],
                  error: errorMessage,
                },
              }
            : msg
        )
      )
    }
  }

  // ============================================================================
  // Message Handlers
  // ============================================================================

  const handleSend = async () => {
    if (!input.trim()) return

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input.trim(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput('')

    // Add placeholder for assistant response
    const assistantMessageId = `assistant-${Date.now()}`
    const assistantMessage: Message = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
    }
    setMessages((prev) => [...prev, assistantMessage])

    // Start streaming
    await streamQuery(userMessage.content, assistantMessageId)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div className="flex h-screen flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white px-6 py-4 dark:border-gray-700 dark:bg-gray-800">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
          Sales Analytics Chat
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Ask questions about your sales data
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        <div className="mx-auto max-w-3xl space-y-4">
          {messages.map((message, index) => (
            <div key={message.id}>
              {message.role === 'user' ? (
                <div className="flex justify-end">
                  <div className="max-w-[80%] rounded-lg bg-blue-600 px-4 py-2 text-white">
                    {message.content}
                  </div>
                </div>
              ) : (
                <div className="flex justify-start">
                  <div className="max-w-[80%] rounded-lg bg-white px-4 py-2 shadow dark:bg-gray-800">
                    {/* Show streaming state for the last assistant message */}
                    {index === messages.length - 1 && streamState.isStreaming && (
                      <StreamingProgress state={streamState} />
                    )}

                    {/* Show saved results from previous messages */}
                    {message.queryState && !streamState.isStreaming && (
                      <QueryResults state={message.queryState} />
                    )}

                    {/* Show results for the last assistant message during streaming */}
                    {index === messages.length - 1 &&
                      !streamState.isStreaming &&
                      !message.queryState &&
                      (streamState.results.length > 0 || streamState.error) && (
                        <QueryResults state={streamState} />
                      )}
                  </div>
                </div>
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Debug Info */}
      {false && debugInfo && (
        <div className="border-t border-yellow-200 bg-yellow-50 px-6 py-2 text-xs dark:border-yellow-800 dark:bg-yellow-900/20">
          <div className="mx-auto max-w-3xl">
            <strong>Debug:</strong> {debugInfo}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="border-t border-gray-200 bg-white px-6 py-4 dark:border-gray-700 dark:bg-gray-800">
        <div className="mx-auto max-w-3xl">
          <div className="flex space-x-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask a question about your sales data..."
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              disabled={streamState.isStreaming}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || streamState.isStreaming}
              className="rounded-lg bg-blue-600 px-6 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Streaming Progress Component
// ============================================================================

function StreamingProgress({ state }: { state: StreamState }) {
  return (
    <div className="space-y-3">
      {/* Current Status with Spinner */}
      {state.status && (
        <div className="flex items-center space-x-2 text-gray-700 dark:text-gray-300">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          <span className="text-sm font-medium">
            {state.status.includes('Analyzing') && '🧠 '}
            {state.status.includes('Retrieving') && '🔍 '}
            {state.status.includes('Generating') && '🧩 '}
            {state.status.includes('Executing') && '🚀 '}
            {state.status}
          </span>
        </div>
      )}

      {/* Schema Context */}
      {state.schemaContext.length > 0 && (
        <div className="rounded-md bg-blue-50 p-3 dark:bg-blue-900/20">
          <div className="mb-1 flex items-center space-x-2 text-sm font-medium text-blue-900 dark:text-blue-300">
            <span>🔍</span>
            <span>Schema Context</span>
          </div>
          <div className="space-y-1 text-xs text-blue-700 dark:text-blue-400">
            {state.schemaContext.map((ctx, i) => (
              <div key={i}>{ctx}</div>
            ))}
          </div>
        </div>
      )}

      {/* Generated SQL */}
      {state.sql && (
        <div className="rounded-md bg-gray-50 p-3 dark:bg-gray-800">
          <div className="mb-2 flex items-center space-x-2 text-sm font-medium text-gray-900 dark:text-gray-300">
            <span>🧩</span>
            <span>Generated SQL</span>
          </div>
          {state.explanation && (
            <p className="mb-2 text-xs text-gray-600 dark:text-gray-400">
              {state.explanation}
            </p>
          )}
          <pre className="overflow-x-auto rounded bg-gray-900 p-2 text-xs text-green-400">
            <code>{state.sql}</code>
          </pre>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// Query Results Component
// ============================================================================

function QueryResults({
  state,
}: {
  state:
    | StreamState
    | { sql: string; explanation: string; results: Record<string, unknown>[]; error: string | null }
}) {
  if (state.error) {
    return (
      <div className="rounded-md bg-red-50 p-4 dark:bg-red-900/20">
        <div className="flex items-center space-x-2">
          <span className="text-lg">❌</span>
          <div>
            <div className="font-medium text-red-900 dark:text-red-300">
              Query Error
            </div>
            <div className="text-sm text-red-700 dark:text-red-400">
              {state.error}
            </div>
          </div>
        </div>
      </div>
    )
  }

  console.log('[QueryResults] Rendering with state:', {
    hasResults: !!state.results,
    resultsLength: state.results?.length,
    resultsType: typeof state.results,
    isArray: Array.isArray(state.results),
    firstResult: state.results?.[0],
  })

  if (!state.results || state.results.length === 0) {
    return (
      <div className="rounded-md bg-yellow-50 p-4 dark:bg-yellow-900/20">
        <div className="flex items-center space-x-2 text-yellow-900 dark:text-yellow-300">
          <span className="text-lg">ℹ️</span>
          <div>
            <div className="font-medium">No results found</div>
            <div className="text-xs mt-1">
              Debug: results={JSON.stringify(state.results)}, length={state.results?.length}, type={typeof state.results}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Success Header */}
      <div className="flex items-center space-x-2 text-green-700 dark:text-green-400">
        <span className="text-lg">📊</span>
        <span className="font-medium">Results ({state.results.length} rows)</span>
      </div>

      {/* SQL Query (Collapsible) */}
      {state.sql && (
        <details className="rounded-md bg-gray-50 p-2 dark:bg-gray-800">
          <summary className="cursor-pointer text-xs font-medium text-gray-600 dark:text-gray-400">
            View SQL Query
          </summary>
          <pre className="mt-2 overflow-x-auto rounded bg-gray-900 p-2 text-xs text-green-400">
            <code>{state.sql}</code>
          </pre>
        </details>
      )}

      {/* Results Table */}
      <div className="overflow-x-auto rounded-md border border-gray-200 dark:border-gray-700">
        <table className="min-w-full divide-y divide-gray-200 text-sm dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              {Object.keys(state.results[0] || {}).map((key) => (
                <th
                  key={key}
                  className="px-4 py-2 text-left font-medium text-gray-700 dark:text-gray-300"
                >
                  {key}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-900">
            {state.results.map((row, i) => (
              <tr key={i}>
                {Object.values(row).map((value, j) => (
                  <td
                    key={j}
                    className="px-4 py-2 text-gray-900 dark:text-gray-100"
                  >
                    {formatCellValue(value)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ============================================================================
// Utilities
// ============================================================================

function formatCellValue(value: unknown): string {
  if (value === null || value === undefined) return '-'
  if (typeof value === 'boolean') return value ? '✓' : '✗'
  if (typeof value === 'number') {
    return value.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })
  }
  return String(value)
}
