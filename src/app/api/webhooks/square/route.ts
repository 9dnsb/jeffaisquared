import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { z } from 'zod'
import crypto from 'crypto'
import prisma from '../../../../../lib/prisma'

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

// Square webhook object schema - matches actual Square payload structure
const SquareWebhookObjectSchema = z.object({
  order_created: z.object({
    created_at: z.string(),
    location_id: z.string(),
    order_id: z.string(),
    state: z.string(),
    version: z.number(),
    updated_at: z.string().optional(),
  }).optional(),
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
  }).optional(),
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
      case 'order.created':
      case 'order.updated':
        await handleOrderEvent(event)
        break
      case 'order.fulfillment.updated':
        await handleFulfillmentEvent(event)
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

async function handleOrderEvent(event: z.infer<typeof SquareWebhookEventSchema>) {
  if (!event.data.object) {
    console.error('Missing order object in webhook data')
    return
  }

  // Log the actual payload structure for debugging
  console.log('Raw webhook data structure:', JSON.stringify(event.data.object, null, 2))

  let orderData
  try {
    orderData = SquareWebhookObjectSchema.parse(event.data.object)
  } catch (parseError) {
    console.error('Schema parse error:', parseError)
    console.error('Failed to parse object:', JSON.stringify(event.data.object, null, 2))
    return
  }

  // Handle different Square webhook structures
  let order
  if (orderData.order) {
    order = orderData.order
  } else if (orderData.order_created) {
    // Handle order.created event structure
    order = {
      id: orderData.order_created.order_id,
      location_id: orderData.order_created.location_id,
      state: orderData.order_created.state,
      created_at: orderData.order_created.created_at,
      updated_at: orderData.order_created.updated_at || orderData.order_created.created_at,
      version: orderData.order_created.version,
      total_money: { amount: 0, currency: 'USD' }, // Default values for order_created events
    }
  } else {
    console.error('No recognizable order structure found')
    return
  }

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
        },
      })
    }
  }

  console.log(`✅ Successfully processed order ${order.id} for location ${order.location_id}`, {
    eventType: event.type,
    orderState: order.state,
    version: order.version
  })
}

async function handleFulfillmentEvent(event: z.infer<typeof SquareWebhookEventSchema>) {
  if (!event.data.object) {
    console.error('Missing fulfillment object in webhook data')
    return
  }

  // Parse fulfillment update and update order state if needed
  const orderId = event.data.id

  try {
    const existingOrder = await prisma.order.findFirst({
      where: { squareOrderId: orderId },
    })

    if (existingOrder) {
      // Update order state based on fulfillment
      await prisma.order.update({
        where: { id: existingOrder.id },
        data: {
          updatedAt: new Date(),
          // Could update state based on fulfillment status
        },
      })
      console.log(`Updated fulfillment for order ${orderId}`)
    }
  } catch (err) {
    console.error(`Error updating fulfillment for order ${orderId}:`, err)
  }
}