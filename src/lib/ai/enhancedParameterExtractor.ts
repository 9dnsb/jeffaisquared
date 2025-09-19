import { logger } from '../utils/logger'
import { OpenAIClient } from './intentClassifier'
import { DateParser } from '../utils/dateParser'
import { ParameterValidator } from '../utils/parameterValidator'
import type {
  AIExtractionResult,
  QueryParameters,
  ValidationResult
} from '../types/dynamicQuery'
import { LOCATION_KEYWORDS } from '../types/dynamicQuery'
import {
  OPENAI_DATA_QUERY_MAX_TOKENS,
  OPENAI_DATA_QUERY_TEMPERATURE,
  UNKNOWN_ERROR_MESSAGE
} from '../constants/ai'
import type { ChatMessage } from '../../types/chat'

/**
 * Enhanced AI parameter extractor that converts natural language queries
 * into structured query parameters using schema-aware prompts
 */
export class EnhancedParameterExtractor {
  private readonly openaiClient: OpenAIClient
  private readonly model = 'gpt-4o' // Use more capable model for complex parameter extraction

  constructor() {
    this.openaiClient = new OpenAIClient()
  }

  /**
   * Extract structured parameters from user message
   */
  async extractParameters(
    userMessage: string,
    conversationHistory: ChatMessage[] = []
  ): Promise<ValidationResult<QueryParameters>> {
    const timer = logger.startTimer('AI Parameter Extraction')

    try {
      logger.ai('Starting parameter extraction', userMessage.slice(0, 100), {
        historyLength: conversationHistory.length
      })

      // Step 1: AI extracts raw parameters
      const aiResult = await this.performAIExtraction(userMessage, conversationHistory)

      if (!aiResult.success || !aiResult.data) {
        const duration = timer()
        logger.error('AI parameter extraction failed', aiResult.error ? new Error(aiResult.error) : undefined, {
          processingTime: duration
        })

        return {
          success: false,
          error: aiResult.error || 'AI extraction failed',
          fallback: await this.createIntelligentFallback(userMessage)
        }
      }

      // Step 2: Validate and repair parameters
      const validation = await ParameterValidator.validate(aiResult.data, userMessage)

      const duration = timer()

      if (validation.success) {
        logger.success('Parameter extraction completed', undefined, {
          processingTime: duration,
          confidence: aiResult.data.confidence,
          repairAttempted: validation.repairAttempted
        })
      } else {
        logger.warn('Parameter extraction required fallback', undefined, {
          processingTime: duration,
          error: validation.error ? new Error(validation.error) : undefined,
          repairAttempted: validation.repairAttempted
        })
      }

      return validation

    } catch (err) {
      const duration = timer()
      const error = err instanceof Error ? err : new Error(UNKNOWN_ERROR_MESSAGE)

      logger.error('Parameter extraction exception', error, {
        processingTime: duration,
        userMessage: userMessage.slice(0, 100)
      })

      return {
        success: false,
        error: error.message,
        fallback: await this.createIntelligentFallback(userMessage)
      }
    }
  }

  /**
   * Perform AI extraction with comprehensive schema-aware prompts
   */
  private async performAIExtraction(
    userMessage: string,
    conversationHistory: ChatMessage[]
  ): Promise<ValidationResult<AIExtractionResult>> {
    const systemPrompt = this.buildSchemaAwarePrompt()
    const userPrompt = this.buildExtractionUserPrompt(userMessage, conversationHistory)

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ]

    const response = await this.openaiClient.makeRequest(
      messages,
      this.model,
      OPENAI_DATA_QUERY_MAX_TOKENS,
      OPENAI_DATA_QUERY_TEMPERATURE
    )

    if (!response.success) {
      return {
        success: false,
        error: response.error || 'AI request failed'
      }
    }

    try {
      const parsed = this.parseAIResponse(response.content!)
      return { success: true, data: parsed }
    } catch (err) {
      return {
        success: false,
        error: `Failed to parse AI response: ${err instanceof Error ? err.message : 'Unknown error'}`
      }
    }
  }

  /**
   * Build comprehensive schema-aware system prompt
   */
  private buildSchemaAwarePrompt(): string {
    return `You are a sales data query parameter extractor. Extract structured parameters from natural language queries about sales data.

AVAILABLE DATA SCHEMA:
- Sales: Individual transactions with date, locationId, totalSales
- SaleItems: Items within each sale with itemId, price, quantity
- Items: Product catalog with id, name
- Locations: 6 store locations with specific IDs

LOCATION INFORMATION:
${Object.entries(LOCATION_KEYWORDS)
  .map(([id, keywords]) => `- ${id}: ${keywords.join(', ')}`)
  .join('\n')}

AVAILABLE METRICS:
- revenue: Total sales amount (sum of totalSales or price*quantity)
- quantity: Total units sold (sum of quantities)
- count: Number of transactions
- avg_transaction: Average sale amount per transaction
- items_per_sale: Average number of items per transaction
- avg_item_price: Average price per individual item
- unique_items: Count of distinct products sold

GROUPING OPTIONS:
- location: Group by store location
- item: Group by product/item
- day/week/month/quarter/year: Group by time periods
- day_of_week: Group by day of week (Mon, Tue, etc.)

DATE PARSING EXAMPLES:
- "August 2024" → Full month range
- "last month" → Previous calendar month
- "August 25" → Single day (current year assumed)
- "compare August vs September" → Two date ranges

RESPONSE FORMAT:
Return a JSON object with this structure:
{
  "parameters": {
    "dateRanges": [{"period": "string", "start": "ISO date", "end": "ISO date"}],
    "locationIds": ["location_id", ...] // Use actual location IDs
    "items": ["item_name", ...],
    "metrics": ["revenue", "count", ...],
    "groupBy": ["location", "month", ...],
    "aggregation": "sum|avg|count|max|min",
    "orderBy": {"field": "string", "direction": "asc|desc"} // optional
    "limit": number // optional
  },
  "confidence": 0.0-1.0,
  "reasoning": "Brief explanation of parameter choices",
  "extractedDates": ["raw date strings from user"],
  "extractedLocations": ["raw location strings from user"],
  "extractedItems": ["raw item strings from user"]
}

CRITICAL RULES:
1. ALWAYS extract date ranges - if none specified, default to reasonable period (last 30 days)
2. Convert location names to actual location IDs using the mapping above
3. Choose appropriate metrics based on what user is asking for
4. Use groupBy when user wants breakdown/comparison across dimensions
5. Set confidence based on how clear the user's request is
6. Include reasoning to explain your parameter choices
7. Extract raw strings to help with validation/repair

EXAMPLES:

User: "What were our sales in August 2024?"
Response: {
  "parameters": {
    "dateRanges": [{"period": "august_2024", "start": "2024-08-01T00:00:00Z", "end": "2024-08-31T23:59:59Z"}],
    "locationIds": [],
    "items": [],
    "metrics": ["revenue", "count"],
    "groupBy": [],
    "aggregation": "sum"
  },
  "confidence": 0.95,
  "reasoning": "Clear request for August 2024 sales total",
  "extractedDates": ["August 2024"]
}

User: "Compare latte sales between Yonge and Bloor locations last month"
Response: {
  "parameters": {
    "dateRanges": [{"period": "last_month", "start": "calculated", "end": "calculated"}],
    "locationIds": ["LAH170A0KK47P", "LPSSMJYZX8X7P"],
    "items": ["Latte"],
    "metrics": ["revenue", "quantity"],
    "groupBy": ["location"],
    "aggregation": "sum"
  },
  "confidence": 0.9,
  "reasoning": "Comparison request for specific item across two locations",
  "extractedDates": ["last month"],
  "extractedLocations": ["Yonge", "Bloor"],
  "extractedItems": ["latte"]
}

User: "Show me monthly sales breakdown for this year"
Response: {
  "parameters": {
    "dateRanges": [{"period": "this_year", "start": "calculated", "end": "calculated"}],
    "locationIds": [],
    "items": [],
    "metrics": ["revenue", "count"],
    "groupBy": ["month"],
    "aggregation": "sum",
    "orderBy": {"field": "month", "direction": "asc"}
  },
  "confidence": 0.9,
  "reasoning": "Time series analysis request for current year by month",
  "extractedDates": ["this year"]
}

Focus on understanding user intent and choosing the most appropriate parameters to answer their question.`
  }

  /**
   * Build user prompt with context
   */
  private buildExtractionUserPrompt(userMessage: string, conversationHistory: ChatMessage[]): string {
    let prompt = `Extract query parameters from this sales data request: "${userMessage}"`

    // Add conversation context if available
    if (conversationHistory.length > 0) {
      const recentContext = conversationHistory
        .slice(-3) // Last 3 messages for context
        .map(msg => `${msg.role}: ${msg.content.slice(0, 200)}`)
        .join('\n')

      prompt += `\n\nRecent conversation context:\n${recentContext}`
    }

    prompt += `\n\nReturn the JSON response with extracted parameters, confidence score, and reasoning.`

    return prompt
  }

  /**
   * Parse AI response into structured result
   */
  private parseAIResponse(content: string): AIExtractionResult {
    try {
      // Clean up response (remove markdown formatting)
      const cleanContent = content.replace(/```json\n?|\n?```/g, '').trim()
      const parsed = JSON.parse(cleanContent)

      // Validate basic structure
      if (!parsed.parameters || !parsed.confidence) {
        throw new Error('Missing required fields: parameters or confidence')
      }

      // Convert date strings to Date objects in parameters
      if (parsed.parameters.dateRanges) {
        parsed.parameters.dateRanges = parsed.parameters.dateRanges.map((range: any) => ({
          ...range,
          start: new Date(range.start),
          end: new Date(range.end)
        }))
      }

      return parsed as AIExtractionResult

    } catch (err) {
      logger.error('Failed to parse AI response', err instanceof Error ? err : new Error(String(err)), {
        responseContent: content.slice(0, 500)
      })
      throw new Error('Invalid AI response format')
    }
  }

  /**
   * Create intelligent fallback parameters based on user message analysis
   */
  private async createIntelligentFallback(userMessage: string): Promise<QueryParameters> {
    logger.data('Creating intelligent fallback parameters', userMessage.slice(0, 100))

    // Try to extract dates using DateParser directly
    const dateRanges = DateParser.parseNaturalLanguage(userMessage)

    // Default to last 30 days if no dates found
    if (dateRanges.length === 0) {
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      dateRanges.push({
        period: 'last_30_days',
        start: thirtyDaysAgo,
        end: new Date()
      })
    }

    // Extract location keywords
    const messageLower = userMessage.toLowerCase()
    const locationIds: string[] = []

    for (const [locationId, keywords] of Object.entries(LOCATION_KEYWORDS)) {
      if (keywords.some(keyword => messageLower.includes(keyword))) {
        locationIds.push(locationId)
      }
    }

    // Determine likely metrics based on keywords
    const metrics: string[] = ['revenue'] // Always include revenue

    if (messageLower.includes('count') || messageLower.includes('number') || messageLower.includes('how many')) {
      metrics.push('count')
    }

    if (messageLower.includes('average') || messageLower.includes('avg')) {
      metrics.push('avg_transaction')
    }

    if (messageLower.includes('quantity') || messageLower.includes('units') || messageLower.includes('sold')) {
      metrics.push('quantity')
    }

    // Determine groupBy based on keywords
    const groupBy: string[] = []

    if (messageLower.includes('location') || messageLower.includes('store') || messageLower.includes('branch')) {
      groupBy.push('location')
    }

    if (messageLower.includes('month') || messageLower.includes('monthly')) {
      groupBy.push('month')
    }

    if (messageLower.includes('item') || messageLower.includes('product')) {
      groupBy.push('item')
    }

    return {
      dateRanges,
      locationIds: locationIds as any,
      items: [], // Would need more sophisticated extraction
      metrics: metrics as any,
      groupBy: groupBy as any,
      aggregation: 'sum'
    }
  }
}

// Export singleton instance
export const enhancedParameterExtractor = new EnhancedParameterExtractor()