'use client'

import React, { useState, useRef, useCallback } from 'react'
import MarkdownMessage from './MarkdownMessage'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface ChatGPTInterfaceProps {
  userId: string
}

// Component constants
const AUTO_RESIZE_DELAY = 1000
const MAX_TEXTAREA_HEIGHT = 200

export default function ChatGPTInterface({ userId }: ChatGPTInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputValue.trim() || isLoading) return

    console.log('Message submitted by user:', userId)

    const newMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date()
    }

    setMessages(prev => [...prev, newMessage])
    setInputValue('')
    setIsLoading(true)

    // Simulate API call
    setTimeout(() => {
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `I received your message: "${newMessage.content}". This is a demo response showing the ChatGPT-style interface. The full AI system with conversation persistence, intent classification, and data querying is implemented in the backend files I've created.`,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, aiResponse])
      setIsLoading(false)
    }, AUTO_RESIZE_DELAY)
  }, [inputValue, isLoading, userId])

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value)

    // Auto-resize textarea
    const textarea = e.target
    textarea.style.height = 'auto'
    textarea.style.height = `${Math.min(textarea.scrollHeight, MAX_TEXTAREA_HEIGHT)}px`
  }, [])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }, [handleSubmit])

  return (
    <div className="flex h-screen bg-white">
      {/* Mobile Menu Button */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="fixed top-4 left-4 z-50 md:hidden bg-gray-900 text-white p-2 rounded-md"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {sidebarOpen ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          )}
        </svg>
      </button>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } md:translate-x-0 transition-transform duration-300 ease-in-out fixed md:static inset-y-0 left-0 z-40 w-64 bg-gray-900 text-white flex flex-col`}>
        {/* Header */}
        <div className="p-4 border-b border-gray-700">
          <button className="w-full bg-gray-800 hover:bg-gray-700 rounded-md p-3 text-left text-sm font-medium transition-colors">
            + New chat
          </button>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto p-2">
          <div className="space-y-1">
            {/* Placeholder conversations */}
            <div className="rounded-md p-3 text-sm hover:bg-gray-800 cursor-pointer transition-colors">
              <div className="font-medium">Sales Analysis Q1</div>
              <div className="text-gray-400 text-xs mt-1">2 hours ago</div>
            </div>
            <div className="rounded-md p-3 text-sm hover:bg-gray-800 cursor-pointer transition-colors">
              <div className="font-medium">Customer Trends</div>
              <div className="text-gray-400 text-xs mt-1">Yesterday</div>
            </div>
            <div className="rounded-md p-3 text-sm hover:bg-gray-800 cursor-pointer transition-colors">
              <div className="font-medium">Revenue Report</div>
              <div className="text-gray-400 text-xs mt-1">3 days ago</div>
            </div>
          </div>
        </div>

        {/* User Profile */}
        <div className="p-4 border-t border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
              <span className="text-sm font-medium">U</span>
            </div>
            <div className="flex-1 text-sm">
              <div className="font-medium">User</div>
              <div className="text-gray-400 text-xs">Free plan</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col md:ml-0">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto">
          {messages.length === 0 ? (
            /* Welcome Screen */
            <div className="h-full flex items-center justify-center pt-16 md:pt-0">
              <div className="text-center max-w-2xl px-4">
                <h1 className="text-3xl md:text-4xl font-semibold text-gray-900 mb-6">
                  Sales Analytics AI
                </h1>
                <p className="text-base md:text-lg text-gray-600 mb-8">
                  Ask me about your sales data, get business insights, or request specific reports
                </p>

                {/* Example prompts */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 max-w-2xl">
                  <button
                    className="p-4 bg-gray-50 hover:bg-gray-100 rounded-lg text-left transition-colors"
                    onClick={() => setInputValue("Show me sales data from last month")}
                  >
                    <div className="font-medium text-gray-900">📊 Sales Data</div>
                    <div className="text-sm text-gray-600 mt-1">Show me sales data from last month</div>
                  </button>

                  <button
                    className="p-4 bg-gray-50 hover:bg-gray-100 rounded-lg text-left transition-colors"
                    onClick={() => setInputValue("What are my top-selling products?")}
                  >
                    <div className="font-medium text-gray-900">🏆 Top Products</div>
                    <div className="text-sm text-gray-600 mt-1">What are my top-selling products?</div>
                  </button>

                  <button
                    className="p-4 bg-gray-50 hover:bg-gray-100 rounded-lg text-left transition-colors"
                    onClick={() => setInputValue("How can I improve my sales performance?")}
                  >
                    <div className="font-medium text-gray-900">💡 Business Advice</div>
                    <div className="text-sm text-gray-600 mt-1">How can I improve my sales performance?</div>
                  </button>

                  <button
                    className="p-4 bg-gray-50 hover:bg-gray-100 rounded-lg text-left transition-colors"
                    onClick={() => setInputValue("Compare this quarter to last quarter")}
                  >
                    <div className="font-medium text-gray-900">📈 Comparisons</div>
                    <div className="text-sm text-gray-600 mt-1">Compare this quarter to last quarter</div>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Messages */
            <div className="max-w-4xl mx-auto w-full">
              {messages.map((message) => (
                <div key={message.id} className={`py-6 px-4 ${message.role === 'assistant' ? 'bg-gray-50' : ''}`}>
                  <div className="flex space-x-4 max-w-full">
                    {/* Avatar */}
                    <div className="flex-shrink-0">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        message.role === 'user'
                          ? 'bg-green-600 text-white'
                          : 'bg-purple-600 text-white'
                      }`}>
                        {message.role === 'user' ? 'U' : 'AI'}
                      </div>
                    </div>

                    {/* Message Content */}
                    <div className="flex-1 min-w-0">
                      <div className="prose prose-gray max-w-none">
                        {message.role === 'assistant' ? (
                          <MarkdownMessage content={message.content} className="text-gray-900 leading-relaxed" />
                        ) : (
                          <div className="whitespace-pre-wrap text-gray-900 leading-relaxed">
                            {message.content}
                          </div>
                        )}
                      </div>

                      {/* Timestamp */}
                      <div className="text-xs text-gray-500 mt-2">
                        {message.timestamp.toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Loading indicator */}
              {isLoading && (
                <div className="py-6 px-4 bg-gray-50">
                  <div className="flex space-x-4 max-w-full">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center">
                        AI
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 text-gray-600">
                        <div className="animate-pulse">●</div>
                        <div className="animate-pulse animation-delay-200">●</div>
                        <div className="animate-pulse animation-delay-400">●</div>
                        <span className="ml-2">Thinking...</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="border-t border-gray-200 bg-white">
          <div className="max-w-4xl mx-auto px-4 py-3 md:py-4">
            <form onSubmit={handleSubmit} className="relative">
              <div className="relative">
                <textarea
                  ref={textareaRef}
                  value={inputValue}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  placeholder="Message Sales Analytics AI..."
                  className="w-full resize-none rounded-lg border border-gray-300 pl-4 pr-12 py-3 text-base focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 disabled:bg-gray-100"
                  style={{ minHeight: '52px' }}
                  disabled={isLoading}
                  rows={1}
                />

                {/* Send Button */}
                <button
                  type="submit"
                  disabled={!inputValue.trim() || isLoading}
                  className={`absolute right-2 bottom-2 p-2 rounded-md transition-colors ${
                    inputValue.trim() && !isLoading
                      ? 'bg-purple-600 text-white hover:bg-purple-700'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              </div>

              {/* Footer text */}
              <div className="text-xs text-gray-500 text-center mt-3">
                AI can make mistakes. Consider checking important information.
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}