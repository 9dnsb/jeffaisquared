/**
 * OpenAI client for parameter extraction and response generation
 */

import OpenAI from 'openai'
import { logger } from '../utils/logger'
import type { OpenAIResponse } from './types'

export class OpenAIClient {
  private client: OpenAI

  constructor() {
    const apiKey = process.env['OPENAI_API_KEY']
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is required')
    }

    this.client = new OpenAI({ apiKey })
  }

  async makeRequest(
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
    model = 'gpt-4o',
    maxTokens = 1000,
    temperature = 0.1
  ): Promise<OpenAIResponse> {
    const timer = logger.startTimer('OpenAI Request')

    try {
      const response = await this.client.chat.completions.create({
        model,
        messages,
        max_tokens: maxTokens,
        temperature
      })

      const duration = timer()
      const content = response.choices[0]?.message?.content || ''
      const tokens = response.usage?.total_tokens || 0

      // Rough cost calculation (GPT-4o pricing)
      const cost = tokens * 0.00003 // $0.03 per 1k tokens

      logger.ai('OpenAI request completed', undefined, {
        model,
        tokens,
        cost: Number(cost.toFixed(6)),
        processingTime: duration
      })

      return {
        success: true,
        content,
        model,
        tokens,
        cost
      }

    } catch (err) {
      const duration = timer()
      const error = err instanceof Error ? err : new Error('OpenAI request failed')

      logger.error('OpenAI request failed', error, {
        model,
        processingTime: duration
      })

      return {
        success: false,
        content: '',
        model,
        tokens: 0,
        cost: 0,
        error: error.message
      }
    }
  }
}

export const openaiClient = new OpenAIClient()