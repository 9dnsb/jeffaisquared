// Debug AI response for HQ vs Yonge comparison
async function debugAIResponse() {
  try {
    console.log('=== Testing AI Response for HQ vs Yonge Comparison ===')

    const response = await fetch('http://localhost:3000/api/ai/v3/query', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: 'Compare revenue between HQ and Yonge locations'
      })
    })

    if (!response.ok) {
      console.error('API Error:', response.status, response.statusText)
      const errorText = await response.text()
      console.error('Error body:', errorText)
      return
    }

    const aiResponse = await response.json()

    console.log('\n=== AI Response Structure ===')
    console.log('Keys in response:', Object.keys(aiResponse))
    console.log('Summary:', aiResponse.summary)

    if (aiResponse.data) {
      console.log('\n=== Response Data ===')
      console.log('Data type:', typeof aiResponse.data)
      console.log('Data length:', aiResponse.data.length)
      console.log('Data content:', JSON.stringify(aiResponse.data, null, 2))
    } else {
      console.log('No data property in response')
    }

    if (aiResponse.metadata) {
      console.log('\n=== Metadata ===')
      console.log('Metadata:', JSON.stringify(aiResponse.metadata, null, 2))
    }

  } catch (error) {
    console.error('Error:', error)
  }
}

debugAIResponse()