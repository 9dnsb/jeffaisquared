import nodemailer from 'nodemailer'

// Gmail SMTP transporter using App Password
// See: https://nodemailer.com/usage/using-gmail/
export const emailTransporter = nodemailer.createTransport({
  service: 'gmail', // Uses Gmail's SMTP settings automatically
  auth: {
    user: process.env['GMAIL_USER']!, // your@gmail.com
    pass: process.env['GMAIL_APP_PASSWORD']!, // 16-char app password (no spaces)
  },
})

// Verify transporter on startup
export async function verifyEmailTransporter(): Promise<boolean> {
  try {
    await emailTransporter.verify()
    console.log('✅ Email transporter ready')
    return true
  } catch (error) {
    console.error('❌ Email transporter error:', error)
    return false
  }
}
