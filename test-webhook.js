const crypto = require('crypto')

// Test webhook payload (example Square order.created event)
const testPayload = {
  merchant_id: 'ML43KB6S5NBQM',
  location_id: 'L7HMVTBP34YY8',
  type: 'order.created',
  event_id: 'test-event-' + Date.now(),
  created_at: new Date().toISOString(),
  data: {
    type: 'order',
    id: 'test-order-' + Date.now(),
    object: {
      order: {
        id: 'test-order-' + Date.now(),
        location_id: 'L7HMVTBP34YY8',
        state: 'OPEN',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        total_money: {
          amount: 1500, // $15.00
          currency: 'USD'
        },
        version: 1,
        source: {
          name: 'Square Point of Sale'
        },
        line_items: [
          {
            uid: 'test-line-item-' + Date.now(),
            name: 'Test Coffee',
            quantity: '2',
            base_price_money: {
              amount: 750,
              currency: 'USD'
            },
            total_money: {
              amount: 1500,
              currency: 'USD'
            },
            total_tax_money: {
              amount: 0
            },
            total_discount_money: {
              amount: 0
            },
            catalog_object_id: 'test-catalog-id',
            variation_name: 'Large'
          }
        ]
      }
    }
  }
}

// Generate HMAC signature
function generateSignature(payload, secret) {
  const hmac = crypto.createHmac('sha256', secret)
  hmac.update(payload)
  return hmac.digest('base64')
}

async function testWebhook() {
  const webhookSecret = process.env.SQUARE_WEBHOOK_SECRET || 'test-secret-key'
  const payloadString = JSON.stringify(testPayload)
  const signature = generateSignature(payloadString, webhookSecret)

  console.log('Testing webhook with payload:')
  console.log(JSON.stringify(testPayload, null, 2))
  console.log('\nGenerated signature:', signature)

  try {
    const response = await fetch('http://localhost:3000/api/webhooks/square', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-square-hmacsha256-signature': signature,
        'square-environment': 'Production', // Change to 'Sandbox' for testing
        'square-initial-delivery-timestamp': new Date().toISOString()
      },
      body: payloadString
    })

    const result = await response.text()
    console.log('\nResponse status:', response.status)
    console.log('Response body:', result)

    if (response.ok) {
      console.log('\n✅ Webhook test successful!')
    } else {
      console.log('\n❌ Webhook test failed!')
    }
  } catch (error) {
    console.error('\n❌ Error testing webhook:', error.message)
  }
}

// Run test if this file is executed directly
if (require.main === module) {
  testWebhook()
}

module.exports = { testWebhook, generateSignature }