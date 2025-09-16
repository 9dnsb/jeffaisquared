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
- **🚨 CRITICAL: API/UI Separation:** ALL business logic, database operations, and external API calls MUST be in `app/api/*/route.ts` files. Client components should ONLY handle UI state and make fetch calls to API routes. NEVER put auth logic, Supabase calls, or business logic directly in client components.

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
- `npm run db:studio` - Open Prisma Studio (database GUI) - **DO NOT RUN IN CLAUDE CODE**
- `npm run db:setup-triggers` - Set up database triggers for user profile creation

**Development:**

- `npm run dev` - Start Next.js development server
- `npm run lint` - Run ESLint
- `npx tsc --noEmit` - TypeScript type checking without compilation
- `npx jscpd src` - No duplicates
- `npx tsc --noEmit && npm run lint && npx jscpd src && npm run test:run -- --coverage` - Full code quality check (ALWAYS RUN AFTER CODING)
- `npm run build` - Build for production

**Notes:**

- All database commands use `.env.development` by default
- Prisma generates client to `src/generated/prisma/`
- Seed data is based on Zapier.xlsx sample data
- ESLint ignores generated Prisma files

## Code Quality Requirements

**MANDATORY: Always run after creating/modifying code:**

```bash
npx tsc --noEmit && npm run lint && npx jscpd src && npm run test:run -- --coverage
```

This ensures:

- ✅ TypeScript compilation passes (strict mode enabled)
- ✅ No type errors or unsafe operations
- ✅ ESLint rules pass (no-any, strict TypeScript rules)
- ✅ No code duplication (jscpd detects duplicate code blocks)
- ✅ All tests pass with coverage reporting
- ✅ Code follows project standards

**Failure to run these checks will result in broken builds and deployment failures.**

## Strict Code Quality Rules

### TypeScript Configuration (tsconfig.json)

**ULTRA-STRICT MODE ENABLED - ALL must be followed:**

**Core Settings:**

- `"strict": true` - Enable all strict type checking
- `"noEmit": true` - Type checking only, no compilation
- `"allowJs": false` - TypeScript files only
- `"skipLibCheck": true` - Skip library type checking (reduces noise in error output)

**Strict Type Rules:**

- `"noImplicitAny": true` - No implicit any types allowed
- `"noImplicitThis": true` - No implicit this context
- `"noImplicitReturns": true` - All code paths must return
- `"noUncheckedIndexedAccess": true` - Array/object access must be checked
- `"exactOptionalPropertyTypes": true` - Exact optional property types
- `"noPropertyAccessFromIndexSignature": true` - Use bracket notation for index signatures

**Code Quality:**

- `"noUnusedLocals": true` - No unused variables
- `"noUnusedParameters": true` - No unused function parameters
- `"allowUnreachableCode": false` - No unreachable code
- `"forceConsistentCasingInFileNames": true` - Consistent file naming

### ESLint Rules (eslint.config.mjs)

**ZERO-TOLERANCE POLICY:**

**TypeScript Safety Rules (ALL are ERRORS):**

- `@typescript-eslint/no-explicit-any: error` - NEVER use `any` type
- `@typescript-eslint/no-unsafe-assignment: error` - No unsafe value assignments
- `@typescript-eslint/no-unsafe-call: error` - No unsafe function calls
- `@typescript-eslint/no-unsafe-member-access: error` - No unsafe property access
- `@typescript-eslint/no-unsafe-return: error` - No unsafe return values
- `@typescript-eslint/restrict-plus-operands: error` - Type-safe arithmetic only
- `@typescript-eslint/restrict-template-expressions: error` - Type-safe template literals

**Custom Rules:**

- `no-restricted-syntax` - FORBIDDEN: `unknown` keyword (use specific types)

**React Rules:**

- `react/no-unescaped-entities` - Escape HTML entities (`&apos;` not `'`)

### Writing Code Under These Rules

**✅ REQUIRED Practices:**

```typescript
// ✅ Proper error handling
try {
  const result = await someAsyncFunction()
} catch (err) {
  // Use 'err' not 'error' to avoid shadowing
  setError(err instanceof Error ? err.message : 'Unknown error')
}

// ✅ Specific types instead of any/unknown
interface ApiResponse {
  data: string[]
  error?: string
}

// ✅ Proper environment variable access
const url = process.env['NEXT_PUBLIC_SUPABASE_URL']!

// ✅ React entity escaping
<p>Don&apos;t use unescaped apostrophes</p>
```

**❌ FORBIDDEN Practices:**

```typescript
// ❌ Never use any
const data: any = response

// ❌ Never use unknown
const result: unknown = getData()

// ❌ Never shadow error variable
} catch (error) {
  // This will fail if 'error' already exists in scope
}

// ❌ Unsafe property access
const value = obj.someProperty // Without proper type checking

// ❌ Unescaped entities
<p>Don't use raw apostrophes</p>
```

**Import Paths:**

- Use relative imports from project root: `'../../../../lib/supabase'`
- Path aliases (`@/`) may not work properly in this strict setup
