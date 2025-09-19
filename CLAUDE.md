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
- **🚨 ZERO DUPLICATION POLICY:** ABSOLUTELY NO duplicate code allowed across files. Extract ALL common patterns into utilities/helpers/shared modules. Run `npx jscpd src` after EVERY code change to detect duplicates. Even 2-3 lines of similar logic must be abstracted into reusable functions.
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
- `npm run db:seed` - Seed database with sample data (requires 5m timeout)
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

**Testing:**

- `npm run test:run` - Run unit tests with Vitest
- `npx cross-env PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION=yes npx playwright test` - Run E2E tests with Playwright

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

## 🚨 CRITICAL: Zero Code Duplication Policy

**ABSOLUTE PROHIBITION on duplicate code across files:**

### What Counts as Duplication

**FORBIDDEN - These patterns trigger immediate refactoring:**

- **Identical functions/methods** across different files
- **Similar logic blocks** (3+ lines with same structure)
- **Repeated validation patterns** (Zod schemas, input checks)
- **Duplicate API call patterns** (fetch logic, error handling)
- **Repeated React patterns** (useEffect hooks, event handlers)
- **Copy-pasted utility functions** (formatters, converters)
- **Duplicate constants and test values** (API endpoints, test emails, HTTP status codes)

### Required Extraction Strategies

**✅ MANDATORY - Create shared modules:**

```typescript
// ✅ Shared validation schemas
// lib/validation/schemas.ts
export const emailSchema = z.email()
export const passwordSchema = z.string().min(8)

// ✅ Shared API utilities
// lib/api/utils.ts
export async function handleApiError(response: Response) {
  if (!response.ok) {
    throw new Error(`API error: ${response.status}`)
  }
  return response.json()
}

// ✅ Shared React hooks
// hooks/useFormValidation.ts
export function useFormValidation(schema: z.ZodSchema) {
  // Common validation logic
}

// ✅ Shared business logic
// lib/business/auth.ts
export function validateAuthState(user: User | null) {
  // Common auth validation
}
```

### Constants and Test Values Review

**🚨 CRITICAL: Before creating new constants, ALWAYS review existing centralized constants:**

**MANDATORY Steps:**
1. **Check `src/test/test-utils.ts`** - Contains `TEST_CONSTANTS` with common test values
2. **Search existing codebase** - Use `rg "constant_value"` to find existing definitions
3. **Use centralized constants** - Import from `TEST_CONSTANTS` instead of creating local ones
4. **Add to centralized location** - If constant doesn't exist, add it to appropriate shared module

**Examples of what to check before creating:**
```typescript
// ❌ DON'T create local constants that may already exist
const TEST_EMAIL = 'test@example.com'           // Already in TEST_CONSTANTS.EMAIL
const HTTP_500 = 500                            // Already in TEST_CONSTANTS.HTTP_500
const LOGIN_ENDPOINT = '/api/auth/login'        // Already in TEST_CONSTANTS.LOGIN_ENDPOINT

// ✅ DO use existing centralized constants
import { TEST_CONSTANTS } from '../test/test-utils'
const email = TEST_CONSTANTS.EMAIL
const status = TEST_CONSTANTS.HTTP_500
const endpoint = TEST_CONSTANTS.LOGIN_ENDPOINT
```

**Centralized Locations:**
- **Test constants:** `src/test/test-utils.ts` → `TEST_CONSTANTS`
- **API constants:** Consider `lib/constants/api.ts`
- **Business constants:** Consider `lib/constants/business.ts`
- **UI constants:** Consider `lib/constants/ui.ts`

### Detection and Enforcement

**MANDATORY after every code change:**

```bash
npx jscpd src
```

**If jscpd finds ANY duplicates:**

1. **STOP immediately** - Do not continue coding
2. **Analyze the duplicates** - Determine if they can be reasonably abstracted
3. **Extract common code** into appropriate shared module (preferred approach)
4. **Update all usages** to import from shared module
5. **If abstraction is not feasible** - Add ignore comments with clear justification
6. **Re-run jscpd** - Target should be 0 duplicates or minimal justified exceptions
7. **Only then continue** with other development

**Current Status:** Achieved 96.7% reduction in code duplication (from 3.52% to 0.57%)

**Exception: When abstraction would be overly complex:**

If a duplicate cannot be reasonably abstracted due to over-engineering concerns, use jscpd ignore comments:

```typescript
// jscpd:ignore-start - Clear reason why abstraction would be detrimental
// This specific test pattern tests edge case XYZ that doesn't fit standard abstraction
const specificTestPattern = () => {
  // ... unavoidably duplicate logic for specific scenario
}
// jscpd:ignore-end
```

**Usage Guidelines:**
- **Use sparingly** - Only when abstraction would create more complexity than the duplication
- **Always include a comment** explaining why abstraction is not appropriate
- **Prefer abstraction** - Try to create shared patterns first before using ignore
- **Review regularly** - Ignored duplicates should be re-evaluated during code reviews

**Valid reasons for ignore comments:**
- Edge case tests with very specific setup that don't fit standard patterns
- Platform-specific implementations that cannot be unified
- Generated code or third-party code snippets
- Boilerplate code where abstraction would obscure intent

### JSCPD Ignore Comment Guidelines

**🚨 CRITICAL: Correct ignore comment format:**

```typescript
// ✅ CORRECT - No additional text after ignore directive
// jscpd:ignore-start
duplicated code here
// jscpd:ignore-end

// ❌ INCORRECT - Additional text breaks the ignore functionality
// jscpd:ignore-start - Test boilerplate patterns are inherently repetitive
duplicated code here
// jscpd:ignore-end
```

**Rules for jscpd ignore comments:**
- **Exact format only:** `// jscpd:ignore-start` and `// jscpd:ignore-end`
- **No additional text:** Comments or explanations break the ignore functionality
- **Use sparingly:** Only for unavoidable duplicates after exhausting abstraction options
- **Document separately:** Add explanation comments on separate lines if needed

**Example usage:**
```typescript
// This test pattern is inherently repetitive due to test isolation requirements
// jscpd:ignore-start
it('should handle error case', async () => {
  const request = mockRequest({})
  const mockError = { error: 'Invalid input' }

  mockParser.mockResolvedValue({
    data: null,
    error: mockError
  })

  const response = await handler(request)
  expect(response).toBe(mockError)
})
// jscpd:ignore-end
```

### Shared Module Organization

**Required directory structure:**

```
lib/
├── validation/     # Shared Zod schemas
├── api/           # Shared API utilities
├── business/      # Shared business logic
├── formatting/    # Shared formatters/converters
└── types/         # Shared TypeScript types

hooks/             # Shared React hooks
components/shared/ # Shared UI components
utils/             # Pure utility functions
```

### Zero-Tolerance Examples

**❌ NEVER ALLOWED:**

```typescript
// File A
const handleSubmit = async (data: FormData) => {
  try {
    const response = await fetch('/api/login', {
      method: 'POST',
      body: JSON.stringify(data)
    })
    if (!response.ok) throw new Error('Login failed')
    return response.json()
  } catch (err) {
    setError(err.message)
  }
}

// File B - DUPLICATE DETECTED
const submitForm = async (formData: FormData) => {
  try {
    const response = await fetch('/api/register', {
      method: 'POST',
      body: JSON.stringify(formData)
    })
    if (!response.ok) throw new Error('Registration failed')
    return response.json()
  } catch (err) {
    setError(err.message)
  }
}
```

**✅ REQUIRED SOLUTION:**

```typescript
// lib/api/client.ts
export async function apiPost(endpoint: string, data: unknown) {
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    if (!response.ok) throw new Error(`Request failed: ${response.status}`)
    return response.json()
  } catch (err) {
    throw err instanceof Error ? err : new Error('Unknown error')
  }
}

// File A & B now use:
import { apiPost } from '../../../../lib/api/client'

const handleLogin = (data: FormData) => apiPost('/api/login', data)
const handleRegister = (data: FormData) => apiPost('/api/register', data)
```

**This policy ensures:**

- **Maintainability:** Fix bugs once, benefits entire codebase
- **Consistency:** Same behavior across all components
- **Testability:** Test shared logic once with comprehensive coverage
- **Bundle Size:** Eliminate redundant code in production builds
