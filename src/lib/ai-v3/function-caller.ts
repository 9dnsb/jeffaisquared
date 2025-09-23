/**
 * AI v3 Function Caller - Modern OpenAI Function Calling Implementation
 * Replaces parameter extraction with direct function calling
 */

import OpenAI from 'openai'
import { logger } from '../utils/logger'
import { AI_V3_CONFIG, ERROR_MESSAGES } from './config'
import { ALL_SALES_FUNCTIONS, type FunctionName } from './functions'
import { RateLimiter } from './rate-limiter'
import { getTorontoTimeframeDates } from '../utils/timezone'
import type {
  QueryRequest,
  QueryResponse,
  OpenAIResponse,
  AIError,
  QueryMetadata,
} from './types'

export class FunctionCaller {
  private openai: OpenAI
  private requestCount = 0
  private lastUserMessage = ''

  constructor() {
    if (!AI_V3_CONFIG.openai.apiKey) {
      throw new Error('OpenAI API key is required for AI v3 function calling')
    }

    this.openai = new OpenAI({
      apiKey: AI_V3_CONFIG.openai.apiKey,
      timeout: AI_V3_CONFIG.openai.timeout,
    })
  }

  /**
   * Process user query using OpenAI function calling
   */
  async processQuery(request: QueryRequest): Promise<QueryResponse> {
    const overallTimer = logger.startTimer('AI v3 Function Calling')
    this.requestCount++

    try {
      // VERY OBVIOUS DEBUG - This should show up if code is running
      console.log('🚨🚨🚨 AI FUNCTION CALLER IS RUNNING - NEW CODE! 🚨🚨🚨')
      console.log('🚨 Request message:', request.userMessage)

      // Store user message for fallback timeframe detection
      this.lastUserMessage = request.userMessage

      logger.ai(
        '🚀 Starting AI v3 function calling',
        request.userMessage.slice(0, 100),
        {
          requestId: this.requestCount,
          userId: request.userId,
        }
      )

      // Step 1: Make initial function call request
      const functionCallResult = await this.callOpenAIWithFunctions(request)

      if (!functionCallResult.success) {
        return this.createErrorResponse(
          functionCallResult.error || 'Function call failed'
        )
      }

      // Step 2: Execute all function calls
      const executionResults = await this.executeFunctionCalls(
        functionCallResult.toolCalls,
        functionCallResult.processingTime
      )

      if (executionResults.length === 0) {
        return this.createErrorResponse('No function calls were executed')
      }

      // Step 3: Get final response from OpenAI
      const finalResponse = await this.getFinalResponse(
        request,
        functionCallResult.toolCalls,
        executionResults,
        functionCallResult.openaiMessages
      )

      const totalTime = overallTimer()

      // Step 4: Build comprehensive response
      const response: QueryResponse = {
        success: true,
        data: this.combineExecutionResults(executionResults),
        summary: finalResponse.summary,
        metadata: {
          processingTime: totalTime,
          queryComplexity: this.determineComplexity(
            functionCallResult.toolCalls.length
          ),
          cacheHit: false, // TODO: Implement caching
          queryPlan: this.describeQueryPlan(functionCallResult.toolCalls),
          recordCount: this.countTotalRecords(executionResults),
          optimizationStrategy: this.getOptimizationStrategy(
            functionCallResult.toolCalls
          ),
          extractedParameters: this.buildLegacyParameters(
            functionCallResult.toolCalls
          ), // For backwards compatibility
        },
      }

      logger.success('AI v3 function calling completed', undefined, {
        processingTime: totalTime,
        functionCallCount: functionCallResult.toolCalls.length,
        recordCount: response.metadata.recordCount,
        requestId: this.requestCount,
        totalTokens: functionCallResult.tokens + finalResponse.tokens,
        totalCost: functionCallResult.cost + finalResponse.cost,
      })

      return response
    } catch (err) {
      const duration = overallTimer()
      const error =
        err instanceof Error ? err : new Error('Function calling failed')

      logger.error('AI v3 function calling failed', error, {
        processingTime: duration,
        requestId: this.requestCount,
        userId: request.userId,
      })

      return this.createErrorResponse(error.message)
    }
  }

  /**
   * Make initial OpenAI request with function definitions with rate limit handling
   */
  private async callOpenAIWithFunctions(request: QueryRequest): Promise<{
    success: boolean
    toolCalls: Array<{
      id: string
      function: { name: string; arguments: string }
    }>
    openaiMessages: Array<any>
    tokens: number
    cost: number
    processingTime: number
    error?: string
  }> {
    const timer = logger.startTimer('OpenAI Function Call Request')

    try {
      // Calculate actual Toronto timezone dates for precise timeframe handling
      const todayDates = getTorontoTimeframeDates('today')
      const yesterdayDates = getTorontoTimeframeDates('yesterday')
      const lastWeekDates = getTorontoTimeframeDates('last_week')
      const lastMonthDates = getTorontoTimeframeDates('last_month')

      // Build conversation context using new API format
      const inputMessages = [
        {
          role: 'system' as const,
          content: `You are a business analytics assistant that helps analyze sales data.

CRITICAL: Call EXACTLY ONE function per user question. Do not call multiple functions unless the user explicitly asks for multiple different types of analysis.

Function Selection Rules:
1. For "best/top/highest performing location" questions: use get_location_rankings with ranking_type="by_revenue"
   - ALWAYS include timeframe parameter if time period is mentioned
   - Example: "highest sales today" → get_location_rankings(ranking_type="by_revenue", timeframe="today")
2. For "worst/bottom/lowest performing location" questions: use get_location_rankings with ranking_type="by_revenue" and order="lowest_to_highest"
   - ALWAYS include timeframe parameter if time period is mentioned
3. For specific location performance: use get_location_metrics with specific location names
   - ALWAYS include timeframe parameter if time period is mentioned
4. For comparing specific locations: use compare_locations with comparison_type="specific_pair"
   - Example: "Compare Bloor vs Kingston revenue" → compare_locations(comparison_type="specific_pair", location_a="Bloor", location_b="Kingston", metric="revenue", timeframe="all_time")
   - ALWAYS include timeframe parameter if time period is mentioned
5. For time-based totals (today's sales, yesterday's revenue): use get_time_based_metrics
6. For comparing time periods: use compare_periods
7. For product analysis: use get_top_products or get_product_location_analysis
8. For business overviews: use get_business_overview

CRITICAL TIMEFRAME HANDLING (Use exact timeframe values, Toronto timezone):
- "today" → timeframe="today" (${todayDates.startDate.toISOString()} to ${todayDates.endDate.toISOString()})
- "yesterday" → timeframe="yesterday" (${yesterdayDates.startDate.toISOString()} to ${yesterdayDates.endDate.toISOString()})
- "last week" → timeframe="last_week" (${lastWeekDates.startDate.toISOString()} to ${lastWeekDates.endDate.toISOString()})
- "last month" → timeframe="last_month" (${lastMonthDates.startDate.toISOString()} to ${lastMonthDates.endDate.toISOString()})
- If no time mentioned, use all-time data (no timeframe parameter)

NEVER call both time-based AND location functions for a single question about "best performing location revenue" - this is asking for location ranking, not time-based totals.

Available data:
- Sales transactions with revenue, quantities, dates
- 6 store locations: HQ, Yonge, Bloor, Kingston, The Well, Broadway
- Product/item data with categories and pricing
- Time-based data for trend analysis`,
        },
        ...request.conversationHistory.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
        {
          role: 'user' as const,
          content: request.userMessage,
        },
      ]

      const response = await RateLimiter.withRetry(
        async () => {
          return await this.openai.chat.completions.create({
            model: AI_V3_CONFIG.openai.model,
            messages: inputMessages,
            tools: ALL_SALES_FUNCTIONS,
            tool_choice: 'auto', // Let model decide which functions to call
            parallel_tool_calls: false, // Prevent multiple functions for single-metric queries
            temperature: AI_V3_CONFIG.openai.temperature,
            max_tokens: AI_V3_CONFIG.openai.maxTokens,
          })
        },
        3,
        1000,
        15000
      ) // 3 retries, 1s initial delay, 15s max delay for Tier 2

      const duration = timer()
      const choice = response.choices[0]
      const rawToolCalls = choice?.message?.tool_calls || []
      const tokens = response.usage?.total_tokens || 0
      const cost = tokens * 0.00003 // GPT-4o pricing

      // Convert OpenAI tool calls to our expected format
      const toolCalls = rawToolCalls
        .filter((tc) => tc.type === 'function')
        .map((tc) => {
          const functionCall = tc as any // OpenAI types may be outdated
          return {
            id: tc.id,
            function: {
              name: functionCall.function?.name || '',
              arguments: functionCall.function?.arguments || '{}',
            },
          }
        })

      if (toolCalls.length === 0) {
        logger.warn('No function calls generated by OpenAI', undefined, {
          messageContent: choice?.message?.content?.slice(0, 200),
          finishReason: choice?.finish_reason,
        })
        return {
          success: false,
          toolCalls: [],
          openaiMessages: inputMessages,
          tokens,
          cost,
          processingTime: duration,
          error: 'No function calls generated',
        }
      }

      logger.ai('OpenAI function calls received', undefined, {
        functionCount: toolCalls.length,
        functions: toolCalls.map((tc) => tc.function.name).join(', '),
        tokens,
        cost: Number(cost.toFixed(6)),
        processingTime: duration,
      })

      // DEBUG: Log the actual function calls and arguments
      toolCalls.forEach((tc, i) => {
        console.log(`🔍 DEBUG Function Call ${i + 1}:`)
        console.log(`   Function: ${tc.function.name}`)
        console.log(`   Arguments: ${tc.function.arguments}`)
      })

      return {
        success: true,
        toolCalls,
        openaiMessages: inputMessages,
        tokens,
        cost,
        processingTime: duration,
      }
    } catch (err) {
      const duration = timer()
      const error =
        err instanceof Error ? err : new Error('OpenAI request failed')

      logger.error('OpenAI function call request failed', error, {
        processingTime: duration,
      })

      return {
        success: false,
        toolCalls: [],
        openaiMessages: [],
        tokens: 0,
        cost: 0,
        processingTime: duration,
        error: error.message,
      }
    }
  }

  /**
   * Execute all function calls and return results
   */
  private async executeFunctionCalls(
    toolCalls: Array<{
      id: string
      function: { name: string; arguments: string }
    }>,
    openaiTime: number
  ): Promise<
    Array<{
      toolCallId: string
      functionName: string
      arguments: any
      result: any
      success: boolean
      processingTime: number
      error?: string
    }>
  > {
    const results = []

    // Import function execution engine
    const { FunctionExecutor } = await import('./function-executor')
    const executor = new FunctionExecutor()

    // Pass user message for timeframe detection fallback
    executor.setUserMessage(this.lastUserMessage || '')

    for (const toolCall of toolCalls) {
      const timer = logger.startTimer(`Execute ${toolCall.function.name}`)

      try {
        // Parse function arguments
        const functionArgs = JSON.parse(toolCall.function.arguments)

        // Execute the function
        const result = await executor.executeFunction(
          toolCall.function.name as FunctionName,
          functionArgs
        )

        const duration = timer()

        results.push({
          toolCallId: toolCall.id,
          functionName: toolCall.function.name,
          arguments: functionArgs,
          result,
          success: true,
          processingTime: duration,
        })

        // DEBUG: Log function execution results
        console.log(`🔍 DEBUG Function Result for ${toolCall.function.name}:`)
        if (Array.isArray(result) && result.length > 0) {
          console.log(`   Top result:`, result[0])
          console.log(`   Total results: ${result.length}`)
        } else {
          console.log(`   Result:`, result)
        }

        logger.queryExecution(
          'function_call',
          toolCall.function.name,
          undefined,
          {
            success: true,
            recordCount: Array.isArray(result) ? result.length : 1,
            processingTime: duration,
            functionArgs: JSON.stringify(functionArgs).slice(0, 100),
          }
        )
      } catch (err) {
        const duration = timer()
        const error =
          err instanceof Error ? err : new Error('Function execution failed')

        results.push({
          toolCallId: toolCall.id,
          functionName: toolCall.function.name,
          arguments: toolCall.function.arguments,
          result: null,
          success: false,
          processingTime: duration,
          error: error.message,
        })

        logger.error(
          `Function execution failed: ${toolCall.function.name}`,
          error,
          {
            processingTime: duration,
            functionArgs: toolCall.function.arguments.slice(0, 100),
          }
        )
      }
    }

    return results
  }

  /**
   * Get final natural language response from OpenAI using new API format
   */
  private async getFinalResponse(
    request: QueryRequest,
    toolCalls: Array<{
      id: string
      function: { name: string; arguments: string }
    }>,
    executionResults: Array<any>,
    originalMessages: Array<any>
  ): Promise<{
    summary: string
    tokens: number
    cost: number
    processingTime: number
  }> {
    const timer = logger.startTimer('OpenAI Final Response')

    try {
      // Build messages with tool call results using traditional API format
      const messages = [
        ...originalMessages,
        {
          role: 'assistant' as const,
          content: null,
          tool_calls: toolCalls.map((tc) => ({
            id: tc.id,
            type: 'function' as const,
            function: tc.function,
          })),
        },
        ...executionResults.map((result) => ({
          role: 'tool' as const,
          tool_call_id: result.toolCallId,
          content: result.success
            ? JSON.stringify(result.result)
            : `Error: ${result.error}`,
        })),
      ]

      const response = await RateLimiter.withRetry(
        async () => {
          return await this.openai.chat.completions.create({
            model: AI_V3_CONFIG.openai.model,
            messages,
            temperature: 0.1, // Lower temperature for consistent summaries
            max_tokens: 800,
          })
        },
        3,
        1000,
        15000
      ) // 3 retries, 1s initial delay, 15s max delay for Tier 2

      const duration = timer()
      const content =
        response.choices[0]?.message?.content || 'No summary available'
      const tokens = response.usage?.total_tokens || 0
      const cost = tokens * 0.00003

      logger.ai('Final response generated', undefined, {
        summaryLength: content.length,
        tokens,
        cost: Number(cost.toFixed(6)),
        processingTime: duration,
      })

      return {
        summary: content,
        tokens,
        cost,
        processingTime: duration,
      }
    } catch (err) {
      const duration = timer()
      const error =
        err instanceof Error
          ? err
          : new Error('Final response generation failed')

      logger.error('Final response generation failed', error, {
        processingTime: duration,
      })

      // Fallback summary
      const successfulResults = executionResults.filter((r) => r.success)
      const summary =
        successfulResults.length > 0
          ? `Analysis completed with ${successfulResults.length} successful operations.`
          : 'Analysis completed but no data was returned.'

      return {
        summary,
        tokens: 0,
        cost: 0,
        processingTime: duration,
      }
    }
  }

  // Helper methods
  private createErrorResponse(errorMessage: string): QueryResponse {
    return {
      success: false,
      data: [],
      summary: errorMessage,
      metadata: {
        processingTime: 0,
        queryComplexity: 'simple',
        cacheHit: false,
        queryPlan: 'error',
        recordCount: 0,
        optimizationStrategy: 'none',
        extractedParameters: {} as any,
      },
      error: errorMessage,
    }
  }

  private combineExecutionResults(results: Array<any>): Array<any> {
    const combinedData = []

    for (const result of results) {
      if (result.success && result.result) {
        if (Array.isArray(result.result)) {
          combinedData.push(...result.result)
        } else {
          combinedData.push(result.result)
        }
      }
    }

    return combinedData
  }

  private determineComplexity(
    functionCallCount: number
  ): 'simple' | 'moderate' | 'complex' {
    if (functionCallCount <= 1) return 'simple'
    if (functionCallCount <= 3) return 'moderate'
    return 'complex'
  }

  private describeQueryPlan(toolCalls: Array<any>): string {
    const functionNames = toolCalls.map((tc) => tc.function.name)
    return `Function calls: ${functionNames.join(', ')}`
  }

  private countTotalRecords(results: Array<any>): number {
    return results.reduce((total, result) => {
      if (result.success && Array.isArray(result.result)) {
        return total + result.result.length
      }
      return total + (result.success ? 1 : 0)
    }, 0)
  }

  private getOptimizationStrategy(toolCalls: Array<any>): string {
    const strategies = []

    if (toolCalls.length > 1) strategies.push('parallel_function_calls')
    if (toolCalls.some((tc) => tc.function.name.includes('advanced')))
      strategies.push('complex_analytics')
    if (toolCalls.some((tc) => tc.function.name.includes('time_based')))
      strategies.push('time_optimization')

    return strategies.length > 0 ? strategies.join(', ') : 'standard'
  }

  private buildLegacyParameters(toolCalls: Array<any>): any {
    // Build a legacy QueryParameters object for backwards compatibility
    // This allows existing code that expects the old parameter structure to still work
    const firstCall = toolCalls[0]
    if (!firstCall) return {}

    try {
      const args = JSON.parse(firstCall.function.arguments)
      return {
        timeframe: args.timeframe || 'all_time',
        locations: args.locations || args.location ? [args.location] : [],
        items: args.specific_item
          ? [{ name: args.specific_item, exactMatch: false }]
          : [],
        metrics: args.metrics || [args.metric].filter(Boolean),
        groupBy: [],
        analysisType: firstCall.function.name,
        requiresRawSQL: toolCalls.length > 2,
        expectedRecordCount: 1000,
      }
    } catch {
      return {}
    }
  }
}

export const functionCaller = new FunctionCaller()
