import { logger } from '../utils/logger'
import { OpenAIClient } from './intentClassifier'
import { validateClarificationResult } from '../validation/schemas'
import {
  MESSAGE_PREVIEW_LENGTH,
  MESSAGE_SLICE_LENGTH,
  MIN_MESSAGE_LENGTH,
  SHORT_HELP_MESSAGE_LENGTH,
  LONG_CONVERSATION_THRESHOLD,
  SHORT_CONVERSATION_THRESHOLD,
  MAX_QUESTIONS_COUNT,
  OPENAI_MAX_TOKENS,
  OPENAI_TEMPERATURE,
  FALLBACK_COST,
  FALLBACK_TOKENS,
  DEFAULT_FALLBACK_QUESTION,
  UNKNOWN_ERROR_MESSAGE
} from '../constants/ai'
import type {
  ClarificationRequest,
  ClarificationResult,
  ChatMessage
} from '../../types/chat'

// Interface for clarification analysis result
interface ClarificationAnalysis {
  primaryAmbiguity: string
  specificNeeds: string[]
  contextualFactors: string[]
  urgencyLevel: 'high' | 'medium' | 'low'
}

// Interface for clarifying questions result
interface ClarifyingQuestionsResult {
  success: boolean
  questions?: string[]
  suggestedFilters?: Record<string, string[] | Record<string, string>>
  error?: string
  metadata?: {
    model: string
    tokens: number
    cost: number
    processingTime: number
  }
}

// Interface for fallback questions result
interface FallbackQuestionsResult {
  questions: string[]
  suggestedFilters?: Record<string, string[] | Record<string, string>>
}

// Interface for parsed clarification response
interface ParsedClarificationResponse {
  questions?: unknown
  suggestedFilters?: unknown
}

/**
 * Clarification handler that generates smart follow-up questions
 * when user intent is ambiguous, with comprehensive reasoning logs
 */
class ClarificationHandler {
  private readonly openaiClient: OpenAIClient
  private readonly model = 'gpt-4o-mini' // Cost-effective model for clarification questions

  constructor() {
    this.openaiClient = new OpenAIClient()
  }

  /**
   * Process clarification request with detailed reasoning logs
   */
  async processClarificationRequest(request: ClarificationRequest): Promise<ClarificationResult> {
    const timer = logger.startTimer('Clarification Processing')

    try {
      logger.intent('Starting clarification processing', request.userMessage.slice(0, MESSAGE_PREVIEW_LENGTH), {
        intent: request.intent,
        ambiguousAspects: request.ambiguousAspects.join(', '),
        historyLength: request.conversationHistory.length
      })

      // Step 1: Analyze what specific aspects need clarification
      const clarificationAnalysis = await this.analyzeClarificationNeeds(request)

      // Step 2: Generate smart follow-up questions
      const questionsResult = await this.generateClarifyingQuestions(
        request,
        clarificationAnalysis
      )

      const duration = timer()

      if (!questionsResult.success) {
        return {
          success: false,
          questions: [DEFAULT_FALLBACK_QUESTION],
          error: questionsResult.error || 'Failed to generate clarifying questions',
          metadata: {
            model: this.model,
            tokens: 0,
            cost: 0,
            processingTime: duration
          }
        }
      }

      const result: ClarificationResult = {
        success: true,
        questions: questionsResult.questions!,
        ...(questionsResult.suggestedFilters && { suggestedFilters: questionsResult.suggestedFilters }),
        metadata: questionsResult.metadata!
      }

      // Validate result structure
      const validation = validateClarificationResult(result)
      if (!validation.success) {
        logger.error('Clarification result validation failed', JSON.stringify(validation.error), {
          processingTime: duration
        })

        return {
          success: false,
          questions: ['I need more information to help you effectively. What specific information are you looking for?'],
          error: validation.error || 'Validation failed',
          metadata: {
            model: this.model,
            tokens: 0,
            cost: 0,
            processingTime: duration
          }
        }
      }

      logger.success('Clarification processing completed', undefined, {
        processingTime: duration,
        questionCount: result.questions.length,
        hasSuggestedFilters: !!result.suggestedFilters,
        model: this.model,
        tokens: result.metadata.tokens,
        cost: result.metadata.cost
      })

      return result
    } catch (err) {
      const duration = timer()
      const error = err instanceof Error ? err : new Error(UNKNOWN_ERROR_MESSAGE)

      logger.error('Clarification processing failed', error, {
        processingTime: duration,
        userMessage: request.userMessage.slice(0, MESSAGE_SLICE_LENGTH)
      })

      return {
        success: false,
        questions: ['I apologize, but I need more information to assist you properly. What can I help you with today?'],
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
   * Analyze what specific aspects of the request need clarification
   */
  private async analyzeClarificationNeeds(request: ClarificationRequest): Promise<ClarificationAnalysis> {
    const timer = logger.startTimer('Clarification Analysis')

    try {
      logger.intent('Analyzing clarification needs', undefined, {
        ambiguousAspects: request.ambiguousAspects.join(', '),
        messageLength: request.userMessage.length
      })

      // Analyze the user message for common ambiguity patterns
      const analysis = this.performRuleBasedAnalysis(request)

      // Enhance with conversation context
      const contextualFactors = this.analyzeConversationContext(request.conversationHistory)

      const duration = timer()

      const result = {
        primaryAmbiguity: analysis.primaryAmbiguity,
        specificNeeds: analysis.specificNeeds,
        contextualFactors,
        urgencyLevel: analysis.urgencyLevel
      }

      logger.intent('Clarification analysis completed', undefined, {
        processingTime: duration,
        primaryAmbiguity: result.primaryAmbiguity,
        needsCount: result.specificNeeds.length,
        contextFactorsCount: result.contextualFactors.length,
        urgencyLevel: result.urgencyLevel
      })

      return result
    } catch (err) {
      const duration = timer()
      const error = err instanceof Error ? err : new Error(UNKNOWN_ERROR_MESSAGE)

      logger.error('Clarification analysis failed', error, {
        processingTime: duration
      })

      // Fallback analysis
      return {
        primaryAmbiguity: 'general_ambiguity',
        specificNeeds: ['intent_unclear', 'scope_undefined'],
        contextualFactors: [],
        urgencyLevel: 'medium'
      }
    }
  }

  /**
   * Perform rule-based analysis of ambiguous aspects
   */
  private performRuleBasedAnalysis(request: ClarificationRequest): {
    primaryAmbiguity: string
    specificNeeds: string[]
    urgencyLevel: 'high' | 'medium' | 'low'
  } {
    const message = request.userMessage.toLowerCase()
    const ambiguousAspects = request.ambiguousAspects

    // Identify primary ambiguity type
    let primaryAmbiguity = 'general_ambiguity'
    const specificNeeds: string[] = []

    // Check for specific ambiguity patterns
    if (message.length < MIN_MESSAGE_LENGTH) {
      primaryAmbiguity = 'too_vague'
      specificNeeds.push('more_detail_needed')
    } else if (message.includes('help') && message.length < SHORT_HELP_MESSAGE_LENGTH) {
      primaryAmbiguity = 'help_request'
      specificNeeds.push('specific_task_needed')
    } else if (message.includes('show') || message.includes('get') || message.includes('find')) {
      primaryAmbiguity = 'data_scope_unclear'
      specificNeeds.push('time_period', 'data_type', 'filters')
    } else if (message.includes('how') || message.includes('what')) {
      primaryAmbiguity = 'question_scope_broad'
      specificNeeds.push('specific_focus', 'context')
    }

    // Add needs based on ambiguous aspects
    for (const aspect of ambiguousAspects) {
      if (aspect.includes('time') || aspect.includes('date')) {
        specificNeeds.push('time_period')
      }
      if (aspect.includes('location') || aspect.includes('store')) {
        specificNeeds.push('location_filter')
      }
      if (aspect.includes('product') || aspect.includes('item')) {
        specificNeeds.push('product_filter')
      }
      if (aspect.includes('amount') || aspect.includes('value')) {
        specificNeeds.push('amount_range')
      }
    }

    // Determine urgency level
    let urgencyLevel: 'high' | 'medium' | 'low' = 'medium'

    if (message.includes('urgent') || message.includes('now') || message.includes('asap')) {
      urgencyLevel = 'high'
    } else if (message.includes('when you can') || message.includes('sometime')) {
      urgencyLevel = 'low'
    }

    // Remove duplicates
    const uniqueNeeds = Array.from(new Set(specificNeeds))

    return {
      primaryAmbiguity,
      specificNeeds: uniqueNeeds,
      urgencyLevel
    }
  }

  /**
   * Analyze conversation context for better clarification
   */
  private analyzeConversationContext(messages: ChatMessage[]): string[] {
    const contextualFactors: string[] = []

    if (messages.length === 0) {
      contextualFactors.push('new_conversation')
      return contextualFactors
    }

    // Look for patterns in all conversation messages
    const recentMessages = messages

    // Check for repeated topics
    const topics = new Set<string>()
    for (const message of recentMessages) {
      const content = message.content.toLowerCase()
      if (content.includes('sales')) topics.add('sales_focus')
      if (content.includes('customer')) topics.add('customer_focus')
      if (content.includes('product')) topics.add('product_focus')
      if (content.includes('location')) topics.add('location_focus')
      if (content.includes('time') || content.includes('date')) topics.add('time_sensitive')
    }

    contextualFactors.push(...Array.from(topics))

    // Check for previous clarification attempts
    const hasPreviousClarification = recentMessages.some(msg =>
      msg.role === 'assistant' && (
        msg.content.includes('clarify') ||
        msg.content.includes('more specific') ||
        msg.content.includes('which')
      )
    )

    if (hasPreviousClarification) {
      contextualFactors.push('previous_clarification_attempt')
    }

    // Check conversation length for user engagement level
    if (messages.length > LONG_CONVERSATION_THRESHOLD) {
      contextualFactors.push('long_conversation')
    } else if (messages.length < SHORT_CONVERSATION_THRESHOLD) {
      contextualFactors.push('early_conversation')
    }

    return contextualFactors
  }

  /**
   * Generate clarifying questions using AI
   */
  private async generateClarifyingQuestions(
    request: ClarificationRequest,
    analysis: ClarificationAnalysis
  ): Promise<ClarifyingQuestionsResult> {
    const timer = logger.startTimer('Clarifying Questions Generation')

    try {
      logger.ai('Generating clarifying questions', undefined, {
        primaryAmbiguity: analysis.primaryAmbiguity,
        needsCount: analysis.specificNeeds.length,
        urgencyLevel: analysis.urgencyLevel
      })

      const systemPrompt = this.buildClarificationSystemPrompt()
      const userPrompt = this.buildClarificationUserPrompt(request, analysis)

      const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ]

      const response = await this.openaiClient.makeRequest(
        messages,
        this.model,
        OPENAI_MAX_TOKENS,
        OPENAI_TEMPERATURE
      )

      const duration = timer()

      if (!response.success) {
        logger.error('Clarifying questions AI call failed', response.error ? new Error(response.error) : undefined, {
          processingTime: duration
        })

        // Fallback to rule-based questions
        const fallbackQuestions = this.generateFallbackQuestions(request, analysis)
        return {
          success: true,
          questions: fallbackQuestions.questions,
          ...(fallbackQuestions.suggestedFilters && { suggestedFilters: fallbackQuestions.suggestedFilters }),
          metadata: {
            model: 'fallback-rules',
            tokens: FALLBACK_TOKENS,
            cost: FALLBACK_COST,
            processingTime: duration
          }
        }
      }

      // Parse the response
      const parsedResponse = this.parseClarificationResponse(response.content!)

      logger.ai('Clarifying questions generated', undefined, {
        processingTime: duration,
        questionCount: parsedResponse.questions.length,
        hasSuggestedFilters: !!parsedResponse.suggestedFilters,
        model: this.model,
        tokens: response.metadata.tokens,
        cost: response.metadata.cost
      })

      return {
        success: true,
        questions: parsedResponse.questions,
        ...(parsedResponse.suggestedFilters && { suggestedFilters: parsedResponse.suggestedFilters }),
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

      logger.error('Clarifying questions generation failed', error, {
        processingTime: duration
      })

      return { success: false, error: error.message }
    }
  }

  /**
   * Build system prompt for clarification
   */
  private buildClarificationSystemPrompt(): string {
    return `You are a helpful assistant that generates clarifying questions for a sales analytics platform.

When users make ambiguous requests, help them by asking 2-3 specific, helpful questions that will allow you to provide exactly what they need.

Guidelines:
- Ask specific, actionable questions
- Focus on the most important missing information
- Be conversational and helpful
- Consider time periods, locations, products, and metrics
- Suggest common options when relevant

Available data includes:
- Sales transactions with dates, amounts, locations
- Product/item information
- Location performance data
- Time-based analytics

Respond with JSON in this format:
{
  "questions": ["Question 1?", "Question 2?", "Question 3?"],
  "suggestedFilters": {
    "timeOptions": ["last 7 days", "last month", "last quarter"],
    "commonRequests": ["top products", "sales summary", "location comparison"]
  }
}

Make questions natural and conversational.`
  }

  /**
   * Build user prompt for clarification
   */
  private buildClarificationUserPrompt(request: ClarificationRequest, analysis: ClarificationAnalysis): string {
    let prompt = `User said: "${request.userMessage}"`

    prompt += `\n\nAmbiguous aspects: ${request.ambiguousAspects.join(', ')}`

    if (analysis.primaryAmbiguity) {
      prompt += `\n\nPrimary issue: ${analysis.primaryAmbiguity}`
    }

    if (analysis.specificNeeds.length > 0) {
      prompt += `\n\nNeeds clarification on: ${analysis.specificNeeds.join(', ')}`
    }

    if (request.conversationHistory.length > 0) {
      const recentContext = request.conversationHistory
        .map(msg => `${msg.role}: ${msg.content.slice(0, MESSAGE_SLICE_LENGTH)}`)
        .join('\n')
      prompt += `\n\nRecent conversation:\n${recentContext}`
    }

    prompt += `\n\nGenerate 2-3 clarifying questions to help the user get the information they need.`

    return prompt
  }

  /**
   * Parse clarification response from AI
   */
  private parseClarificationResponse(content: string): {
    questions: string[]
    suggestedFilters?: Record<string, string[] | Record<string, string>>
  } {
    try {
      const cleanContent = content.replace(/```json\n?|\n?```/g, '').trim()
      const parsed = JSON.parse(cleanContent) as ParsedClarificationResponse

      return {
        questions: Array.isArray(parsed.questions) ? parsed.questions as string[] : [
          DEFAULT_FALLBACK_QUESTION
        ],
        suggestedFilters: parsed.suggestedFilters as Record<string, string[] | Record<string, string>> | undefined
      }
    } catch {
      logger.warn('Failed to parse clarification response, using fallback')

      // Extract questions from unstructured text
      const lines = content.split('\n').filter(line => line.trim().length > 0)
      const questions = lines
        .filter(line => line.includes('?'))
        .map(line => line.replace(/^\d+\.\s*|-\s*|\*\s*/, '').trim())
        .slice(0, MAX_QUESTIONS_COUNT)

      if (questions.length === 0) {
        questions.push(DEFAULT_FALLBACK_QUESTION)
      }

      return { questions }
    }
  }

  /**
   * Generate fallback questions when AI fails
   */
  private generateFallbackQuestions(
    request: ClarificationRequest,
    analysis: ClarificationAnalysis
  ): FallbackQuestionsResult {
    const questions: string[] = []
    const message = request.userMessage.toLowerCase()

    // Generate questions based on analysis
    if (analysis.specificNeeds.includes('time_period')) {
      questions.push('What time period are you interested in? (e.g., last week, last month, specific dates)')
    }

    if (analysis.specificNeeds.includes('data_type')) {
      questions.push('What specific information would you like to see? (e.g., sales totals, top products, location performance)')
    }

    if (analysis.specificNeeds.includes('filters')) {
      questions.push('Would you like to filter by specific locations, products, or amount ranges?')
    }

    // Add general questions based on message content
    if (message.includes('help') && questions.length === 0) {
      questions.push('What would you like help with specifically?')
      questions.push('Are you looking for sales data, business advice, or something else?')
    }

    if (message.includes('show') && questions.length === 0) {
      questions.push('What specific data would you like me to show you?')
      questions.push('For what time period?')
    }

    // Ensure we have at least one question
    if (questions.length === 0) {
      questions.push(DEFAULT_FALLBACK_QUESTION)
      questions.push('Are you interested in sales data, business insights, or general information?')
    }

    // Limit to 3 questions
    const finalQuestions = questions.slice(0, MAX_QUESTIONS_COUNT)

    const suggestedFilters = {
      timeOptions: ['last 7 days', 'last 30 days', 'last quarter', 'specific date range'],
      dataTypes: ['sales summary', 'top products', 'location performance', 'transaction details'],
      commonActions: ['show data', 'provide analysis', 'give recommendations']
    }

    return {
      questions: finalQuestions,
      suggestedFilters
    }
  }
}

// Export singleton instance
export const clarificationHandler = new ClarificationHandler()

// Export class for testing
export { ClarificationHandler }