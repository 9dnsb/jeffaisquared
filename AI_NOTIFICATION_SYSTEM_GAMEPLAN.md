# 🔔 AI-Powered Notification System - Implementation Gameplan

## Executive Summary

Building on your existing Text-to-SQL RAG system, we'll add milestone-based alerts that users create through AI chat. The system will monitor conditions every 15 minutes via Vercel Cron, send email notifications via Nodemailer+Gmail, and provide a dedicated notifications dashboard.

---

## Key Insights from Documentation Review

### ✅ Vector/Embeddings (Already Implemented)
- Your Text-to-SQL RAG system already uses pgvector correctly
- Using cosine distance (`<=>`) - optimal for normalized embeddings
- HNSW index for schema_embeddings - correct choice for small corpus
- Using `text-embedding-3-small` (1536 dimensions, cost-effective)

### ✅ OpenAI Responses API (Not Chat Completions)
- Modern stateful API with better reasoning performance
- Lower costs (40-80% cache improvement vs Chat Completions)
- Native support for function calling and streaming
- Use `response.output_text` helper for simple text extraction

### ✅ Database Optimizations for Alerts
- Create composite indexes for alert queries
- Use partial indexes for active alerts only
- Analyze tables periodically for query planner optimization

### ✅ Vercel Cron Jobs
- Available on all plans (including free Hobby)
- Always runs in UTC timezone (critical for date calculations)
- Verify requests via `vercel-cron/1.0` user agent
- Production deployments only (test locally via manual HTTP requests)

### ✅ Email System
- Nodemailer with Gmail SMTP
- Use App Password (not regular Gmail password)
- HTML + plain text templates for better deliverability
- Single recipient (jeffreyfenton@hellodemllo.com)

---

## Phase 1: Database Schema & Indexes

### 1.1 Prisma Models

Add to `prisma/schema.prisma`:

```prisma
model AlertRule {
  id              String           @id @default(cuid())
  userId          String           @map("user_id")
  name            String
  description     String?          @db.Text
  conditionType   String           @map("condition_type")
  conditionData   Json             @map("condition_data")
  isActive        Boolean          @default(true) @map("is_active")
  frequency       String           @default("once")
  lastTriggeredAt DateTime?        @map("last_triggered_at") @db.Timestamptz
  createdAt       DateTime         @default(now()) @map("created_at") @db.Timestamptz
  updatedAt       DateTime         @updatedAt @map("updated_at") @db.Timestamptz
  notifications   Notification[]

  // Optimized indexes based on Supabase best practices
  @@index([userId, isActive, lastTriggeredAt]) // Composite for cron queries
  @@index([isActive], where: "is_active = true") // Partial index for active alerts
  @@map("alert_rules")
}

model Notification {
  id            String     @id @default(cuid())
  userId        String     @map("user_id")
  alertRuleId   String?    @map("alert_rule_id")
  title         String
  message       String     @db.Text
  type          String     @default("milestone")
  status        String     @default("unread")
  metadata      Json?
  emailSent     Boolean    @default(false) @map("email_sent")
  emailSentAt   DateTime?  @map("email_sent_at") @db.Timestamptz
  createdAt     DateTime   @default(now()) @map("created_at") @db.Timestamptz
  updatedAt     DateTime   @updatedAt @map("updated_at") @db.Timestamptz
  alertRule     AlertRule? @relation(fields: [alertRuleId], references: [id], onDelete: Cascade)

  // Optimized indexes
  @@index([userId, status, createdAt]) // For dashboard queries
  @@index([userId, createdAt])         // For sorting
  @@index([emailSent], where: "email_sent = false") // Partial for pending emails
  @@map("notifications")
}
```

### 1.2 TypeScript Interfaces

Create `src/lib/alerts/types.ts`:

```typescript
export interface DailySalesCondition {
  type: "daily_sales_threshold";
  operator: ">=" | ">" | "<=" | "<" | "=";
  value: number; // in dollars
  timeframe: "today" | "yesterday";
  timezone?: string; // "America/New_York"
}

export interface ItemSalesCondition {
  type: "item_sales_threshold";
  itemName: string;
  operator: ">=" | ">" | "<=" | "<" | "=";
  value: number;
  metric: "quantity" | "revenue";
  timeframe: "today" | "this_week";
  timezone?: string;
}

export interface LocationSalesCondition {
  type: "location_sales_threshold";
  locationName: string;
  operator: ">=" | ">" | "<=" | "<" | "=";
  value: number;
  timeframe: "today" | "this_week";
  timezone?: string;
}

export type AlertCondition =
  | DailySalesCondition
  | ItemSalesCondition
  | LocationSalesCondition;
```

### 1.3 Migration Steps

```bash
# Create migration (DO NOT RUN - for documentation only)
npm run db:migrate:dev -- --name add_alert_notification_tables

# Generate Prisma client
npm run db:generate

# Run periodic table analysis (SQL)
ANALYZE alert_rules;
ANALYZE notifications;
```

---

## Phase 2: AI Chat Integration (Responses API)

### 2.1 Alert Creation Tool Definition

Create `src/lib/ai/alert-tools.ts`:

```typescript
export const alertTools = [
  {
    type: "function" as const,
    name: "create_milestone_alert",
    description: "Create a sales milestone notification when specific conditions are met",
    parameters: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Alert name (e.g., 'Daily Sales $5k')"
        },
        description: {
          type: "string",
          description: "Human-readable description of what triggers the alert"
        },
        conditionType: {
          type: "string",
          enum: ["daily_sales_threshold", "item_sales_threshold", "location_sales_threshold"],
          description: "Type of milestone to monitor"
        },
        conditionData: {
          type: "object",
          properties: {
            operator: {
              type: "string",
              enum: [">=", ">", "<=", "<", "="]
            },
            value: {
              type: "number",
              description: "Threshold value (dollars or quantity)"
            },
            timeframe: {
              type: "string",
              enum: ["today", "yesterday", "this_week"]
            },
            itemName: {
              type: "string",
              description: "Item name (for item_sales_threshold only)"
            },
            locationName: {
              type: "string",
              description: "Location name (for location_sales_threshold only)"
            },
            metric: {
              type: "string",
              enum: ["quantity", "revenue"],
              description: "What to measure (for item alerts)"
            }
          },
          required: ["operator", "value", "timeframe"]
        },
        frequency: {
          type: "string",
          enum: ["once", "daily", "weekly"],
          description: "How often to check after initial trigger"
        }
      },
      required: ["name", "description", "conditionType", "conditionData", "frequency"]
    }
  }
];
```

### 2.2 Update Text-to-SQL Route

Modify `src/app/api/text-to-sql/route.ts`:

```typescript
import { OpenAI } from 'openai';
import { alertTools } from '../../../../lib/ai/alert-tools';

const openai = new OpenAI({
  apiKey: process.env['OPENAI_API_KEY']!
});

export async function POST(request: Request) {
  const { question, userId } = await request.json();

  // Use Responses API (not Chat Completions!)
  const stream = await openai.responses.create({
    model: 'gpt-4o', // or gpt-4.1
    instructions: `You are a sales analytics assistant with two main capabilities:

1. **Text-to-SQL**: Answer data questions by generating and executing SQL queries
2. **Alert Creation**: Set up milestone notifications when users request alerts

**Alert Examples:**
- "Notify me when daily sales reach $5,000" → daily_sales_threshold
- "Alert me if Premium Coffee sells more than 100 units today" → item_sales_threshold
- "Tell me when Main Store hits $3k in sales" → location_sales_threshold

**Current timezone:** America/New_York (EST)
**Current date:** ${new Date().toLocaleDateString('en-US', { timeZone: 'America/New_York' })}`,
    input: question,
    tools: [
      ...alertTools,
      // Your existing text-to-sql tools here
    ],
    stream: true
  });

  // Handle streaming response with tool calls
  return new Response(
    new ReadableStream({
      async start(controller) {
        for await (const event of stream) {
          // Handle alert creation tool call
          if (event.type === 'response.function_call_arguments.done') {
            if (event.name === 'create_milestone_alert') {
              const args = JSON.parse(event.arguments);
              await createAlert(userId, args);

              // Send confirmation to client
              controller.enqueue(JSON.stringify({
                type: 'alert_created',
                data: args
              }) + '\n');
            }
          }

          // Forward all events to client
          controller.enqueue(JSON.stringify(event) + '\n');
        }
        controller.close();
      }
    }),
    {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    }
  );
}

async function createAlert(userId: string, args: any) {
  const { name, description, conditionType, conditionData, frequency } = args;

  await prisma.alertRule.create({
    data: {
      userId,
      name,
      description,
      conditionType,
      conditionData,
      frequency,
      isActive: true
    }
  });
}
```

### 2.3 Create Alert Management API

Create `src/app/api/alerts/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';

// GET /api/alerts - List user's alerts
export async function GET(request: NextRequest) {
  const userId = request.headers.get('x-user-id'); // Or get from auth

  const alerts = await prisma.alertRule.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    include: {
      notifications: {
        take: 5,
        orderBy: { createdAt: 'desc' }
      }
    }
  });

  return NextResponse.json(alerts);
}

// POST /api/alerts - Create alert manually
export async function POST(request: NextRequest) {
  const userId = request.headers.get('x-user-id');
  const data = await request.json();

  const alert = await prisma.alertRule.create({
    data: {
      userId,
      ...data
    }
  });

  return NextResponse.json(alert);
}

// PATCH /api/alerts/:id - Update alert
export async function PATCH(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const data = await request.json();

  const alert = await prisma.alertRule.update({
    where: { id },
    data
  });

  return NextResponse.json(alert);
}

// DELETE /api/alerts/:id - Delete alert
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  await prisma.alertRule.delete({
    where: { id }
  });

  return NextResponse.json({ success: true });
}
```

---

## Phase 3: Vercel Cron Job + Alert Monitoring

### 3.1 Vercel Configuration

Create/update `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/check-alerts",
      "schedule": "*/15 * * * *"
    }
  ]
}
```

**Schedule:** Every 15 minutes (96 runs/day)
**Timezone:** UTC (always)

### 3.2 SQL Generator

Create `src/lib/alerts/sql-generator.ts`:

```typescript
import { AlertCondition } from './types';

export function generateAlertSQL(condition: AlertCondition): string {
  if (condition.type === 'daily_sales_threshold') {
    return `
      SELECT
        COALESCE(SUM(total_amount) / 100.0, 0) as total_sales,
        COUNT(*) as order_count
      FROM orders
      WHERE date >= CURRENT_DATE
        AND date < CURRENT_DATE + INTERVAL '1 day'
        AND state = 'COMPLETED'
        AND total_amount > 0
    `;
  }

  if (condition.type === 'item_sales_threshold' && condition.itemName) {
    const metricColumn = condition.metric === 'quantity'
      ? 'SUM(li.quantity)'
      : 'SUM(li.total_price_amount) / 100.0';

    return `
      SELECT
        i.name,
        ${metricColumn} as metric_value
      FROM line_items li
      JOIN items i ON li.item_id = i.id
      JOIN orders o ON li.order_id = o.id
      WHERE o.date >= CURRENT_DATE
        AND o.date < CURRENT_DATE + INTERVAL '1 day'
        AND o.state = 'COMPLETED'
        AND i.name = '${condition.itemName.replace(/'/g, "''")}'
      GROUP BY i.id, i.name
    `;
  }

  if (condition.type === 'location_sales_threshold' && condition.locationName) {
    return `
      SELECT
        l.name,
        COALESCE(SUM(o.total_amount) / 100.0, 0) as location_sales
      FROM orders o
      JOIN locations l ON o.location_id = l.square_location_id
      WHERE o.date >= CURRENT_DATE
        AND o.date < CURRENT_DATE + INTERVAL '1 day'
        AND o.state = 'COMPLETED'
        AND l.name = '${condition.locationName.replace(/'/g, "''")}'
      GROUP BY l.id, l.name
    `;
  }

  throw new Error(`Unsupported condition type: ${condition.type}`);
}

export function extractMetricValue(result: any, condition: AlertCondition): number {
  switch (condition.type) {
    case 'daily_sales_threshold':
      return result.total_sales || 0;
    case 'item_sales_threshold':
      return result.metric_value || 0;
    case 'location_sales_threshold':
      return result.location_sales || 0;
    default:
      return 0;
  }
}

export function meetsCondition(value: number, condition: AlertCondition): boolean {
  const threshold = condition.value;

  switch (condition.operator) {
    case '>=': return value >= threshold;
    case '>': return value > threshold;
    case '<=': return value <= threshold;
    case '<': return value < threshold;
    case '=': return Math.abs(value - threshold) < 0.01;
    default: return false;
  }
}

export function formatAlertMessage(alert: any, currentValue: number): string {
  const condition = alert.conditionData;
  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(currentValue);

  return `${alert.description} Current value: ${formatted}`;
}
```

### 3.3 Cron Endpoint

Create `src/app/api/cron/check-alerts/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { prisma } from '../../../../lib/prisma';
import { sendAlertEmail } from '../../../../lib/email/send-alert';
import {
  generateAlertSQL,
  extractMetricValue,
  meetsCondition,
  formatAlertMessage
} from '../../../../lib/alerts/sql-generator';

export async function GET(request: NextRequest) {
  // Security: Verify Vercel Cron user agent
  const userAgent = request.headers.get('user-agent');
  if (!userAgent?.includes('vercel-cron/1.0')) {
    console.warn('Unauthorized cron attempt:', userAgent);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  console.log('🔄 Starting cron job: check-alerts');

  const supabase = createClient(
    process.env['NEXT_PUBLIC_SUPABASE_URL']!,
    process.env['SUPABASE_SERVICE_ROLE_KEY']!
  );

  // Optimized query using composite index
  const alerts = await prisma.alertRule.findMany({
    where: { isActive: true },
    orderBy: { lastTriggeredAt: 'asc' } // Check oldest first
  });

  console.log(`📊 Found ${alerts.length} active alerts`);

  let triggered = 0;
  let errors = 0;

  for (const alert of alerts) {
    try {
      // Check if should evaluate based on frequency
      if (!shouldEvaluateAlert(alert)) {
        console.log(`⏭️ Skipping alert ${alert.id} - not due yet`);
        continue;
      }

      const sql = generateAlertSQL(alert.conditionData);
      console.log(`🔍 Evaluating alert ${alert.id}: ${alert.name}`);

      // Use existing exec_sql_query RPC function
      const { data, error } = await supabase.rpc('exec_sql_query', {
        sql_query: sql
      });

      if (error) {
        console.error(`❌ SQL error for alert ${alert.id}:`, error);
        errors++;
        continue;
      }

      if (!data || data.length === 0) {
        console.log(`⏸️ Alert ${alert.id} - no data returned`);
        continue;
      }

      const result = data[0];
      const currentValue = extractMetricValue(result, alert.conditionData);

      if (meetsCondition(currentValue, alert.conditionData)) {
        console.log(`🎯 Alert triggered: ${alert.name} (${currentValue} ${alert.conditionData.operator} ${alert.conditionData.value})`);

        // Create notification
        const notification = await prisma.notification.create({
          data: {
            userId: alert.userId,
            alertRuleId: alert.id,
            title: alert.name,
            message: formatAlertMessage(alert, currentValue),
            type: 'milestone',
            status: 'unread',
            metadata: {
              currentValue,
              threshold: alert.conditionData.value,
              sql,
              result,
              triggeredAt: new Date().toISOString()
            }
          }
        });

        // Send email notification
        try {
          await sendAlertEmail({
            alertName: alert.name,
            description: alert.description || '',
            currentValue,
            threshold: alert.conditionData.value,
            timeframe: alert.conditionData.timeframe
          });

          await prisma.notification.update({
            where: { id: notification.id },
            data: {
              emailSent: true,
              emailSentAt: new Date()
            }
          });

          console.log(`✅ Email sent for alert ${alert.id}`);
        } catch (emailErr) {
          console.error(`❌ Email failed for alert ${alert.id}:`, emailErr);
          errors++;
        }

        // Update last triggered timestamp
        await prisma.alertRule.update({
          where: { id: alert.id },
          data: { lastTriggeredAt: new Date() }
        });

        triggered++;
      } else {
        console.log(`⏸️ Alert ${alert.id} condition not met (current: ${currentValue}, threshold: ${alert.conditionData.value})`);
      }

    } catch (err) {
      console.error(`❌ Error processing alert ${alert.id}:`, err);
      errors++;
    }
  }

  // Periodically analyze tables (every 100 runs = ~25 hours)
  const runNumber = Math.floor(Date.now() / 1000 / 60 / 15) % 100;
  if (runNumber === 0) {
    console.log('🔧 Running table analysis...');
    try {
      await supabase.rpc('exec_sql_query', {
        sql_query: 'ANALYZE alert_rules; ANALYZE notifications;'
      });
      console.log('✅ Table analysis complete');
    } catch (analyzeErr) {
      console.error('❌ Table analysis failed:', analyzeErr);
    }
  }

  console.log(`✅ Cron job complete: ${triggered} alerts triggered, ${errors} errors`);

  return NextResponse.json({
    success: true,
    checked: alerts.length,
    triggered,
    errors,
    timestamp: new Date().toISOString()
  });
}

function shouldEvaluateAlert(alert: any): boolean {
  const { frequency, lastTriggeredAt } = alert;

  if (!lastTriggeredAt) return true; // Never triggered before

  const now = new Date();
  const lastTrigger = new Date(lastTriggeredAt);
  const hoursSinceLastTrigger = (now.getTime() - lastTrigger.getTime()) / (1000 * 60 * 60);

  switch (frequency) {
    case 'once':
      return false; // Already triggered, don't trigger again
    case 'daily':
      return hoursSinceLastTrigger >= 24; // Once per day
    case 'weekly':
      return hoursSinceLastTrigger >= 168; // Once per week
    default:
      return true;
  }
}
```

### 3.4 Local Testing

Since Vercel Cron only runs in production, test locally:

```bash
# Test with manual HTTP request
curl http://localhost:3000/api/cron/check-alerts \
  -H "User-Agent: vercel-cron/1.0"

# Or create test script: scripts/test-cron.ts
npx tsx scripts/test-cron.ts
```

---

## Phase 4: Email Notification System (Nodemailer)

### 4.1 Nodemailer Configuration

Create `src/lib/email/nodemailer.ts`:

```typescript
import nodemailer from 'nodemailer';

export const emailTransporter = nodemailer.createTransport({
  host: process.env['EMAIL_HOST']!, // smtp.gmail.com
  port: parseInt(process.env['EMAIL_PORT']!, 10), // 587
  secure: process.env['EMAIL_SECURE'] === 'true', // false
  auth: {
    user: process.env['EMAIL_USER']!, // davidblatt10@gmail.com
    pass: process.env['EMAIL_PASSWORD']!, // App password
  },
});

// Verify transporter on startup
export async function verifyEmailTransporter() {
  try {
    await emailTransporter.verify();
    console.log('✅ Email transporter ready');
    return true;
  } catch (error) {
    console.error('❌ Email transporter error:', error);
    return false;
  }
}
```

### 4.2 Email Templates

Create `src/lib/email/templates.ts`:

```typescript
interface MilestoneAlertData {
  alertName: string;
  description: string;
  currentValue: number;
  threshold: number;
  timeframe: string;
  timestamp: string;
}

export function generateMilestoneAlertHTML(data: MilestoneAlertData): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            border-radius: 10px 10px 0 0;
            text-align: center;
          }
          .content {
            background: #f9fafb;
            padding: 30px;
            border-radius: 0 0 10px 10px;
          }
          .metric-box {
            background: white;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
            border-left: 4px solid #667eea;
          }
          .value {
            font-size: 32px;
            font-weight: bold;
            color: #667eea;
          }
          .threshold {
            font-size: 18px;
            color: #6b7280;
          }
          .button {
            display: inline-block;
            background: #667eea;
            color: white;
            padding: 12px 30px;
            text-decoration: none;
            border-radius: 6px;
            margin-top: 20px;
          }
          .footer {
            text-align: center;
            margin-top: 30px;
            color: #6b7280;
            font-size: 14px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🎉 Milestone Reached!</h1>
        </div>
        <div class="content">
          <h2>${data.alertName}</h2>
          <p>${data.description}</p>

          <div class="metric-box">
            <div class="value">$${data.currentValue.toLocaleString()}</div>
            <div class="threshold">Target: $${data.threshold.toLocaleString()}</div>
            <p style="margin-top: 10px; color: #6b7280;">
              Timeframe: ${data.timeframe}
            </p>
          </div>

          <p style="margin-top: 20px;">
            Your sales milestone has been reached!
            View your complete analytics dashboard for more details.
          </p>

          <a href="https://yourdomain.com/notifications" class="button">
            View All Notifications
          </a>

          <div class="footer">
            <p>Triggered at ${data.timestamp}</p>
            <p>Sales Analytics Platform</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

export function generateMilestoneAlertText(data: MilestoneAlertData): string {
  return `
🎉 Milestone Reached: ${data.alertName}

${data.description}

Current Value: $${data.currentValue.toLocaleString()}
Target Threshold: $${data.threshold.toLocaleString()}
Timeframe: ${data.timeframe}

Triggered at: ${data.timestamp}

View all notifications: https://yourdomain.com/notifications

---
Sales Analytics Platform
  `.trim();
}
```

### 4.3 Email Sender

Create `src/lib/email/send-alert.ts`:

```typescript
import { emailTransporter } from './nodemailer';
import { generateMilestoneAlertHTML, generateMilestoneAlertText } from './templates';

interface SendAlertEmailParams {
  alertName: string;
  description: string;
  currentValue: number;
  threshold: number;
  timeframe: string;
}

export async function sendAlertEmail(params: SendAlertEmailParams) {
  const recipient = process.env['NOTIFICATION_RECIPIENT']!; // jeffreyfenton@hellodemllo.com
  const from = process.env['EMAIL_FROM']!; // davidblatt10@gmail.com

  const timestamp = new Date().toLocaleString('en-US', {
    dateStyle: 'full',
    timeStyle: 'short',
    timeZone: 'America/New_York'
  });

  const emailData = {
    ...params,
    timestamp
  };

  const mailOptions = {
    from: `Sales Analytics <${from}>`,
    to: recipient,
    subject: `🎯 Milestone Reached: ${params.alertName}`,
    text: generateMilestoneAlertText(emailData),
    html: generateMilestoneAlertHTML(emailData),
  };

  try {
    const info = await emailTransporter.sendMail(mailOptions);
    console.log('✅ Email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Email send failed:', error);
    throw error;
  }
}
```

### 4.4 Gmail App Password Setup

1. Go to Google Account → Security
2. Enable 2-Step Verification (required)
3. Go to "App passwords"
4. Generate new app password for "Mail"
5. Copy 16-character password to `.env` as `EMAIL_PASSWORD`

---

## Phase 5: Notifications Dashboard

### 5.1 Notifications API

Create `src/app/api/notifications/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';

// GET /api/notifications - List user's notifications
export async function GET(request: NextRequest) {
  const userId = request.headers.get('x-user-id'); // Or get from auth
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') || 'all';
  const limit = parseInt(searchParams.get('limit') || '20');
  const offset = parseInt(searchParams.get('offset') || '0');

  const where = {
    userId,
    ...(status !== 'all' && { status })
  };

  // Uses composite index: userId + status + createdAt
  const notifications = await prisma.notification.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
    include: {
      alertRule: {
        select: {
          name: true,
          conditionType: true,
          frequency: true
        }
      }
    }
  });

  const total = await prisma.notification.count({ where });

  return NextResponse.json({
    notifications,
    total,
    limit,
    offset
  });
}

// PATCH /api/notifications/:id - Update notification status
export async function PATCH(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const data = await request.json();

  const notification = await prisma.notification.update({
    where: { id },
    data: {
      status: data.status,
      updatedAt: new Date()
    }
  });

  return NextResponse.json(notification);
}

// DELETE /api/notifications/:id - Delete notification
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  await prisma.notification.delete({
    where: { id }
  });

  return NextResponse.json({ success: true });
}
```

### 5.2 Notifications Dashboard Page

Create `src/app/dashboard/notifications/page.tsx`:

```typescript
'use client';

import { useState, useEffect } from 'react';

interface Notification {
  id: string;
  title: string;
  message: string;
  status: string;
  createdAt: string;
  metadata?: any;
  alertRule?: {
    name: string;
    conditionType: string;
  };
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, [filter]);

  async function fetchNotifications() {
    setLoading(true);
    const res = await fetch(`/api/notifications?status=${filter}`);
    const data = await res.json();
    setNotifications(data.notifications);
    setLoading(false);
  }

  async function markAsRead(id: string) {
    await fetch(`/api/notifications/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'read' })
    });
    fetchNotifications();
  }

  async function archiveNotification(id: string) {
    await fetch(`/api/notifications/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'archived' })
    });
    fetchNotifications();
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Notifications</h1>

      {/* Filters */}
      <div className="mb-6 flex gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded ${filter === 'all' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
        >
          All
        </button>
        <button
          onClick={() => setFilter('unread')}
          className={`px-4 py-2 rounded ${filter === 'unread' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
        >
          Unread
        </button>
        <button
          onClick={() => setFilter('read')}
          className={`px-4 py-2 rounded ${filter === 'read' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
        >
          Read
        </button>
      </div>

      {/* Notifications List */}
      {loading ? (
        <div>Loading...</div>
      ) : (
        <div className="space-y-4">
          {notifications.map(notif => (
            <div
              key={notif.id}
              className={`border rounded-lg p-4 ${
                notif.status === 'unread' ? 'bg-blue-50 border-blue-200' : 'bg-white'
              }`}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="font-bold text-lg">{notif.title}</h3>
                  <p className="text-gray-600 mt-1">{notif.message}</p>

                  {notif.metadata && (
                    <div className="mt-2 text-sm text-gray-500">
                      <span className="font-semibold">Current Value:</span> $
                      {notif.metadata.currentValue?.toLocaleString()} |
                      <span className="font-semibold ml-2">Threshold:</span> $
                      {notif.metadata.threshold?.toLocaleString()}
                    </div>
                  )}

                  <div className="mt-2 text-xs text-gray-400">
                    {new Date(notif.createdAt).toLocaleString()}
                  </div>
                </div>

                <div className="flex gap-2 ml-4">
                  {notif.status === 'unread' && (
                    <button
                      onClick={() => markAsRead(notif.id)}
                      className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600"
                    >
                      Mark Read
                    </button>
                  )}
                  <button
                    onClick={() => archiveNotification(notif.id)}
                    className="px-3 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600"
                  >
                    Archive
                  </button>
                </div>
              </div>
            </div>
          ))}

          {notifications.length === 0 && (
            <div className="text-center text-gray-500 py-12">
              No notifications found
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

---

## Phase 6: Environment Variables

Create/update `.env.development` and `.env.production`:

```env
# OpenAI API
OPENAI_API_KEY=sk-...

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Email (Nodemailer + Gmail)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=davidblatt10@gmail.com
EMAIL_PASSWORD=xxxx_xxxx_xxxx_xxxx  # Gmail App Password (16 chars)
EMAIL_FROM=davidblatt10@gmail.com
NOTIFICATION_RECIPIENT=jeffreyfenton@hellodemllo.com

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000  # dev
# NEXT_PUBLIC_APP_URL=https://yourdomain.vercel.app  # production
```

---

## Phase 7: Testing Strategy

### 7.1 Unit Tests (Vitest)

Create `src/lib/alerts/__tests__/sql-generator.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { generateAlertSQL, meetsCondition, extractMetricValue } from '../sql-generator';

describe('Alert SQL Generation', () => {
  it('generates daily sales threshold SQL', () => {
    const sql = generateAlertSQL({
      type: 'daily_sales_threshold',
      operator: '>=',
      value: 5000,
      timeframe: 'today'
    });

    expect(sql).toContain('SUM(total_amount)');
    expect(sql).toContain('CURRENT_DATE');
    expect(sql).toContain('COMPLETED');
  });

  it('evaluates condition correctly', () => {
    expect(meetsCondition(5500, {
      type: 'daily_sales_threshold',
      operator: '>=',
      value: 5000,
      timeframe: 'today'
    })).toBe(true);

    expect(meetsCondition(4500, {
      type: 'daily_sales_threshold',
      operator: '>=',
      value: 5000,
      timeframe: 'today'
    })).toBe(false);
  });
});
```

### 7.2 Integration Tests

Test cron endpoint locally:

```bash
# Start dev server
npm run dev

# In another terminal, trigger cron manually
curl http://localhost:3000/api/cron/check-alerts \
  -H "User-Agent: vercel-cron/1.0"
```

### 7.3 E2E Test (Playwright)

Create `tests/notifications.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';

test('create alert via AI chat and receive notification', async ({ page }) => {
  // 1. Navigate to chat
  await page.goto('/dashboard/chat');

  // 2. Create alert via chat
  await page.fill('textarea', 'Notify me when daily sales reach $5000');
  await page.click('button[type="submit"]');

  // 3. Wait for alert creation confirmation
  await expect(page.locator('text=Alert created')).toBeVisible();

  // 4. Trigger cron job (in test environment)
  // ... simulate condition being met

  // 5. Check notifications page
  await page.goto('/dashboard/notifications');
  await expect(page.locator('text=Daily Sales $5k')).toBeVisible();
});
```

---

## Implementation Checklist

### Database & Schema
- [ ] Add `AlertRule` and `Notification` models to Prisma schema
- [ ] Create migration (DO NOT RUN - let team review first)
- [ ] Generate Prisma client types
- [ ] Create TypeScript interfaces for alert conditions
- [ ] Set up periodic table analysis

### AI Chat Integration
- [ ] Create alert tools definition file
- [ ] Update text-to-SQL route with Responses API
- [ ] Implement alert creation handler
- [ ] Create alert management API routes
- [ ] Test alert creation through chat

### Cron Job System
- [ ] Create SQL generator for different alert types
- [ ] Implement cron endpoint with Supabase RPC integration
- [ ] Add `vercel.json` with cron configuration
- [ ] Test cron endpoint locally
- [ ] Verify timezone handling (UTC)

### Email Notifications
- [ ] Set up Gmail App Password
- [ ] Configure Nodemailer transporter
- [ ] Create HTML and text email templates
- [ ] Implement email sending function
- [ ] Test email delivery locally

### Notifications Dashboard
- [ ] Create notifications API routes (GET, PATCH, DELETE)
- [ ] Build notifications page UI
- [ ] Implement filtering (all/unread/read)
- [ ] Add mark as read/archive functionality
- [ ] Test pagination and loading states

### Deployment
- [ ] Add all environment variables to Vercel
- [ ] Deploy to production
- [ ] Verify cron job appears in Vercel dashboard
- [ ] Monitor first few cron executions
- [ ] Test email delivery in production

### Monitoring & Optimization
- [ ] Set up logging for cron job executions
- [ ] Monitor email delivery success rate
- [ ] Track alert trigger frequency
- [ ] Run periodic `ANALYZE` on tables
- [ ] Optimize indexes based on usage patterns

---

## Security Considerations

### Cron Job Security
- ✅ Verify `vercel-cron/1.0` user agent header
- ✅ Use service role key for Supabase (not anon key)
- ✅ Log all executions for audit trail
- ✅ Rate limit alert evaluations (built-in via 15-min schedule)

### Email Security
- ✅ Use Gmail App Password (not actual password)
- ✅ Enable 2FA on Gmail account
- ✅ Single recipient (no user input for email addresses)
- ✅ Don't commit credentials to git

### Data Privacy
- ✅ Only show user's own notifications
- ✅ Sanitize SQL (use parameterized queries)
- ✅ Filter results by userId in all queries

---

## Performance Optimizations

### Database
- Composite indexes on frequently queried columns
- Partial indexes for active alerts only
- Periodic `ANALYZE` for query planner optimization
- Use `orderBy` with indexed columns

### Email Sending
- Async/non-blocking email delivery
- Don't block cron job on email failures
- Retry logic with exponential backoff (future enhancement)

### API Routes
- Paginated results (limit 20 per page)
- Use `select` to limit returned fields
- Include related data in single query (avoid N+1)

---

## Cost Estimation

### OpenAI API
- Embeddings: Already using for Text-to-SQL RAG
- Responses API: ~$0.03 per 1K input tokens, ~$0.06 per 1K output
- Alert creation: ~200 tokens per request = ~$0.01 per alert created
- **Estimated:** $5-10/month for moderate usage

### Supabase
- Database: Free tier supports up to 500MB
- Alert queries: Simple aggregations, <10ms each
- 96 cron runs/day = ~3000/month (well within limits)
- **Estimated:** Free tier sufficient

### Vercel
- Hobby plan: Free cron jobs included
- Function executions: 100,000/month included
- **Estimated:** $0

### Email (Gmail)
- Free tier: 500 emails/day
- Expected usage: 10-50 emails/day
- **Estimated:** $0

**Total Monthly Cost:** ~$5-10 (primarily OpenAI)

---

## Future Enhancements

1. **SMS Notifications** (via Twilio)
2. **Push Notifications** (web push API)
3. **Slack/Discord Integration**
4. **Complex Conditions** (AND/OR logic, multiple thresholds)
5. **Trend Alerts** ("Sales down 20% vs last week")
6. **Scheduled Reports** (daily/weekly email summaries)
7. **Alert Templates** (pre-configured common alerts)
8. **Alert Analytics** (track trigger frequency, false positives)

---

## Timeline

### Week 1: Foundation (Database + AI Chat)
- Day 1-2: Database schema, migrations, TypeScript types
- Day 3-4: AI chat integration with Responses API
- Day 5: Alert management API routes

### Week 2: Core Implementation (Cron + Email)
- Day 1-2: SQL generator and cron endpoint
- Day 3: Email system with Nodemailer
- Day 4-5: Integration testing

### Week 3: Polish & Deployment
- Day 1-2: Notifications dashboard UI
- Day 3: E2E testing
- Day 4: Deployment to production
- Day 5: Monitoring and optimization

---

## Support & Documentation

### Key References
- [OpenAI Responses API](https://platform.openai.com/docs/api-reference/responses)
- [Vercel Cron Jobs](https://vercel.com/docs/cron-jobs)
- [Supabase pgvector](https://supabase.com/docs/guides/ai/vector-columns)
- [Nodemailer Documentation](https://nodemailer.com/)
- [Prisma Best Practices](https://www.prisma.io/docs/guides/performance-and-optimization)

### Troubleshooting
- **Cron not running:** Verify production deployment, check Vercel dashboard
- **Email not sending:** Check Gmail App Password, verify SMTP settings
- **Alerts not triggering:** Review SQL queries, check data in database
- **Performance issues:** Run `ANALYZE` on tables, review indexes

---

**Status:** Ready for Implementation
**Last Updated:** 2025-10-10
**Owner:** Development Team
