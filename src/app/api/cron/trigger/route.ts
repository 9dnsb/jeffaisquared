/**
 * Manual Cron Trigger for Development
 * Allows testing the alert checker without waiting for Vercel cron
 */

import { NextResponse } from 'next/server'

export async function POST() {
  try {
    // Only allow in development
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { error: 'This endpoint is only available in development' },
        { status: 403 }
      )
    }

    console.log('🔄 Manually triggering cron job...')

    // Call the check-alerts endpoint
    const baseUrl = process.env['NEXT_PUBLIC_SUPABASE_URL']
      ? 'http://localhost:3000'
      : 'http://localhost:3000'

    const response = await fetch(`${baseUrl}/api/cron/check-alerts`, {
      method: 'GET',
      headers: {
        'user-agent': 'vercel-cron/1.0', // Mimic Vercel cron user agent
      },
    })

    const data = await response.json()

    console.log('✅ Cron job completed:', data)

    return NextResponse.json({
      success: true,
      message: 'Cron job triggered successfully',
      result: data,
    })
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    console.error('❌ Failed to trigger cron job:', errorMessage)

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}
