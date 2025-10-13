/**
 * Alert Creation API Route
 * Creates milestone alerts via AI-powered natural language processing
 */

import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import prisma from '@/root-lib/prisma'
import { alertTools } from '../../../../lib/ai/alert-tools'
import type { AlertCondition } from '../../../../lib/alerts/types'

// ============================================================================
// Configuration
// ============================================================================

const CHAT_MODEL = 'gpt-4o'

// ============================================================================
// Types
// ============================================================================

interface CreateAlertRequest {
  userId: string
  request: string // Natural language alert request
}

interface CreateAlertArgs {
  name: string
  description: string
  conditionType: 'daily_sales_threshold' | 'item_sales_threshold' | 'location_sales_threshold'
  conditionData: AlertCondition
  frequency: 'once' | 'daily' | 'weekly'
}

// ============================================================================
// Initialize Clients
// ============================================================================

export const dynamic = 'force-dynamic'

const openai = new OpenAI({
  apiKey: process.env['OPENAI_API_KEY']!,
})

// ============================================================================
// Helper Functions
// ============================================================================

async function createAlert(
  userId: string,
  args: CreateAlertArgs
): Promise<void> {
  const { name, description, conditionType, conditionData, frequency } = args

  await prisma.alertRule.create({
    data: {
      userId,
      name,
      description,
      conditionType,
      conditionData: JSON.parse(JSON.stringify(conditionData)),
      frequency,
      isActive: true,
    },
  })
}

// ============================================================================
// API Route Handler
// ============================================================================

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const body = (await request.json()) as CreateAlertRequest

    if (!body.request || body.request.trim() === '') {
      return NextResponse.json(
        { error: 'Alert request is required' },
        { status: 400 }
      )
    }

    if (!body.userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    const currentDate = new Date().toLocaleDateString('en-US', {
      timeZone: 'America/New_York',
    })

    // Use OpenAI Responses API to parse alert request
    const response = await openai.responses.create({
      model: CHAT_MODEL,
      instructions: `You are a sales analytics assistant that creates milestone notifications.

**Current timezone:** America/New_York (EST)
**Current date:** ${currentDate}

**Alert Examples:**
- "Notify me when daily sales reach $5,000" → daily_sales_threshold
- "Alert me if Premium Coffee sells more than 100 units today" → item_sales_threshold
- "Tell me when Main Store hits $3k in sales" → location_sales_threshold

Parse the user's alert request and call the create_milestone_alert function.`,
      input: body.request,
      tools: alertTools as never,
      tool_choice: { type: 'function', name: 'create_milestone_alert' },
      temperature: 0,
    })

    // Find the function call in the output
    const functionCallItem = response.output.find(
      (item) => item.type === 'function_call'
    )

    if (!functionCallItem || functionCallItem.type !== 'function_call') {
      console.error('[createAlert] No function call found in response:', response.output)
      return NextResponse.json(
        { error: 'Failed to parse alert request' },
        { status: 400 }
      )
    }

    const args = JSON.parse(functionCallItem.arguments) as CreateAlertArgs

    // Debug: Log what the AI returned
    console.log('[createAlert] AI returned:', {
      name: args.name,
      conditionType: args.conditionType,
      conditionData: args.conditionData,
      frequency: args.frequency,
    })

    // Validate required fields
    if (!args.conditionType) {
      console.error('[createAlert] Missing conditionType in AI response')
      return NextResponse.json(
        { error: 'AI failed to determine alert condition type' },
        { status: 400 }
      )
    }

    // Ensure conditionData has the type field (needed for SQL generation)
    if (!args.conditionData.type) {
      args.conditionData.type = args.conditionType as 'daily_sales_threshold' | 'item_sales_threshold' | 'location_sales_threshold'
    }

    // Create alert in database
    await createAlert(body.userId, args)

    return NextResponse.json({
      success: true,
      alert: {
        name: args.name,
        description: args.description,
        conditionType: args.conditionType,
        frequency: args.frequency,
      },
    })
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : 'Unknown error occurred'

    console.error('[createAlert] Error:', errorMessage)

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}
