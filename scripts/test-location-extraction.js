const { DataQueryHandler } = require('../src/lib/ai/dataQueryHandler')

async function testLocationExtraction() {
  console.log('Testing location extraction from user queries...')

  const handler = new DataQueryHandler()

  // Test queries that should extract locations
  const testQueries = [
    'What are sales at Bloor compared to The Well?',
    'Show me sales data for Yonge street location',
    'How is the main location performing?',
    'Compare broadway vs kingston sales',
    'What about the HQ location?',
    'Sales at De Mello Coffee - The Well',
    'Performance at spadina location'
  ]

  console.log('\n=== Testing Location Extraction ===')

  for (const query of testQueries) {
    try {
      console.log(`\nQuery: "${query}"`)

      // Access the private method through reflection for testing
      const extractedLocationIds = await handler.extractLocationIdsFromQuery(query)

      if (extractedLocationIds.length > 0) {
        console.log(`  ✅ Extracted location IDs: ${extractedLocationIds.join(', ')}`)
      } else {
        console.log(`  ❌ No locations extracted`)
      }

    } catch (error) {
      console.error(`  💥 Error: ${error.message}`)
    }
  }

  console.log('\n✅ Location extraction test completed!')
}

// Since the method is private, we need to test it indirectly
// Let's create a simple test that creates a DataQueryHandler instance
testLocationExtraction().catch(console.error)