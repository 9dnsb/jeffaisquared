# Square Webhook Setup Instructions

## Overview
This guide walks through setting up Square webhooks to receive real-time sales data into your production database.

## Implementation Status ✅
- [x] Webhook API endpoint created at `src/app/api/webhooks/square/route.ts`
- [x] HMAC signature verification implemented
- [x] Order and fulfillment event processing
- [x] Environment variables configured
- [x] Test script created

## Next Steps for Production

### 1. Deploy to Vercel
Deploy your application to get the production webhook URL:
```bash
npm run build
# Deploy via Vercel CLI or GitHub integration
```

Your webhook URL will be: `https://your-app.vercel.app/api/webhooks/square`

### 2. Configure Square Developer Console

1. **Go to Square Developer Dashboard**: https://developer.squareup.com/
2. **Select your Production Application**
3. **Navigate to Webhooks section**
4. **Create New Webhook**:
   - **URL**: `https://your-app.vercel.app/api/webhooks/square`
   - **Events to Subscribe**:
     - ✅ `order.created` - New orders
     - ✅ `order.updated` - Order changes
     - ✅ `order.fulfillment.updated` - Fulfillment updates
   - **API Version**: Use latest (v2024-12-18 or newer)

5. **Copy the Webhook Secret** - You'll need this for the next step

### 3. Update Production Environment Variables

Update your `.env.production` file:
```bash
SQUARE_WEBHOOK_SECRET=your_actual_webhook_secret_from_square
```

Or set in Vercel dashboard:
1. Go to your Vercel project settings
2. Navigate to Environment Variables
3. Add `SQUARE_WEBHOOK_SECRET` with the secret from Square

### 4. Test the Production Webhook

Square provides a test feature in their developer console:
1. Go to your webhook configuration
2. Click "Test" button
3. Send test events to verify integration

## Local Testing

To test locally before production:

1. **Start development server**:
   ```bash
   npm run dev
   ```

2. **Run test script**:
   ```bash
   node test-webhook.js
   ```

This sends a mock Square webhook to your local endpoint.

## Webhook Security Features

✅ **HMAC Signature Verification**: Validates requests come from Square
✅ **Environment Filtering**: Only processes Production webhooks
✅ **Idempotency**: Prevents duplicate processing using event_id
✅ **Retry Handling**: Properly responds to Square's retry mechanism

## Data Flow

```
Square POS/API → Square Webhook → Your API → Production Database
```

**Events Processed**:
- `order.created` → Creates new order + line items
- `order.updated` → Updates existing order (uses version field)
- `order.fulfillment.updated` → Updates order fulfillment status

## Database Impact

The webhook will automatically:
- Create/update `Location` records for new Square locations
- Upsert `Order` records using `squareOrderId` as unique key
- Upsert `LineItem` records using `squareLineItemUid` as unique key
- Maintain referential integrity with existing schema

## Monitoring

Monitor webhook processing via:
- Vercel function logs
- Square Developer Console webhook delivery logs
- Your application logs for processing errors

## IP Allowlisting

If using a firewall, allow these Square IP addresses:
- Production: `54.245.1.154`, `34.202.99.168`
- Sandbox: `54.212.177.79`, `107.20.218.8`

## Troubleshooting

**Common Issues**:
1. **401 Unauthorized**: Check webhook secret matches Square's secret
2. **500 Server Error**: Check environment variables and database connection
3. **Webhook not firing**: Verify URL is accessible and returns 2xx status
4. **Duplicate processing**: Check event_id handling in logs

**Square Retry Behavior**:
- Retries failed deliveries for up to 24 hours
- Uses exponential backoff (1min, 2min, 4min, 8min, etc.)
- Headers include `square-retry-number` and `square-retry-reason`

## Security Notes

⚠️ **Important**:
- Never commit webhook secrets to git
- Use different secrets for development vs production
- Monitor webhook logs for suspicious activity
- Webhook endpoint only accepts POST requests with valid signatures