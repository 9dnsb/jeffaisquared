import { logger } from '../utils/logger'
import {
  validateIntentClassification,
  validateOpenAIRequest,
  validateOpenAIResponse,
} from '../validation/schemas'
import type {
  ChatIntent,
  IntentClassificationResult,
  ChatMessage,
} from '../../types/chat'

// Constants to avoid magic numbers
const DEFAULT_MAX_TOKENS = 500
const DEFAULT_TEMPERATURE = 0.1
const CLASSIFICATION_MAX_TOKENS = 300
const CLASSIFICATION_TEMPERATURE = 0.1
const TOKEN_COST_DIVISOR = 1000000
const INPUT_TOKEN_RATIO = 0.7
const OUTPUT_TOKEN_RATIO = 0.3
const DEFAULT_CONFIDENCE = 0.5
const KEYWORD_CONFIDENCE = 0.6
const HIGH_CONFIDENCE = 0.7
const VERY_HIGH_CONFIDENCE = 0.8
const SHORT_MESSAGE_THRESHOLD = 10
const MESSAGE_PREVIEW_LENGTH = 100
const CONTEXT_CONTENT_LENGTH = 200

/**
 * OpenAI API configuration and utilities
 */
class OpenAIClient {
  private readonly apiKey: string
  private readonly baseUrl = 'https://api.openai.com/v1/chat/completions'

  constructor() {
    this.apiKey = process.env['OPENAI_API_KEY'] || ''
    if (!this.apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is required')
    }
  }

  /**
   * Make a request to OpenAI API with comprehensive logging
   */
  async makeRequest(
    messages: Array<{ role: string; content: string }>,
    model: string = 'gpt-4o-mini',
    maxTokens: number = DEFAULT_MAX_TOKENS,
    temperature: number = DEFAULT_TEMPERATURE
  ): Promise<{
    success: boolean
    content?: string
    usage?: {
      prompt_tokens?: number
      completion_tokens?: number
      total_tokens?: number
    }
    error?: string
    metadata: {
      model: string
      tokens: number
      cost: number
      processingTime: number
    }
  }> {
    const timer = logger.startTimer(`OpenAI API Request (${model})`)

    try {
      // Validate request structure
      const requestPayload = {
        model,
        messages,
        max_tokens: maxTokens,
        temperature,
      }

      // Validate request with complete structure
      const requestValidation = validateOpenAIRequest({
        model,
        messages,
        max_tokens: maxTokens,
        temperature,
      })
      if (!requestValidation.success) {
        const duration = timer()
        logger.error('OpenAI request validation failed', undefined, {
          processingTime: duration,
          validationError: requestValidation.error,
          model,
        })

        return {
          success: false,
          error: requestValidation.error || 'Invalid request format',
          metadata: { model, tokens: 0, cost: 0, processingTime: duration },
        }
      }

      logger.ai('Sending request to OpenAI', undefined, {
        model,
        messageCount: messages.length,
        maxTokens,
        temperature,
      })

      // Make API request
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestPayload),
      })

      const duration = timer()

      if (!response.ok) {
        const errorText = await response.text()
        logger.error('OpenAI API request failed', new Error(errorText), {
          processingTime: duration,
          status: response.status,
          statusText: response.statusText,
          model,
        })

        return {
          success: false,
          error: `OpenAI API error: ${response.status} ${response.statusText}`,
          metadata: { model, tokens: 0, cost: 0, processingTime: duration },
        }
      }

      const responseData = (await response.json()) as {
        choices?: Array<{
          message?: { content?: string }
          finish_reason?: string
        }>
        usage?: {
          prompt_tokens?: number
          completion_tokens?: number
          total_tokens?: number
        }
      }

      // Validate response structure
      const responseValidation = validateOpenAIResponse(responseData)
      if (!responseValidation.success) {
        logger.error('OpenAI response validation failed', undefined, {
          processingTime: duration,
          validationError: responseValidation.error,
          model,
        })

        return {
          success: false,
          error: 'Invalid response format from OpenAI',
          metadata: { model, tokens: 0, cost: 0, processingTime: duration },
        }
      }

      const content = responseData.choices?.[0]?.message?.content || ''
      const usage = responseData.usage

      // Calculate cost (approximate)
      const cost = this.calculateCost(model, usage?.total_tokens || 0)

      logger.aiInteraction(
        'received response',
        model,
        usage?.total_tokens,
        cost,
        undefined,
        {
          processingTime: duration,
          promptTokens: usage?.prompt_tokens,
          completionTokens: usage?.completion_tokens,
          finishReason: responseData.choices?.[0]?.finish_reason,
        }
      )

      return {
        success: true,
        content,
        usage,
        metadata: {
          model,
          tokens: usage?.total_tokens || 0,
          cost,
          processingTime: duration,
        },
      }
    } catch (err) {
      const duration = timer()
      const error = err instanceof Error ? err : new Error('Unknown error')

      logger.error('OpenAI API request exception', error, {
        processingTime: duration,
        model,
      })

      return {
        success: false,
        error: error.message,
        metadata: { model, tokens: 0, cost: 0, processingTime: duration },
      }
    }
  }

  /**
   * Calculate approximate cost for OpenAI API usage
   */
  private calculateCost(model: string, tokens: number): number {
    // Pricing as of 2025 (Standard tier, in USD per 1M tokens)
    const pricing: Record<string, { input: number; output: number }> = {
      'gpt-5': { input: 1.25, output: 10.0 },
      'gpt-5-mini': { input: 0.25, output: 2.0 },
      'gpt-4o-mini': { input: 0.15, output: 0.6 },
      'gpt-4.1': { input: 2.0, output: 8.0 },
      'gpt-4.1-mini': { input: 0.4, output: 1.6 },
      'gpt-4.1-nano': { input: 0.1, output: 0.4 },
      'gpt-4o': { input: 2.5, output: 10.0 },
      'gpt-4o-2024-05-13': { input: 5.0, output: 15.0 },
      'gpt-4': { input: 30.0, output: 60.0 },
      'gpt-3.5-turbo': { input: 0.5, output: 1.5 },
    }

    const modelPricing = pricing[model] || pricing['gpt-4o-mini']
    // Approximate cost assuming 70% input, 30% output tokens
    const inputTokens = Math.floor(tokens * INPUT_TOKEN_RATIO)
    const outputTokens = Math.floor(tokens * OUTPUT_TOKEN_RATIO)

    return (
      (inputTokens * modelPricing.input + outputTokens * modelPricing.output) /
      TOKEN_COST_DIVISOR
    )
  }
}

/**
 * Intent classifier that determines user intent from messages
 */
class IntentClassifier {
  private readonly openaiClient: OpenAIClient
  private readonly model = 'gpt-4o-mini' // Fast, cost-effective model for classification

  constructor() {
    this.openaiClient = new OpenAIClient()
  }

  /**
   * Classify user intent with conversation context
   */
  async classifyIntent(
    userMessage: string,
    conversationHistory: ChatMessage[] = [],
    userId?: string
  ): Promise<IntentClassificationResult> {
    const timer = logger.startTimer('Intent Classification')

    try {
      logger.intent('Starting intent classification', userMessage, {
        userId,
        historyLength: conversationHistory.length,
      })

      // Build context from conversation history
      const context = this.buildConversationContext(conversationHistory)

      // Create classification prompt
      const systemPrompt = this.buildClassificationPrompt()
      const userPrompt = this.buildUserPrompt(userMessage, context)

      const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ]

      // Make OpenAI request
      const response = await this.openaiClient.makeRequest(
        messages,
        this.model,
        CLASSIFICATION_MAX_TOKENS, // Max tokens for classification
        CLASSIFICATION_TEMPERATURE // Low temperature for consistent classification
      )

      const duration = timer()

      if (!response.success) {
        logger.error(
          'Intent classification API call failed',
          response.error ? new Error(response.error) : undefined,
          {
            processingTime: duration,
            userId,
          }
        )

        // Fallback to rule-based classification
        return this.fallbackClassification(userMessage, duration)
      }

      // Parse classification result
      const classificationResult = this.parseClassificationResponse(
        response.content!
      )

      const result: IntentClassificationResult = {
        intent: classificationResult.intent,
        confidence: classificationResult.confidence,
        reasoning: classificationResult.reasoning,
        requiresData: classificationResult.intent === 'data_query',
        metadata: response.metadata,
      }

      // Validate the result
      const validation = validateIntentClassification({
        intent: result.intent,
        confidence: result.confidence,
        reasoning: result.reasoning,
        requiresData: result.requiresData,
        metadata: result.metadata,
      })
      if (!validation.success) {
        logger.error(
          'Intent classification result validation failed',
          undefined,
          {
            processingTime: duration,
            validationError: validation.error,
            rawResponse: response.content,
          }
        )

        return this.fallbackClassification(userMessage, duration)
      }

      logger.intentClassification(
        userMessage,
        result.intent,
        result.confidence,
        {
          processingTime: duration,
          reasoning: result.reasoning,
          userId,
          model: this.model,
          tokens: result.metadata.tokens,
          cost: result.metadata.cost,
        }
      )

      return result
    } catch (err) {
      const duration = timer()
      const error = err instanceof Error ? err : new Error('Unknown error')

      logger.error('Intent classification failed', error, {
        processingTime: duration,
        userId,
        userMessage: userMessage.slice(0, MESSAGE_PREVIEW_LENGTH),
      })

      return this.fallbackClassification(userMessage, duration)
    }
  }

  /**
   * Build system prompt for intent classification
   */
  private buildClassificationPrompt(): string {
    return `You are an AI assistant that classifies user messages into three categories:

1. "data_query": User wants to see/analyze specific sales data, metrics, reports, or business statistics
   Examples: "Show me sales for last month", "What are my top products?", "How much did we sell yesterday?"

2. "general_advice": User wants advice, recommendations, insights, explanations, or general information
   This includes BOTH business advice AND general educational questions about any topic
   Examples:
   - Business: "How can I improve sales?", "What should I focus on?", "Any suggestions for growth?"
   - General: "Why is coffee addictive?", "What makes a good latte?", "How does caffeine work?"

3. "clarification": User message is ambiguous and needs clarification before proceeding
   Examples: "Help me", "What can you do?", "I need information", "Show me data"

IMPORTANT: General questions about topics (like coffee, health, science) should be classified as "general_advice"
even if they're not directly business-related. The user may want educational information, not just business advice.

Respond with ONLY a JSON object in this exact format:
{
  "intent": "data_query" | "general_advice" | "clarification",
  "confidence": 0.0-1.0,
  "reasoning": "Brief explanation of why you chose this classification"
}

Be very precise. Data queries ask for specific business data. General advice includes both business advice AND educational questions. Clarification is for vague requests.`
  }

  /**
   * Build user prompt with message and context
   */
  private buildUserPrompt(userMessage: string, context: string): string {
    let prompt = `Classify this user message: "${userMessage}"`

    if (context) {
      prompt += `\n\nConversation context:\n${context}`
    }

    return prompt
  }

  /**
   * Build conversation context string
   */
  private buildConversationContext(messages: ChatMessage[]): string {
    if (messages.length === 0) return ''

    // Use all messages for context
    const recentMessages = messages

    return recentMessages
      .map(
        (msg) => `${msg.role}: ${msg.content.slice(0, CONTEXT_CONTENT_LENGTH)}`
      )
      .join('\n')
  }

  /**
   * Parse OpenAI classification response
   */
  private parseClassificationResponse(content: string): {
    intent: ChatIntent
    confidence: number
    reasoning: string
  } {
    try {
      // Clean up the response (remove markdown formatting if present)
      const cleanContent = content.replace(/```json\n?|\n?```/g, '').trim()
      const parsed = JSON.parse(cleanContent) as {
        intent?: string
        confidence?: number
        reasoning?: string
      }

      return {
        intent: (parsed.intent as ChatIntent) || 'clarification',
        confidence: Math.max(
          0,
          Math.min(1, parsed.confidence || DEFAULT_CONFIDENCE)
        ),
        reasoning: parsed.reasoning || 'AI classification result',
      }
    } catch {
      logger.warn(
        'Failed to parse classification response, using fallback',
        content
      )

      // Simple keyword-based fallback
      const lowerContent = content.toLowerCase()

      if (
        lowerContent.includes('show') ||
        lowerContent.includes('data') ||
        lowerContent.includes('sales')
      ) {
        return {
          intent: 'data_query',
          confidence: KEYWORD_CONFIDENCE,
          reasoning: 'Keyword-based classification fallback',
        }
      }

      if (
        lowerContent.includes('advice') ||
        lowerContent.includes('recommend') ||
        lowerContent.includes('suggest')
      ) {
        return {
          intent: 'general_advice',
          confidence: KEYWORD_CONFIDENCE,
          reasoning: 'Keyword-based classification fallback',
        }
      }

      return {
        intent: 'clarification',
        confidence: DEFAULT_CONFIDENCE,
        reasoning: 'Ambiguous message, requesting clarification',
      }
    }
  }

  /**
   * Fallback classification when AI fails
   */
  private fallbackClassification(
    userMessage: string,
    processingTime: number
  ): IntentClassificationResult {
    logger.warn(
      'Using fallback intent classification',
      userMessage.slice(0, MESSAGE_PREVIEW_LENGTH)
    )

    const lowerMessage = userMessage.toLowerCase()

    // Simple keyword-based classification
    const dataKeywords = [
      'show',
      'sales',
      'data',
      'report',
      'analytics',
      'metrics',
      'total',
      'revenue',
      'profit',
    ]
    const adviceKeywords = [
      'advice',
      'recommend',
      'suggest',
      'improve',
      'strategy',
      'tips',
      'help me grow',
    ]

    const hasDataKeywords = dataKeywords.some((keyword) =>
      lowerMessage.includes(keyword)
    )
    const hasAdviceKeywords = adviceKeywords.some((keyword) =>
      lowerMessage.includes(keyword)
    )

    let intent: ChatIntent = 'clarification'
    let confidence = DEFAULT_CONFIDENCE
    let reasoning = 'Fallback rule-based classification'

    if (hasDataKeywords && !hasAdviceKeywords) {
      intent = 'data_query'
      confidence = HIGH_CONFIDENCE
      reasoning = 'Contains data-related keywords'
    } else if (hasAdviceKeywords && !hasDataKeywords) {
      intent = 'general_advice'
      confidence = HIGH_CONFIDENCE
      reasoning = 'Contains advice-related keywords'
    } else if (userMessage.length < SHORT_MESSAGE_THRESHOLD) {
      intent = 'clarification'
      confidence = VERY_HIGH_CONFIDENCE
      reasoning = 'Message too short to determine intent'
    }

    return {
      intent,
      confidence,
      reasoning,
      requiresData: intent === 'data_query',
      metadata: {
        model: 'fallback-rules',
        tokens: 0,
        cost: 0,
        processingTime,
      },
    }
  }
}

// Export singleton instance
export const intentClassifier = new IntentClassifier()

// Export classes for testing
export { IntentClassifier, OpenAIClient }
