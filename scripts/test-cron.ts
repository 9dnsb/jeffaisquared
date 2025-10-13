/**
 * Test script for local cron job testing
 * Usage: npx tsx scripts/test-cron.ts
 */

async function testCron() {
  console.log('🧪 Testing cron job locally...\n')

  try {
    const response = await fetch('http://localhost:3000/api/cron/check-alerts', {
      method: 'GET',
      headers: {
        'User-Agent': 'vercel-cron/1.0',
      },
    })

    console.log('📊 Response status:', response.status)
    console.log('📊 Response headers:', Object.fromEntries(response.headers.entries()))

    const text = await response.text()
    console.log('📊 Response body preview:', text.substring(0, 500))

    let data
    try {
      data = JSON.parse(text)
      console.log('📊 Response data:', JSON.stringify(data, null, 2))
    } catch {
      console.log('📊 Response is not JSON (HTML error page)')
    }

    if (response.ok) {
      console.log('\n✅ Cron job test successful!')
    } else {
      console.log('\n❌ Cron job test failed!')
    }
  } catch (err) {
    console.error('❌ Error testing cron job:', err)
    console.error('\n💡 Make sure your dev server is running: npm run dev')
  }
}

testCron()
