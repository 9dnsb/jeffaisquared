/**
 * Comprehensive OpenAI API type definitions
 * Ensuring type safety for all OpenAI interactions
 */

// OpenAI Chat Completion Types
export interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
  name?: string
}

export interface OpenAIChoice {
  index: number
  message: OpenAIMessage
  finish_reason: 'stop' | 'length' | 'function_call' | 'content_filter' | null
}

export interface OpenAIUsage {
  prompt_tokens: number
  completion_tokens: number
  total_tokens: number
}

export interface OpenAIResponse {
  id: string
  object: 'chat.completion'
  created: number
  model: string
  choices: OpenAIChoice[]
  usage: OpenAIUsage
  system_fingerprint?: string
}

// OpenAI Request Types
export interface OpenAIChatRequest {
  model: string
  messages: OpenAIMessage[]
  max_tokens?: number
  temperature?: number
  top_p?: number
  n?: number
  stream?: boolean
  stop?: string | string[]
  presence_penalty?: number
  frequency_penalty?: number
}

// Our Internal OpenAI Client Types
export interface OpenAIClientResponse {
  success: boolean
  content?: string
  error?: string
  usage?: {
    tokens: number
    cost: number
  }
  model: string
}

export interface OpenAIRequestOptions {
  maxTokens?: number
  temperature?: number
  topP?: number
}

// Error Types
export interface OpenAIError {
  message: string
  type: string
  param?: string
  code?: string
}

export interface OpenAIErrorResponse {
  error: OpenAIError
}

// Type Guards
export function isOpenAIResponse(obj: unknown): obj is OpenAIResponse {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'choices' in obj &&
    Array.isArray((obj as OpenAIResponse).choices) &&
    'usage' in obj &&
    typeof (obj as OpenAIResponse).usage === 'object'
  )
}

export function isOpenAIErrorResponse(obj: unknown): obj is OpenAIErrorResponse {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'error' in obj &&
    typeof (obj as OpenAIErrorResponse).error === 'object'
  )
}