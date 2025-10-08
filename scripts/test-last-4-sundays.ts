/**
 * Test Text-to-SQL API: Best selling items from last 4 Sundays
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
                event.data.slice(0, 5).forEach((item: { type: string; name: string; similarity: number }) => {
                  console.log(
                    `   - [${item.type}] ${item.name} (${(item.similarity * 100).toFixed(1)}%)`
                  )
                })
                if (event.data.length > 5) {
                  console.log(`   ... and ${event.data.length - 5} more`)
                }
              }
              break

            case 'sql':
              console.log(`\n🧩 SQL Query Generated:`)
              console.log(`   Explanation: ${event.message}`)
              if (event.data && typeof event.data === 'object' && 'sql' in event.data) {
                console.log(`\n${event.data.sql}\n`)
              }
              break

            case 'results':
              console.log(`📊 ${event.message}`)
              if (event.data && Array.isArray(event.data)) {
                if (event.data.length > 0) {
                  console.log('\n   Results:')
                  console.table(event.data)
                } else {
                  console.log('   No results found.')
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
  console.log('🧪 Text-to-SQL Test: Best Selling Items from Last 4 Sundays')
  console.log('='.repeat(80))
  console.log('\nMake sure dev server is running on http://localhost:3000\n')

  await testTextToSQL('What were the best selling items from the last 4 Sundays?')

  console.log('\n' + '='.repeat(80))
  console.log('\n✨ Test Complete!\n')
}

main().catch(console.error)