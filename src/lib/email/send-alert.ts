/**
 * Email Alert Notification
 * Sends email notifications when alerts are triggered via Gmail SMTP
 */

import { emailTransporter } from './nodemailer'

interface AlertEmailData {
  userId: string
  alertName: string
  description: string
  currentValue: number
  threshold: number
  timeframe: string
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value)
}

function generateEmailHTML(data: AlertEmailData): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #4CAF50; color: white; padding: 20px; border-radius: 5px 5px 0 0; }
          .content { background-color: #f9f9f9; padding: 20px; border: 1px solid #ddd; border-radius: 0 0 5px 5px; }
          .metric { background-color: #fff; padding: 15px; margin: 10px 0; border-left: 4px solid #4CAF50; }
          .metric strong { color: #4CAF50; font-size: 1.2em; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 0.9em; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>🎯 Sales Alert Triggered</h2>
          </div>
          <div class="content">
            <h3>${data.alertName}</h3>
            <p>${data.description}</p>

            <div class="metric">
              <p><strong>Current Value:</strong> ${formatCurrency(data.currentValue)}</p>
              <p><strong>Threshold:</strong> ${formatCurrency(data.threshold)}</p>
              <p><strong>Timeframe:</strong> ${data.timeframe}</p>
            </div>

            <p style="margin-top: 20px;">
              This alert was triggered because your sales milestone condition was met.
            </p>
          </div>
          <div class="footer">
            <p>Sales Analytics Platform | Automated Alert</p>
          </div>
        </div>
      </body>
    </html>
  `
}

export async function sendAlertEmail(data: AlertEmailData): Promise<void> {
  const alertEmail = process.env['ALERT_EMAIL']

  if (!alertEmail) {
    console.error('❌ ALERT_EMAIL not configured in environment variables')
    throw new Error('ALERT_EMAIL environment variable is required')
  }

  try {
    await emailTransporter.sendMail({
      from: process.env['GMAIL_USER'],
      to: alertEmail,
      subject: `🎯 Alert: ${data.alertName}`,
      html: generateEmailHTML(data),
    })

    console.log('✅ Alert email sent successfully to:', alertEmail)
  } catch (error) {
    console.error('❌ Failed to send alert email:', error)
    throw error
  }
}
