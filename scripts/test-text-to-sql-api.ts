/**
 * Test Text-to-SQL API Route
 * Tests the /api/text-to-sql endpoint with Server-Sent Events
 *
 * Usage: Start dev server first (npm run dev), then run:
 *        npx tsx scripts/test-text-to-sql-api.ts
 */

interface SSEEvent {
  type: 'status' | 'schema' | 'sql' | 'results' | 'error' | 'complete'
  message?: string
  data?: unknown
}

async function testTextToSQL(question: string): Promise<void> {
  console.log('\n' + '='.repeat(80))
  console.log(`\n❓ Question: "${question}"\n`)

  try {
    const response = await fetch('http://localhost:3000/api/text-to-sql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ question }),
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    if (!response.body) {
      throw new Error('No response body')
    }

    // Read SSE stream
    const reader = response.body.getReader()
    const decoder = new TextDecoder()

    while (true) {
      const { done, value } = await reader.read()

      if (done) {
        break
      }

      const chunk = decoder.decode(value)
      const lines = chunk.split('\n').filter((line) => line.trim() !== '')

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const eventData = line.substring(6)
          const event: SSEEvent = JSON.parse(eventData)

          switch (event.type) {
            case 'status':
              console.log(`⏳ ${event.message}`)
              break

            case 'schema':
              console.log(`🔍 ${event.message}`)
              if (event.data && Array.isArray(event.data)) {
                event.data.slice(0, 3).forEach((item) => {
                  console.log(
                    `   - [${item.type}] ${item.name} (${(item.similarity * 100).toFixed(1)}%)`
                  )
                })
                if (event.data.length > 3) {
                  console.log(`   ... and ${event.data.length - 3} more`)
                }
              }
              break

            case 'sql':
              console.log(`\n🧩 SQL Query Generated:`)
              console.log(`   Explanation: ${event.message}`)
              if (event.data && typeof event.data === 'object' && 'sql' in event.data) {
                console.log(`\n   ${event.data.sql}\n`)
              }
              break

            case 'results':
              console.log(`📊 ${event.message}`)
              if (event.data && Array.isArray(event.data)) {
                if (event.data.length > 0) {
                  console.log('\n   Results:')
                  console.table(event.data.slice(0, 10)) // Show first 10 rows
                  if (event.data.length > 10) {
                    console.log(`   ... and ${event.data.length - 10} more rows`)
                  }
                }
              }
              break

            case 'error':
              console.error(`❌ Error: ${event.message}`)
              break

            case 'complete':
              console.log(`✅ ${event.message}`)
              break
          }
        }
      }
    }
  } catch (err) {
    console.error('❌ Test failed:', err)
  }
}

async function main(): Promise<void> {
  console.log('🧪 Text-to-SQL API Test Suite')
  console.log('='.repeat(80))
  console.log('\nMake sure dev server is running: npm run dev\n')

  // Test questions
  const testQuestions = [
    'What were my total sales last week?',
    'Show me my top 5 selling items',
    'Which location had the most revenue yesterday?',
    'What is my average order value?',
  ]

  for (const question of testQuestions) {
    await testTextToSQL(question)
  }

  console.log('\n' + '='.repeat(80))
  console.log('\n✨ Text-to-SQL API Test Complete!\n')
}

main().catch(console.error)
