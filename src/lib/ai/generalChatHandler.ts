import { logger } from '../utils/logger'
import { prismaSafeQueryBuilder } from '../prisma/safeQueryBuilder'
import { OpenAIClient } from './intentClassifier'
import { validateGeneralAdviceResult } from '../validation/schemas'
import type {
  GeneralAdviceRequest,
  GeneralAdviceResult,
  ChatMessage
} from '../../types/chat'

// Constants to avoid magic numbers
const MESSAGE_PREVIEW_LENGTH = 200
const SHORT_MESSAGE_PREVIEW = 100
const CONTEXT_DAYS_BACK = 30
const SALES_LIMIT = 10
const MAX_TOP_ITEMS = 3
const MAX_RECENT_MESSAGES = -6
const MAX_USER_CONCERNS = -2
const MIN_ACTION_ITEM_LENGTH = 10
const MAX_ACTION_ITEMS = 5
const ADVICE_MAX_TOKENS = 1200
const ADVICE_TEMPERATURE = 0.4

// String constants to avoid duplication
const DAYS_CONTEXT_TEXT = 'days'
const UNKNOWN_ERROR_MESSAGE = 'Unknown error'

// Type definitions for business context
interface SaleData {
  totalSales?: { toString(): string } | number | string  // Prisma Decimal has toString method
  [key: string]: string | number | boolean | null | undefined | object
}

interface SummaryData {
  _count?: number
  _sum?: {
    totalSales?: { toString(): string } | number | string  // Prisma Decimal has toString method
  }
  [key: string]: string | number | boolean | null | undefined | object
}

interface ItemData {
  item?: {
    name?: string
  }
  [key: string]: string | number | boolean | null | undefined | object
}

interface BusinessContextData {
  recentSales?: SaleData[]
  summary?: SummaryData
  topItems?: ItemData[]
}

interface ProvidedContext {
  recentSales?: SaleData[]
  performanceMetrics?: Record<string, string | number>
}

/**
 * General chat handler that provides business advice and insights
 * with comprehensive AI interaction logging
 */
class GeneralChatHandler {
  private readonly openaiClient: OpenAIClient
  private readonly model = 'gpt-4o' // More capable model for nuanced business advice

  constructor() {
    this.openaiClient = new OpenAIClient()
  }

  /**
   * Process general advice request with comprehensive logging
   */
  async processGeneralAdvice(request: GeneralAdviceRequest): Promise<GeneralAdviceResult> {
    const timer = logger.startTimer('General Advice Processing')

    try {
      logger.ai('Starting general advice processing', request.userMessage.slice(0, MESSAGE_PREVIEW_LENGTH), {
        intent: request.intent,
        hasBusinessContext: !!request.businessContext,
        historyLength: request.conversationHistory.length
      })

      // Step 1: Gather business context data
      const businessContext = await this.gatherBusinessContext(request.businessContext)

      // Step 2: Analyze conversation context for personalization
      const conversationContext = this.buildConversationContext(request.conversationHistory)

      // Step 3: Generate business advice
      const adviceResult = await this.generateBusinessAdvice(
        request.userMessage,
        businessContext,
        conversationContext
      )

      const duration = timer()

      if (!adviceResult.success) {
        return {
          success: false,
          advice: 'I apologize, but I encountered an issue generating advice. Please try rephrasing your question.',
          error: adviceResult.error,
          metadata: {
            model: this.model,
            tokens: 0,
            cost: 0,
            processingTime: duration
          }
        }
      }

      const result: GeneralAdviceResult = {
        success: true,
        advice: adviceResult.advice!,
        actionItems: adviceResult.actionItems,
        metadata: adviceResult.metadata!
      }

      // Validate result structure
      const validation = validateGeneralAdviceResult({
        success: result.success,
        advice: result.advice,
        hasActionItems: Boolean(result.actionItems?.length),
        tokens: result.metadata.tokens,
        cost: result.metadata.cost,
        processingTime: result.metadata.processingTime,
        metadata: result.metadata,
      })
      if (!validation.success) {
        logger.error('General advice result validation failed', undefined, {
          processingTime: duration,
          validationError: validation.error
        })

        return {
          success: false,
          advice: 'Generated advice but response validation failed. Please try again.',
          error: validation.error,
          metadata: {
            model: this.model,
            tokens: 0,
            cost: 0,
            processingTime: duration
          }
        }
      }

      logger.success('General advice processing completed', undefined, {
        processingTime: duration,
        adviceLength: result.advice.length,
        actionItemCount: result.actionItems?.length || 0,
        model: this.model,
        tokens: result.metadata.tokens,
        cost: result.metadata.cost
      })

      return result
    } catch (err) {
      const duration = timer()
      const error = err instanceof Error ? err : new Error(UNKNOWN_ERROR_MESSAGE)

      logger.error('General advice processing failed', error, {
        processingTime: duration,
        userMessage: request.userMessage.slice(0, SHORT_MESSAGE_PREVIEW)
      })

      return {
        success: false,
        advice: 'I apologize, but I encountered an unexpected error. Please try again.',
        error: error.message,
        metadata: {
          model: this.model,
          tokens: 0,
          cost: 0,
          processingTime: duration
        }
      }
    }
  }

  /**
   * Gather business context data for more informed advice
   */
  private async gatherBusinessContext(providedContext?: ProvidedContext): Promise<string> {
    const timer = logger.startTimer('Business Context Gathering')

    try {
      logger.data('Gathering business context for advice', undefined, {
        hasProvidedContext: !!providedContext
      })

      // If context is provided, use it
      if (providedContext?.recentSales || providedContext?.performanceMetrics) {
        const duration = timer()
        logger.data('Using provided business context', undefined, {
          processingTime: duration,
          hasRecentSales: !!providedContext.recentSales,
          hasMetrics: !!providedContext.performanceMetrics
        })

        return this.formatProvidedContext(providedContext)
      }

      // Otherwise, gather recent performance data
      const contextData = await this.fetchRecentPerformanceData()
      const duration = timer()

      const formattedContext = this.formatBusinessContext(contextData)

      logger.data('Business context gathered', undefined, {
        processingTime: duration,
        contextLength: formattedContext.length
      })

      return formattedContext
    } catch (err) {
      const duration = timer()
      const error = err instanceof Error ? err : new Error(UNKNOWN_ERROR_MESSAGE)

      logger.error('Failed to gather business context, using fallback', error, {
        processingTime: duration
      })

      return 'Business context data temporarily unavailable, providing general advice.'
    }
  }

  /**
   * Fetch recent performance data for context
   */
  private async fetchRecentPerformanceData(): Promise<BusinessContextData> {
    try {
      // Get data from last 30 days
      const endDate = new Date()
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - CONTEXT_DAYS_BACK)

      const filters = {
        dateRange: { start: startDate, end: endDate },
        limit: SALES_LIMIT
      }

      // Fetch multiple data points in parallel
      const [recentSalesResult, summaryResult, topItemsResult] = await Promise.all([
        prismaSafeQueryBuilder.getSalesData(filters),
        prismaSafeQueryBuilder.getSalesSummary({ dateRange: filters.dateRange }),
        prismaSafeQueryBuilder.getTopItems(filters)
      ])

      return {
        recentSales: (recentSalesResult.success && Array.isArray(recentSalesResult.data)) ? recentSalesResult.data as SaleData[] : undefined,
        summary: summaryResult.success ? summaryResult.data as SummaryData : undefined,
        topItems: (topItemsResult.success && Array.isArray(topItemsResult.data)) ? topItemsResult.data as ItemData[] : undefined
      }
    } catch (err) {
      logger.error('Failed to fetch performance data for context', err instanceof Error ? err : new Error(String(err)))
      return {}
    }
  }

  /**
   * Format provided business context
   */
  private formatProvidedContext(context: ProvidedContext): string {
    const parts = []

    if (context.recentSales && Array.isArray(context.recentSales)) {
      parts.push(`Recent sales: ${context.recentSales.length} transactions`)
    }

    if (context.performanceMetrics && typeof context.performanceMetrics === 'object') {
      const metrics = Object.entries(context.performanceMetrics)
        .map(([key, value]) => `${key}: ${value}`)
        .join(', ')
      parts.push(`Performance metrics: ${metrics}`)
    }

    return parts.length > 0 ? parts.join('\n') : 'Limited business context available'
  }

  /**
   * Format fetched business context for AI
   */
  private formatBusinessContext(data: BusinessContextData): string {
    const parts = []

    if (data.recentSales && Array.isArray(data.recentSales)) {
      const salesCount = data.recentSales.length
      parts.push(`Recent activity: ${salesCount} sales in the last ${CONTEXT_DAYS_BACK} ${DAYS_CONTEXT_TEXT}`)

      if (salesCount > 0) {
        // Calculate some basic metrics
        const totalAmount = data.recentSales.reduce((sum: number, sale: SaleData) => {
          return sum + (parseFloat(sale.totalSales?.toString() || '0'))
        }, 0)

        const averageAmount = totalAmount / salesCount

        parts.push(`Total revenue: $${totalAmount.toFixed(2)}`)
        parts.push(`Average transaction: $${averageAmount.toFixed(2)}`)
      }
    }

    if (data.summary) {
      // Add summary information
      const summary = data.summary
      if (summary._count) {
        parts.push(`Total transactions: ${summary._count}`)
      }
      if (summary._sum?.totalSales) {
        parts.push(`Total sales volume: $${summary._sum.totalSales.toString()}`)
      }
    }

    if (data.topItems && Array.isArray(data.topItems) && data.topItems.length > 0) {
      const topItemNames = data.topItems
        .slice(0, MAX_TOP_ITEMS)
        .map((item: ItemData) => item.item?.name || 'Unknown')
        .filter((name: string) => name !== 'Unknown')

      if (topItemNames.length > 0) {
        parts.push(`Top selling items: ${topItemNames.join(', ')}`)
      }
    }

    return parts.length > 0 ? parts.join('\n') : 'Limited recent business data available'
  }

  /**
   * Build conversation context for personalization
   */
  private buildConversationContext(messages: ChatMessage[]): string {
    if (messages.length === 0) return ''

    // Get recent messages for context
    const recentMessages = messages.slice(MAX_RECENT_MESSAGES)

    // Extract key themes and topics from conversation
    const conversationTopics = new Set<string>()
    const userConcerns = []

    for (const message of recentMessages) {
      const content = message.content.toLowerCase()

      // Identify business topics
      if (content.includes('sales') || content.includes('revenue')) {
        conversationTopics.add('sales performance')
      }
      if (content.includes('customer') || content.includes('client')) {
        conversationTopics.add('customer relations')
      }
      if (content.includes('growth') || content.includes('expand')) {
        conversationTopics.add('business growth')
      }
      if (content.includes('cost') || content.includes('expense')) {
        conversationTopics.add('cost management')
      }
      if (content.includes('marketing') || content.includes('promotion')) {
        conversationTopics.add('marketing')
      }

      // Extract user concerns (questions and pain points)
      if (message.role === 'user') {
        if (content.includes('how') || content.includes('why') || content.includes('what')) {
          userConcerns.push(message.content.slice(0, SHORT_MESSAGE_PREVIEW))
        }
      }
    }

    const context = []

    if (conversationTopics.size > 0) {
      context.push(`Discussion topics: ${Array.from(conversationTopics).join(', ')}`)
    }

    if (userConcerns.length > 0) {
      context.push(`Recent questions: ${userConcerns.slice(MAX_USER_CONCERNS).join('; ')}`)
    }

    return context.join('\n')
  }

  /**
   * Generate business advice using AI
   */
  private async generateBusinessAdvice(
    userMessage: string,
    businessContext: string,
    conversationContext: string
  ): Promise<{
    success: boolean
    advice?: string
    actionItems?: string[]
    error?: string
    metadata?: {
      model: string
      tokens: number
      cost: number
      processingTime: number
    }
  }> {
    const timer = logger.startTimer('Business Advice Generation')

    try {
      logger.ai('Generating business advice', undefined, {
        messageLength: userMessage.length,
        contextLength: businessContext.length,
        conversationContextLength: conversationContext.length
      })

      const systemPrompt = this.buildAdviceSystemPrompt()
      const userPrompt = this.buildAdviceUserPrompt(userMessage, businessContext, conversationContext)

      const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ]

      const response = await this.openaiClient.makeRequest(
        messages,
        this.model,
        ADVICE_MAX_TOKENS,
        ADVICE_TEMPERATURE
      )

      const duration = timer()

      if (!response.success) {
        logger.error('Business advice AI call failed', response.error ? new Error(response.error) : undefined, {
          processingTime: duration
        })

        // Use fallback advice when AI fails
        const fallbackAdvice = this.generateFallbackAdvice(userMessage)
        return {
          success: true,
          advice: fallbackAdvice,
          actionItems: [],
          metadata: {
            model: this.model,
            tokens: 0,
            cost: 0,
            processingTime: duration
          }
        }
      }

      // Parse the response to extract advice and action items
      const parsedResponse = this.parseAdviceResponse(response.content!)

      logger.ai('Business advice generated', undefined, {
        processingTime: duration,
        adviceLength: parsedResponse.advice.length,
        actionItemCount: parsedResponse.actionItems.length,
        model: this.model,
        tokens: response.metadata.tokens,
        cost: response.metadata.cost
      })

      return {
        success: true,
        advice: parsedResponse.advice,
        actionItems: parsedResponse.actionItems,
        metadata: {
          model: this.model,
          tokens: response.metadata.tokens,
          cost: response.metadata.cost,
          processingTime: duration
        }
      }
    } catch (err) {
      const duration = timer()
      const error = err instanceof Error ? err : new Error(UNKNOWN_ERROR_MESSAGE)

      logger.error('Business advice generation failed', error, {
        processingTime: duration
      })

      return { success: false, error: error.message }
    }
  }

  /**
   * Build system prompt for advice (both business and general)
   */
  private buildAdviceSystemPrompt(): string {
    return `You are a helpful AI assistant that provides both business advice and general information.

DETERMINE THE QUESTION TYPE:
- If the question is about business, sales, operations, or uses business context data: Provide business-focused advice
- If the question is general/educational (like "why is coffee addictive?"): Provide educational information without forcing business connections

FOR BUSINESS QUESTIONS:
- Be conversational and supportive
- Provide specific, actionable recommendations
- Use the business context data to make advice relevant
- Focus on realistic, implementable strategies
- Include 2-4 specific action items when appropriate

FOR GENERAL/EDUCATIONAL QUESTIONS:
- Provide clear, factual, educational information
- Be informative and helpful
- Don't force connections to business topics unless naturally relevant
- Focus on answering the actual question asked
- Keep it conversational but educational

Examples:
- "Why is coffee addictive?" → Explain caffeine, neuroscience, addiction mechanisms (educational)
- "How can I improve my coffee sales?" → Business strategies, customer retention, marketing (business)
- "What makes a good latte?" → Coffee preparation, milk steaming, flavor profiles (educational)

Always be helpful and provide the type of response the user is actually looking for.`
  }

  /**
   * Build user prompt for advice generation
   */
  private buildAdviceUserPrompt(
    userMessage: string,
    businessContext: string,
    conversationContext: string
  ): string {
    // Detect if this is a business question or general question
    const isBusinessQuestion = this.isBusinessRelatedQuestion(userMessage, conversationContext)

    let prompt = `User asks: "${userMessage}"`

    // Only include business context for business questions
    if (isBusinessQuestion && businessContext) {
      prompt += `\n\nCurrent business context:\n${businessContext}`
    }

    if (conversationContext) {
      prompt += `\n\nConversation context:\n${conversationContext}`
    }

    // Provide different instructions based on question type
    if (isBusinessQuestion) {
      prompt += `\n\nThis appears to be a business-related question. Provide helpful business advice that addresses their question. Include specific action items at the end if appropriate.`
    } else {
      prompt += `\n\nThis appears to be a general/educational question. Provide informative, educational content that directly answers their question. Don't force business connections unless naturally relevant.`
    }

    return prompt
  }

  /**
   * Determine if a question is business-related or general/educational
   */
  private isBusinessRelatedQuestion(userMessage: string, conversationContext: string): boolean {
    const message = userMessage.toLowerCase()
    const context = conversationContext.toLowerCase()

    // Business keywords
    const businessKeywords = [
      'sales', 'revenue', 'profit', 'business', 'customers', 'marketing',
      'growth', 'strategy', 'improve', 'increase', 'performance', 'analytics',
      'sell', 'selling', 'store', 'shop', 'pricing', 'competition'
    ]

    // General/educational keywords that indicate non-business questions
    const generalKeywords = [
      'why is', 'what is', 'how does', 'explain', 'definition', 'meaning',
      'addictive', 'works', 'causes', 'science', 'health', 'effects'
    ]

    const hasBusinessKeywords = businessKeywords.some(keyword =>
      message.includes(keyword) || context.includes(keyword)
    )

    const hasGeneralKeywords = generalKeywords.some(keyword =>
      message.includes(keyword)
    )

    // If it has general keywords and no business keywords, it's probably educational
    if (hasGeneralKeywords && !hasBusinessKeywords) {
      return false
    }

    // If it has business keywords, it's probably business-related
    if (hasBusinessKeywords) {
      return true
    }

    // Default to business for ambiguous cases since this is a business platform
    return true
  }

  /**
   * Parse AI advice response to extract advice and action items
   */
  private parseAdviceResponse(content: string): {
    advice: string
    actionItems: string[]
  } {
    try {
      // Look for action items section
      const actionItemsMatch = content.match(/action\s*items?:?\s*([\s\S]*?)$/i)
      let actionItems: string[] = []
      let advice = content

      if (actionItemsMatch) {
        const actionItemsText = actionItemsMatch[1]
        advice = content.replace(actionItemsMatch[0], '').trim()

        // Extract individual action items
        actionItems = actionItemsText
          .split(/\n|\d\.|[-•]/)
          .map(item => item.trim())
          .filter(item => item.length > MIN_ACTION_ITEM_LENGTH && !item.toLowerCase().includes('action'))
          .slice(0, MAX_ACTION_ITEMS) // Limit to 5 action items
      }

      // Clean up advice text
      advice = advice.replace(/^\s*advice:?\s*/i, '').trim()

      return {
        advice: advice || 'I understand your question and am here to help with your business needs.',
        actionItems
      }
    } catch (err) {
      logger.error('Failed to parse advice response structure', err instanceof Error ? err : new Error(String(err)))

      return {
        advice: content || 'I am here to help with your business questions.',
        actionItems: []
      }
    }
  }

  /**
   * Generate fallback advice when AI fails
   */
  private generateFallbackAdvice(userMessage: string): string {
    const lowerMessage = userMessage.toLowerCase()

    // Simple keyword-based fallback advice
    if (lowerMessage.includes('sales') || lowerMessage.includes('revenue')) {
      return 'To improve sales performance, consider analyzing your customer data, reviewing your pricing strategy, and focusing on your best-performing products. Regular data analysis can help identify trends and opportunities.'
    }

    if (lowerMessage.includes('customer') || lowerMessage.includes('client')) {
      return 'Customer satisfaction is key to business success. Consider gathering customer feedback, improving your service quality, and building stronger relationships with your existing customers.'
    }

    if (lowerMessage.includes('growth') || lowerMessage.includes('expand')) {
      return 'Business growth requires a solid foundation. Focus on understanding your current performance, identifying your most profitable areas, and gradually scaling what works best.'
    }

    if (lowerMessage.includes('marketing') || lowerMessage.includes('promotion')) {
      return 'Effective marketing starts with understanding your customers and what they value. Consider analyzing your sales data to identify your best customers and most popular products.'
    }

    return 'I understand you are looking for business guidance. While I encountered an issue providing specific advice, I recommend focusing on data-driven decision making and regularly reviewing your business performance metrics.'
  }
}

// Export singleton instance
export const generalChatHandler = new GeneralChatHandler()

// Export class for testing
export { GeneralChatHandler }
