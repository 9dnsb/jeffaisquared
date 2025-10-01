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
   * Helper to create OpenAI function call error response
   */
  private createOpenAIErrorResponse(
    inputMessages: Array<{ role: string; content: string }>,
    duration: number,
    tokens: number,
    error: string
  ) {
    return {
      success: false,
      toolCalls: [],
      openaiMessages: inputMessages,
      tokens,
      cost: tokens * 0.00003,
      processingTime: duration,
      error,
    }
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

      // Handle text-only response (model used conversation context)
      if (
        functionCallResult.textResponse &&
        functionCallResult.toolCalls.length === 0
      ) {
        const totalTime = overallTimer()

        logger.success('AI v3 text-only response completed', undefined, {
          processingTime: totalTime,
          requestId: this.requestCount,
          totalTokens: functionCallResult.tokens,
          totalCost: functionCallResult.cost,
        })

        return {
          success: true,
          data: [],
          summary: functionCallResult.textResponse,
          metadata: {
            processingTime: totalTime,
            queryComplexity: 'simple',
            cacheHit: false,
            queryPlan: 'text_only_response',
            recordCount: 0,
            optimizationStrategy: 'conversation_context',
            extractedParameters: {} as any,
          },
        }
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
   * Make initial OpenAI request with function definitions using Structured Outputs
   *
   * STRUCTURED OUTPUTS (strict mode):
   * - All functions have strict: true and additionalProperties: false
   * - OpenAI guarantees 100% schema compliance (vs best-effort matching)
   * - Eliminates JSON parsing errors and validation failures
   * - Provides programmatic refusal detection via choice.message.refusal
   * - Required fields are always present as specified in schema
   *
   * Rate limit handling with exponential backoff retry logic
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
    textResponse?: string
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

CRITICAL DECISION TREE - Follow this order:

1. FIRST: Check conversation history for relevant data
   - If the user asks about data that was JUST provided in recent messages, answer directly using that context
   - Examples where you should NOT call functions:
     * "compare them" → use data from previous messages
     * "which was better?" → use data from previous messages
     * "what's the difference?" → calculate using data already provided
     * "what about [metric] for that period?" → use timeframe from previous context

2. ONLY call functions when you need NEW data not in conversation history
   - User asks about a NEW time period not yet queried
   - User asks about DIFFERENT locations not in recent context
   - User requests a NEW type of analysis requiring fresh data

Function Selection Rules (when calling functions):
1. For "best/top/highest performing location" questions: use get_location_rankings with ranking_type="by_revenue"
   - Example: "highest sales today" → get_location_rankings(ranking_type="by_revenue", timeframe="today")
2. For "worst/bottom/lowest performing location" questions: use get_location_rankings with ranking_type="by_revenue" and order="lowest_to_highest"
3. For specific location performance: use get_location_metrics with specific location names
   - Example: "Bloor revenue" → get_location_metrics(locations=["Bloor"], metrics=["revenue"], timeframe="all_time")
   - Example: "Bloor transactions" → get_location_metrics(locations=["Bloor"], metrics=["count"], timeframe="all_time")
4. For comparing specific locations: use compare_locations with comparison_type="specific_pair"
   - Example: "Compare Bloor vs Kingston" → compare_locations(comparison_type="specific_pair", location_a="Bloor", location_b="Kingston", metric="revenue", timeframe="all_time")
5. For time-based totals: use get_time_based_metrics
6. For comparing time periods: use compare_periods
7. For product analysis: use get_top_products or get_product_location_analysis
8. For business overviews: use get_business_overview

CRITICAL TIMEFRAME DEFAULTS:
- If NO time period is mentioned → ALWAYS use timeframe="all_time"
- "today" → timeframe="today"
- "yesterday" → timeframe="yesterday"
- "last week" → timeframe="last_week"
- "last month" → timeframe="last_month"
- Questions like "How many transactions has Bloor had?" mean ALL TIME, use timeframe="all_time"

NEVER ask clarifying questions. Either use conversation context or call a function with reasonable defaults.

Available data:
- Sales transactions with revenue, quantities, dates
- 6 store locations: HQ, Yonge, Bloor, Kingston, The Well, Broadway
- Product/item data with categories and pricing`,
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

      // Convert Chat Completions tools format to Responses API format
      const responsesApiTools = ALL_SALES_FUNCTIONS.map((tool) => {
        if (tool.type === 'function') {
          return {
            type: 'function' as const,
            name: tool.function.name,
            description: tool.function.description,
            parameters: tool.function.parameters,
            strict: tool.function.strict,
          }
        }
        throw new Error(`Unsupported tool type: ${tool.type}`)
      })

      const response = await RateLimiter.withRetry(
        async () => {
          return await this.openai.responses.create({
            model: AI_V3_CONFIG.openai.model,
            input: inputMessages,
            tools: responsesApiTools,
            tool_choice: 'auto', // Let model decide which functions to call
            parallel_tool_calls: false, // Prevent multiple functions for single-metric queries
            temperature: AI_V3_CONFIG.openai.temperature,
            max_output_tokens: AI_V3_CONFIG.openai.maxTokens,
          })
        },
        3,
        1000,
        15000
      ) // 3 retries, 1s initial delay, 15s max delay for Tier 2

      const duration = timer()

      // Check response status (Responses API status checking)
      if (response.status === 'failed') {
        const errorMessage =
          response.error?.message || 'Response generation failed'
        logger.error('Response generation failed', new Error(errorMessage), {
          errorCode: response.error?.code,
          processingTime: duration,
        })
        return this.createOpenAIErrorResponse(
          inputMessages,
          duration,
          response.usage?.total_tokens || 0,
          errorMessage
        )
      }

      if (response.status === 'incomplete') {
        const incompleteReason =
          response.incomplete_details?.reason || 'unknown'
        logger.warn('Response incomplete', undefined, {
          incompleteReason: incompleteReason,
          processingTime: duration,
        })
        return this.createOpenAIErrorResponse(
          inputMessages,
          duration,
          response.usage?.total_tokens || 0,
          `Response incomplete: ${incompleteReason}`
        )
      }

      const output = response.output

      // Check for refusal in output items (Responses API refusal handling)
      const refusalItem = output.find(
        (item: any) =>
          item.type === 'message' &&
          item.content?.some((c: any) => c.type === 'refusal')
      )

      if (refusalItem) {
        const refusalContent = (refusalItem as any).content.find(
          (c: any) => c.type === 'refusal'
        )
        logger.warn('OpenAI refused to generate function calls', undefined, {
          refusalReason: refusalContent?.refusal,
          status: response.status,
        })
        return this.createOpenAIErrorResponse(
          inputMessages,
          duration,
          response.usage?.total_tokens || 0,
          `Request refused: ${refusalContent?.refusal}`
        )
      }

      // Extract function calls from output array (Responses API format)
      const toolCalls: Array<{
        id: string
        function: { name: string; arguments: string }
      }> = []

      for (const item of output) {
        if ((item as any).type === 'function_call') {
          const functionCallItem = item as any
          toolCalls.push({
            id: functionCallItem.call_id,
            function: {
              name: functionCallItem.name,
              arguments: functionCallItem.arguments,
            },
          })
        }
      }

      const tokens = response.usage?.total_tokens || 0
      const cost = tokens * 0.00003 // GPT-4o pricing

      // Handle text-only responses (when model uses conversation context instead of calling functions)
      if (toolCalls.length === 0) {
        // Check if there's a text message instead
        const textMessage = output.find((item: any) => item.type === 'message')
        const messageContent = textMessage
          ? (textMessage as any).content?.find(
              (c: any) => c.type === 'output_text'
            )?.text
          : null

        if (messageContent && messageContent.trim()) {
          // Valid text-only response - model used conversation context
          logger.ai(
            'Text-only response (using conversation context)',
            undefined,
            {
              messageLength: messageContent.length,
              tokens,
              cost: Number(cost.toFixed(6)),
              processingTime: duration,
            }
          )

          return {
            success: true,
            toolCalls: [],
            openaiMessages: inputMessages,
            tokens,
            cost,
            processingTime: duration,
            textResponse: messageContent,
          }
        }

        // No function calls AND no text = error
        logger.warn(
          'No function calls or text generated by OpenAI',
          undefined,
          {
            status: response.status,
          }
        )
        return {
          success: false,
          toolCalls: [],
          openaiMessages: inputMessages,
          tokens,
          cost,
          processingTime: duration,
          error: 'Model returned neither function calls nor text response',
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
        // Parse function arguments (guaranteed valid JSON due to strict mode)
        let functionArgs: any
        try {
          functionArgs = JSON.parse(toolCall.function.arguments)
        } catch (parseError) {
          // This should never happen with strict mode enabled, but handle gracefully
          logger.error(
            `Unexpected JSON parse error with strict mode`,
            parseError instanceof Error
              ? parseError
              : new Error('Parse failed'),
            {
              functionName: toolCall.function.name,
              arguments: toolCall.function.arguments.slice(0, 200),
            }
          )
          throw new Error(
            `Failed to parse function arguments: ${
              parseError instanceof Error ? parseError.message : 'Unknown error'
            }`
          )
        }

        // Validate that all required fields are present (strict mode guarantees this)
        // This is redundant with strict mode but provides extra safety
        if (!this.validateFunctionArgs(toolCall.function.name, functionArgs)) {
          throw new Error(
            `Function arguments validation failed for ${toolCall.function.name}`
          )
        }

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
   * Get final natural language response from OpenAI using Responses API
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
      // Build input with function call outputs using Responses API format
      const input: any[] = [...originalMessages]

      // CRITICAL: First, append the function call items from the first response
      // This tells the model which functions were called
      toolCalls.forEach((tc) => {
        input.push({
          type: 'function_call',
          call_id: tc.id,
          name: tc.function.name,
          arguments: tc.function.arguments,
        })
      })

      // Then, add the function call outputs (Responses API format)
      executionResults.forEach((result) => {
        input.push({
          type: 'function_call_output',
          call_id: result.toolCallId,
          output: result.success
            ? JSON.stringify(result.result)
            : `Error: ${result.error}`,
        })
      })

      const response = await RateLimiter.withRetry(
        async () => {
          return await this.openai.responses.create({
            model: AI_V3_CONFIG.openai.model,
            input: input,
            temperature: 0.1, // Lower temperature for consistent summaries
            max_output_tokens: 800,
          })
        },
        3,
        1000,
        15000
      ) // 3 retries, 1s initial delay, 15s max delay for Tier 2

      const duration = timer()

      // Extract text from output using Responses API format
      let content = 'No summary available'

      // Use SDK helper output_text if available, otherwise manually extract
      if ((response as any).output_text) {
        content = (response as any).output_text
      } else {
        // Manually extract from output array
        const messageItem = response.output.find(
          (item: any) => item.type === 'message'
        )
        if (messageItem) {
          const textContent = (messageItem as any).content?.find(
            (c: any) => c.type === 'output_text'
          )
          if (textContent) {
            content = textContent.text
          }
        }
      }

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

  /**
   * Validate function arguments against expected schema
   * This is redundant with strict mode but provides extra safety and logging
   */
  private validateFunctionArgs(functionName: string, args: any): boolean {
    // With strict mode enabled, OpenAI guarantees schema compliance
    // This validation is a defensive check that should never fail
    if (!args || typeof args !== 'object') {
      logger.warn('Function arguments are not an object', undefined, {
        functionName,
        argsType: typeof args,
      })
      return false
    }

    // Basic validation - strict mode guarantees required fields are present
    // Log if we detect any anomalies (should never happen with strict: true)
    const hasRequiredFields = Object.keys(args).length > 0

    if (!hasRequiredFields) {
      logger.warn(
        'Function arguments object is empty (unexpected with strict mode)',
        undefined,
        {
          functionName,
        }
      )
      return false
    }

    return true
  }
}

export const functionCaller = new FunctionCaller()
