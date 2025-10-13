import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import prisma from '@/root-lib/prisma'
import { sendAlertEmail } from '../../../../lib/email/send-alert'
import {
  generateAlertSQL,
  extractMetricValue,
  meetsCondition,
  formatAlertMessage,
} from '../../../../lib/alerts/sql-generator'
import type { AlertCondition } from '../../../../lib/alerts/types'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

interface AlertRule {
  id: string
  userId: string
  name: string
  description: string | null
  conditionType: string
  conditionData: Record<string, unknown>
  frequency: string
  lastTriggeredAt: Date | null
  isActive: boolean
}

export async function GET(request: NextRequest): Promise<Response> {
  // Security: Verify Vercel Cron user agent
  const userAgent = request.headers.get('user-agent')
  if (!userAgent?.includes('vercel-cron/1.0')) {
    console.warn('Unauthorized cron attempt:', userAgent)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  console.log('🔄 Starting cron job: check-alerts')

  const supabase = createClient(
    process.env['NEXT_PUBLIC_SUPABASE_URL']!,
    process.env['SUPABASE_SERVICE_ROLE_KEY']!
  )

  // Optimized query using composite index
  const alerts = await prisma.alertRule.findMany({
    where: { isActive: true },
    orderBy: { lastTriggeredAt: 'asc' }, // Check oldest first
  })

  console.log(`📊 Found ${alerts.length} active alerts`)

  let triggered = 0
  let errors = 0

  for (const alert of alerts as AlertRule[]) {
    try {
      // Check if should evaluate based on frequency
      if (!shouldEvaluateAlert(alert)) {
        console.log(`⏭️ Skipping alert ${alert.id} - not due yet`)
        continue
      }

      const conditionData = alert.conditionData as unknown as AlertCondition
      const sql = generateAlertSQL(conditionData)
      console.log(`🔍 Evaluating alert ${alert.id}: ${alert.name}`)

      // Use existing exec_sql_query RPC function
      const { data, error } = await supabase.rpc('exec_sql_query', {
        sql_query: sql,
      })

      if (error) {
        console.error(`❌ SQL error for alert ${alert.id}:`, error)
        errors++
        continue
      }

      // Parse JSON result
      const results =
        typeof data === 'string' ? JSON.parse(data as string) : data

      if (!results || !Array.isArray(results) || results.length === 0) {
        console.log(`⏸️ Alert ${alert.id} - no data returned`)
        continue
      }

      const result = results[0] as Record<string, unknown>
      const currentValue = extractMetricValue(result, conditionData)

      if (meetsCondition(currentValue, conditionData)) {
        console.log(
          `🎯 Alert triggered: ${alert.name} (${currentValue} ${conditionData.operator} ${conditionData.value})`
        )

        // Create notification
        const notification = await prisma.notification.create({
          data: {
            userId: alert.userId,
            alertRuleId: alert.id,
            title: alert.name,
            message: formatAlertMessage(
              { description: alert.description, conditionData },
              currentValue
            ),
            type: 'milestone',
            status: 'unread',
            metadata: JSON.parse(
              JSON.stringify({
                currentValue,
                threshold: conditionData.value,
                sql,
                result,
                triggeredAt: new Date().toISOString(),
              })
            ),
          },
        })

        // Send email notification
        try {
          await sendAlertEmail({
            userId: alert.userId,
            alertName: alert.name,
            description: alert.description || '',
            currentValue,
            threshold: conditionData.value,
            timeframe: conditionData.timeframe,
          })

          await prisma.notification.update({
            where: { id: notification.id },
            data: {
              emailSent: true,
              emailSentAt: new Date(),
            },
          })

          console.log(`✅ Email sent for alert ${alert.id}`)
        } catch (emailErr) {
          console.error(`❌ Email failed for alert ${alert.id}:`, emailErr)
          errors++
        }

        // Update last triggered timestamp
        await prisma.alertRule.update({
          where: { id: alert.id },
          data: { lastTriggeredAt: new Date() },
        })

        triggered++
      } else {
        console.log(
          `⏸️ Alert ${alert.id} condition not met (current: ${currentValue}, threshold: ${conditionData.value})`
        )
      }
    } catch (err) {
      console.error(`❌ Error processing alert ${alert.id}:`, err)
      errors++
    }
  }

  // Periodically analyze tables (every 100 runs = ~25 hours)
  const runNumber = Math.floor(Date.now() / 1000 / 60 / 15) % 100
  if (runNumber === 0) {
    console.log('🔧 Running table analysis...')
    try {
      await supabase.rpc('exec_sql_query', {
        sql_query: 'ANALYZE alert_rules; ANALYZE notifications;',
      })
      console.log('✅ Table analysis complete')
    } catch (analyzeErr) {
      console.error('❌ Table analysis failed:', analyzeErr)
    }
  }

  console.log(
    `✅ Cron job complete: ${triggered} alerts triggered, ${errors} errors`
  )

  return NextResponse.json({
    success: true,
    checked: alerts.length,
    triggered,
    errors,
    timestamp: new Date().toISOString(),
  })
}

function shouldEvaluateAlert(alert: AlertRule): boolean {
  const { frequency, lastTriggeredAt } = alert

  if (!lastTriggeredAt) return true // Never triggered before

  const now = new Date()
  const lastTrigger = new Date(lastTriggeredAt)
  const hoursSinceLastTrigger =
    (now.getTime() - lastTrigger.getTime()) / (1000 * 60 * 60)

  switch (frequency) {
    case 'once':
      return false // Already triggered, don't trigger again
    case 'daily':
      return hoursSinceLastTrigger >= 24 // Once per day
    case 'weekly':
      return hoursSinceLastTrigger >= 168 // Once per week
    default:
      return true
  }
}
