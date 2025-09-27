import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { z } from 'zod'
import crypto from 'crypto'
import prisma from '../../../../../lib/prisma'

// Intelligent item categorization (same logic as seed)
function categorizeItem(
  itemName: string,
  squareCategory: string | null = null
): string {
  // If we have a Square category, try to map it to a simplified category first
  if (squareCategory) {
    const categoryLower = squareCategory.toLowerCase()

    // Map Square categories to simplified categories
    if (categoryLower.includes('coffee')) return 'coffee'
    if (categoryLower.includes('tea')) return 'tea'
    if (categoryLower.includes('food')) return 'food'
    if (categoryLower.includes('beverage')) return 'beverages'
    if (categoryLower.includes('signature')) return 'signature-drinks'
    if (categoryLower.includes('retail')) return 'retail'
    if (categoryLower.includes('wholesale')) return 'wholesale'
    if (
      categoryLower.includes('apparel') ||
      categoryLower.includes('merchandize')
    )
      return 'merchandise'
    if (
      categoryLower.includes('syrup') ||
      categoryLower.includes('powder') ||
      categoryLower.includes('modification')
    )
      return 'add-ons'
    if (categoryLower.includes('education') || categoryLower.includes('event'))
      return 'services'

    // If we have a Square category but it doesn't match our mapping, use it as-is
    return squareCategory.toLowerCase().replace(/[^a-z0-9]/g, '-')
  }

  // Fallback to name-based categorization if no Square category
  if (!itemName || typeof itemName !== 'string') {
    return 'other'
  }
  const name = itemName.toLowerCase()

  if (
    name.includes('coffee') ||
    name.includes('brew') ||
    name.includes('americano') ||
    name.includes('espresso')
  ) {
    return 'coffee'
  }
  if (
    name.includes('latte') ||
    name.includes('cappuccino') ||
    name.includes('macchiato')
  ) {
    return 'coffee-drinks'
  }
  if (
    name.includes('tea') ||
    name.includes('chai') ||
    name.includes('matcha')
  ) {
    return 'tea'
  }
  if (
    name.includes('croissant') ||
    name.includes('danish') ||
    name.includes('muffin') ||
    name.includes('bagel')
  ) {
    return 'pastry'
  }
  if (
    name.includes('sandwich') ||
    name.includes('wrap') ||
    name.includes('salad')
  ) {
    return 'food'
  }
  if (name.includes('juice') || name.includes('smoothie')) {
    return 'beverages'
  }

  return 'other'
}

// Square webhook event schema
const SquareWebhookEventSchema = z.object({
  merchant_id: z.string(),
  location_id: z.string().optional(),
  type: z.string(),
  event_id: z.string(),
  created_at: z.string(),
  data: z.object({
    type: z.string(),
    id: z.string(),
    object: z.record(z.any()).optional(),
  }),
})

// Square payment webhook object schema
const SquarePaymentWebhookObjectSchema = z.object({
  payment: z.object({
    id: z.string(),
    order_id: z.string(),
    location_id: z.string(),
    status: z.string(),
    amount_money: z.object({
      amount: z.number(),
      currency: z.string(),
    }),
    total_money: z.object({
      amount: z.number(),
      currency: z.string(),
    }),
    created_at: z.string(),
    updated_at: z.string(),
    version: z.number(),
    source_type: z.string(),
    card_details: z.object({
      status: z.string(),
      card: z.object({
        card_brand: z.string(),
        last_4: z.string(),
        card_type: z.string(),
      }).optional(),
    }).optional(),
  }),
})

// Square order API response schema (for retrieved orders)
const SquareOrderApiSchema = z.object({
  order: z.object({
    id: z.string(),
    location_id: z.string(),
    state: z.string(),
    created_at: z.string(),
    updated_at: z.string(),
    total_money: z.object({
      amount: z.number(),
      currency: z.string(),
    }).optional(),
    version: z.number().optional(),
    source: z.object({
      name: z.string().optional(),
    }).optional(),
    line_items: z.array(z.object({
      uid: z.string(),
      name: z.string(),
      quantity: z.string(),
      base_price_money: z.object({
        amount: z.number(),
        currency: z.string(),
      }).optional(),
      total_money: z.object({
        amount: z.number(),
        currency: z.string(),
      }),
      total_tax_money: z.object({
        amount: z.number(),
      }).optional(),
      total_discount_money: z.object({
        amount: z.number(),
      }).optional(),
      catalog_object_id: z.string().optional(),
      variation_name: z.string().optional(),
    })).optional(),
  }),
})

function verifySquareSignature(
  payload: string,
  signature: string,
  webhookSecret: string
): boolean {
  try {
    // Square sends the signature with the webhook URL + payload
    const notificationUrl = 'https://jeffaisquared.vercel.app/api/webhooks/square'
    const stringToSign = notificationUrl + payload

    const hmac = crypto.createHmac('sha256', webhookSecret)
    hmac.update(stringToSign, 'utf8')
    const expectedSignature = hmac.digest('base64')

    return crypto.timingSafeEqual(
      Buffer.from(signature, 'base64'),
      Buffer.from(expectedSignature, 'base64')
    )
  } catch (err) {
    console.error('Signature verification error:', err)
    return false
  }
}

// Function to fetch order details from Square API
async function fetchOrderFromSquareApi(orderId: string): Promise<z.infer<typeof SquareOrderApiSchema> | null> {
  const accessToken = process.env.SQUARE_ACCESS_TOKEN
  if (!accessToken) {
    console.error('SQUARE_ACCESS_TOKEN not configured')
    return null
  }

  try {
    const response = await fetch(`https://connect.squareup.com/v2/orders/${orderId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Square-Version': '2025-08-20',
      },
    })

    if (!response.ok) {
      console.error(`Square API error: ${response.status} - ${response.statusText}`)
      return null
    }

    const data = await response.json()

    // Validate response structure
    const orderData = SquareOrderApiSchema.parse(data)
    return orderData
  } catch (err) {
    console.error('Error fetching order from Square API:', err)
    return null
  }
}

export async function POST(request: NextRequest) {
  try {
    const headersList = await headers()
    const signature = headersList.get('x-square-hmacsha256-signature')
    const environment = headersList.get('square-environment')
    const retryNumber = headersList.get('square-retry-number')

    // Only process production webhooks
    if (environment !== 'Production') {
      console.log(`Ignoring ${environment} webhook`)
      return NextResponse.json({ status: 'ignored' }, { status: 200 })
    }

    const webhookSecret = process.env.SQUARE_WEBHOOK_SECRET
    if (!webhookSecret) {
      console.error('SQUARE_WEBHOOK_SECRET not configured')
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    if (!signature) {
      console.error('Missing Square signature')
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
    }

    const rawBody = await request.text()

    // Log for debugging (remove in production)
    console.log('Webhook debug info:', {
      hasSignature: !!signature,
      hasSecret: !!webhookSecret,
      environment,
      bodyLength: rawBody.length,
      signaturePrefix: signature?.substring(0, 10) + '...'
    })

    // Verify signature
    if (!verifySquareSignature(rawBody, signature, webhookSecret)) {
      console.error('Invalid Square signature - verification failed')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    const event = SquareWebhookEventSchema.parse(JSON.parse(rawBody))

    // Log retry attempts
    if (retryNumber) {
      console.log(`Processing retry #${retryNumber} for event ${event.event_id}`)
    }

    // Handle different event types
    switch (event.type) {
      case 'payment.updated':
        await handlePaymentUpdatedEvent(event)
        break
      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ status: 'success' }, { status: 200 })
  } catch (err) {
    console.error('Webhook processing error:', err)
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 })
  }
}

async function handlePaymentUpdatedEvent(event: z.infer<typeof SquareWebhookEventSchema>) {
  if (!event.data.object) {
    console.error('Missing payment object in webhook data')
    return
  }

  // Log the actual payload structure for debugging
  console.log('Raw payment webhook data:', JSON.stringify(event.data.object, null, 2))

  let paymentData
  try {
    paymentData = SquarePaymentWebhookObjectSchema.parse(event.data.object)
  } catch (parseError) {
    console.error('Payment schema parse error:', parseError)
    console.error('Failed to parse payment object:', JSON.stringify(event.data.object, null, 2))
    return
  }

  const payment = paymentData.payment
  const orderId = payment.order_id

  console.log(`🔄 Processing payment.updated for order ${orderId}`, {
    paymentId: payment.id,
    paymentStatus: payment.status,
    amount: `${payment.total_money.amount / 100} ${payment.total_money.currency}`,
    location: payment.location_id
  })

  // Only process completed payments
  if (payment.status !== 'COMPLETED') {
    console.log(`⏭️ Skipping payment ${payment.id} - status is ${payment.status} (not COMPLETED)`)
    return
  }

  // Fetch full order details from Square API
  const orderApiResponse = await fetchOrderFromSquareApi(orderId)
  if (!orderApiResponse) {
    console.error(`❌ Failed to fetch order ${orderId} from Square API`)
    return
  }

  const order = orderApiResponse.order

  // Check if location exists, create if not
  await prisma.location.upsert({
    where: { squareLocationId: order.location_id },
    update: {},
    create: {
      squareLocationId: order.location_id,
      name: `Location ${order.location_id}`, // Will be updated with actual name later
    },
  })

  // Upsert order
  const upsertedOrder = await prisma.order.upsert({
    where: { squareOrderId: order.id },
    update: {
      state: order.state,
      totalAmount: order.total_money?.amount || 0,
      currency: order.total_money?.currency || 'USD',
      version: order.version || 1,
      source: order.source?.name,
      updatedAt: new Date(),
    },
    create: {
      squareOrderId: order.id,
      locationId: order.location_id,
      date: new Date(order.created_at),
      state: order.state,
      totalAmount: order.total_money?.amount || 0,
      currency: order.total_money?.currency || 'USD',
      version: order.version || 1,
      source: order.source?.name,
    },
  })

  // Handle line items if present
  if (order.line_items) {
    for (const lineItem of order.line_items) {
      // Find or create Item (same logic as seed)
      const searchSquareItemId =
        lineItem.catalog_object_id ||
        `GENERATED_${lineItem.name.replace(/\s+/g, '_').toUpperCase()}`

      let item = await prisma.item.findUnique({
        where: {
          squareItemId: searchSquareItemId,
        },
      })

      // If not found by squareItemId, try finding by squareCatalogId
      if (!item && lineItem.catalog_object_id) {
        item = await prisma.item.findUnique({
          where: {
            squareCatalogId: lineItem.catalog_object_id,
          },
        })
      }

      // If item doesn't exist, create it on the fly
      if (!item) {
        const itemData = {
          squareItemId: searchSquareItemId,
          squareCatalogId: lineItem.catalog_object_id,
          squareCategoryId: null,
          name: lineItem.name,
          category: categorizeItem(lineItem.name),
          isActive: true,
        }

        try {
          item = await prisma.item.upsert({
            where: { squareItemId: itemData.squareItemId },
            update: {
              name: itemData.name,
              category: itemData.category,
              squareCategoryId: itemData.squareCategoryId,
              isActive: itemData.isActive,
            },
            create: itemData,
          })
        } catch (err) {
          console.warn(`⚠️ Could not create item ${lineItem.name}:`, err)
        }
      }

      if (item) {
        await prisma.lineItem.upsert({
          where: { squareLineItemUid: lineItem.uid },
          update: {
            name: lineItem.name,
            quantity: parseInt(lineItem.quantity),
            unitPriceAmount: lineItem.base_price_money?.amount || 0,
            totalPriceAmount: lineItem.total_money.amount,
            currency: lineItem.total_money.currency,
            taxAmount: lineItem.total_tax_money?.amount || 0,
            discountAmount: lineItem.total_discount_money?.amount || 0,
            variations: lineItem.variation_name,
            category: lineItem.catalog_object_id || null,
            itemId: item.id,
          },
          create: {
            squareLineItemUid: lineItem.uid,
            orderId: upsertedOrder.id,
            name: lineItem.name,
            quantity: parseInt(lineItem.quantity),
            unitPriceAmount: lineItem.base_price_money?.amount || 0,
            totalPriceAmount: lineItem.total_money.amount,
            currency: lineItem.total_money.currency,
            taxAmount: lineItem.total_tax_money?.amount || 0,
            discountAmount: lineItem.total_discount_money?.amount || 0,
            variations: lineItem.variation_name,
            category: lineItem.catalog_object_id || null,
            itemId: item.id,
          },
        })
      } else {
        console.warn(
          `⚠️ Could not create/find item for line item: ${lineItem.name} (searchSquareItemId: ${searchSquareItemId})`
        )
      }
    }
  }

  console.log(`✅ Successfully processed payment.updated → order ${order.id} for location ${order.location_id}`, {
    paymentId: payment.id,
    orderState: order.state,
    orderVersion: order.version,
    lineItemsCount: order.line_items?.length || 0
  })
}