# AI-Powered Sales Analytics Platform

## Project Overview

An AI-powered web platform for sales data analytics with natural language querying capabilities.

## <� Tech Stack

**Frontend:** Next.js + TypeScript (strict mode enabled, no any)

**Database:** Supabase (Postgres) with two projects:
- Production � for real user data
- Development/Test � used for both dev environment & Playwright/Vitest tests (can be reset frequently)

**ORM:** Prisma for schema + type-safe queries + migrations

**Auth:** Supabase Auth (email/password or OAuth)

**LLM Chat:** OpenAI API (GPT-4.1 / GPT-4.1-nano depending on cost) to answer natural-language queries about sales data

**Notifications:** Email alerts (via Supabase functions or transactional email provider like Resend)

**Hosting:** Vercel (serverless)

## = Data Flow

**Square API � DB:**
- Continuously sync Square transaction data (using webhooks)
- Validate incoming data with Zod before writing
- Use Prisma upsert to avoid duplicates

**DB � LLM:**
- For user queries, generate a filtered sales dataset (based on query parameters like date range, location)
- Summarize or aggregate dynamically based on query scope before sending to OpenAI to save cost
- Send results back as natural language

**Realtime:**
- Use Supabase Realtime to push updates to frontend dashboards (new sales, alerts)

**Alerts:**
- User-configurable thresholds through AI chat interface
- Send email notifications when triggered

## =� Code Quality Rules

- **Strict TypeScript**  "strict": true, "noImplicitAny": true
- **Type-safe Supabase Client:** Use supabase gen types to generate Database type
- **DRY (Don't Repeat Yourself):** Extract common code into utilities/helpers, run jscpd (code duplication detector) to catch duplicate code
- **Zod Validation:** Use Zod schemas to validate API inputs and Square webhook payloads
- **Reusable Prisma Client:** Instantiate once in lib/prisma.ts and reuse (avoid exhausting connections)
- **Environment Management:** .env.production and .env.development files for DB URLs, Supabase keys, and API keys. Use dotenv -e for running migrations/seeds/tests against the right DB

## >� Testing

**Unit Tests:** Vitest for logic & utilities
**E2E Tests:** Playwright against Dev/Test DB

Before tests, run:
- `prisma migrate reset --force`
- Seed known fake data (prisma/seed.ts)

## Development Environment Setup

- **Database:** Supabase prod and dev URLs configured in env files
- **Development workflow:** All dev and Playwright uses dev environment
- **Production:** env.production only used for database migrations with Prisma
- **Seed Data:** Using Zapier.xlsx as initial seed data (will transition to Square API in production)

## Key Features

1. **AI Chat Interface** - Open-ended query handling with dynamic data aggregation
2. **Square Integration** - Webhook-ready endpoints for real-time data sync
3. **User-Driven Alerts** - Alert configuration through AI chat
4. **Real-time Dashboard** - Live updates via Supabase Realtime
5. **Type-Safe Architecture** - End-to-end TypeScript with Prisma and Zod validation

## Architecture Priorities

1. Database foundation - Prisma schema + seed script from Excel data
2. AI chat system - Dynamic query processing + OpenAI integration
3. Webhook infrastructure - Ready for Square when credentials arrive
4. Alert framework - User-configurable through chat
5. Real-time dashboard - Supabase Realtime integration

## Development Commands

**Database Operations:**
- `npm run db:migrate:dev -- --name <migration_name>` - Create and apply development migration
- `npm run db:migrate:prod` - Deploy migrations to production
- `npm run db:generate` - Generate Prisma client
- `npm run db:seed` - Seed database with sample data
- `npm run db:reset` - Reset database and re-seed
- `npm run db:studio` - Open Prisma Studio (database GUI)

**Development:**
- `npm run dev` - Start Next.js development server
- `npm run lint` - Run ESLint
- `npm run build` - Build for production

**Notes:**
- All database commands use `.env.development` by default
- Prisma generates client to `src/generated/prisma/`
- Seed data is based on Zapier.xlsx sample data
- ESLint ignores generated Prisma files