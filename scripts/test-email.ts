/**
 * Test script for Gmail email sending
 * Usage: npx tsx scripts/test-email.ts
 */

import { sendAlertEmail } from '../src/lib/email/send-alert'
import { verifyEmailTransporter } from '../src/lib/email/nodemailer'

async function testEmail() {
  console.log('🧪 Testing email notification...\n')

  // Check environment variables
  if (!process.env['GMAIL_USER']) {
    console.error('❌ GMAIL_USER not set in environment')
    process.exit(1)
  }

  if (!process.env['GMAIL_APP_PASSWORD']) {
    console.error('❌ GMAIL_APP_PASSWORD not set in environment')
    process.exit(1)
  }

  if (!process.env['ALERT_EMAIL']) {
    console.error('❌ ALERT_EMAIL not set in environment')
    process.exit(1)
  }

  console.log('✅ Environment variables configured')
  console.log(`📧 Will send to: ${process.env['ALERT_EMAIL']}\n`)

  // Verify transporter
  console.log('🔍 Verifying email transporter...')
  const isValid = await verifyEmailTransporter()

  if (!isValid) {
    console.error('❌ Email transporter verification failed')
    process.exit(1)
  }

  // Send test email
  console.log('\n📤 Sending test alert email...')

  try {
    await sendAlertEmail({
      userId: 'test-user',
      alertName: 'Test Alert: Daily Sales $5k',
      description: 'This is a test notification from your sales analytics platform.',
      currentValue: 5250.75,
      threshold: 5000,
      timeframe: 'today',
    })

    console.log('\n✅ Test email sent successfully!')
    console.log('💡 Check your inbox at:', process.env['ALERT_EMAIL'])
  } catch (error) {
    console.error('\n❌ Failed to send test email:', error)
    process.exit(1)
  }
}

testEmail()
