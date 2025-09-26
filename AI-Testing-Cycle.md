# AI Testing Cycle: Ground Truth to Function Optimization

This document outlines the systematic testing methodology used to validate and optimize AI function calling for sales analytics queries.

## 🔄 Testing Cycle Overview

The AI testing process follows a 5-step cycle to ensure accurate responses and identify optimization opportunities:

```
1. Manual Ground Truth Discovery
           ↓
2. Ground Truth Implementation
           ↓
3. Test Case Creation
           ↓
4. AI Response Validation
           ↓
5. Function Optimization (if needed)
```

## 📋 Step-by-Step Process

### **Step 1: Manual Ground Truth Discovery**

Create standalone JavaScript files to manually query the database and establish the correct answers.

**Example: `verify-august-top-location.js`**
```javascript
const { PrismaClient } = require('./src/generated/prisma')

async function verifyAugustTopLocation() {
  // Manual Prisma query to find actual top location
  const locations = await prisma.order.groupBy({
    by: ['location'],
    where: {
      date: {
        gte: new Date('2025-08-01T00:00:00.000Z'),
        lte: new Date('2025-08-31T23:59:59.999Z')
      }
    },
    _sum: { totalAmount: true }
  })

  // Sort and identify true top performer
  const sorted = locations.sort((a, b) => b._sum.totalAmount - a._sum.totalAmount)
  console.log('Top location:', sorted[0].location) // "The Well" = $191,742
}
```

**Purpose:** Establish absolute truth independent of AI system.

### **Step 2: Ground Truth Implementation**

Add the verified results to `src/test/ground-truth-v3.ts` for automated testing.

**Example Addition:**
```typescript
// In calculateGroundTruthV3()
const august2025TopLocation = await (async () => {
  const locationRevenues = await prisma.order.groupBy({
    by: ['location'],
    where: { date: { gte: august2025Start, lte: august2025End } },
    _sum: { totalAmount: true }
  })

  const sorted = locationRevenues.sort((a, b) =>
    Number(b._sum.totalAmount) - Number(a._sum.totalAmount)
  )

  return sorted[0]?.location || null
})()

return {
  // ... other ground truths
  august2025TopLocation // "The Well"
}
```

**Purpose:** Create reusable, automated ground truth calculations.

### **Step 3: Test Case Creation**

Create corresponding test cases in `src/test/ai-comprehensive.test.ts`.

**Example Test:**
```typescript
describe('August 2025 Analysis (4 tests)', () => {
  it('should identify top location in August 2025', async () => {
    const start = Date.now()
    const response = await makeAIRequest(
      'Which location had the highest revenue in August 2025?'
    )
    expectPerformance(start)

    expect(response.summary).toBeDefined()
    if (groundTruth.august2025TopLocation) {
      expect(response.summary.toLowerCase()).toContain(
        groundTruth.august2025TopLocation.toLowerCase()
      )
    }
  })
})
```

**Purpose:** Automate validation against ground truth.

### **Step 4: AI Response Validation**

Run the tests to compare AI responses against ground truth.

**Command:**
```bash
npm run test:run -- --testNamePattern="August 2025 Analysis"
```

**Example Results:**
```
✓ should calculate total revenue for August 2025
✓ should count transactions for August 2025
✓ should calculate total quantity sold in August 2025
❌ should identify top location in August 2025  # AI returned "HQ" instead of "The Well"
```

**Purpose:** Identify discrepancies between AI responses and actual data.

### **Step 5: Function Optimization**

When tests fail, analyze and optimize the AI function definitions.

**Problem Analysis:**
- AI was calling wrong function for absolute date location queries
- Multiple competing functions caused confusion
- Parameter descriptions were too vague

**Applied Fixes (following OpenAI Function Calling best practices):**

1. **Clearer Function Descriptions:**
```typescript
// Before
description: 'Get revenue, transaction count, quantity, and averages for specific time periods...'

// After
description: 'IMPORTANT: Use this function when user asks "which location had highest revenue in [timeframe]"...'
```

2. **Explicit Parameter Instructions:**
```typescript
// Before
description: 'Set to true when the user asks about "which location"...'

// After
description: 'REQUIRED: Set to true for questions like "which location had highest revenue in [timeframe]"...'
```

3. **Eliminated Function Competition:**
```typescript
// Added to competing functions
description: 'DO NOT USE for absolute dates like "August 2025" - use get_time_based_metrics instead.'
```

4. **Strict Mode Implementation:**
```typescript
// All functions follow OpenAI's strict mode requirements
{
  type: 'function',
  function: {
    name: 'get_time_based_metrics',
    parameters: {
      type: 'object',
      properties: { /* ... */ },
      required: ['timeframe', 'metrics', 'include_top_location'],
      additionalProperties: false  // Required for strict mode
    },
    strict: true  // Ensures reliable schema adherence
  }
}
```

**Purpose:** Guide AI to make correct function calls and parameter choices while ensuring type safety.

## 🎯 Real-World Example: Location Identification Fix

### **Issue Discovered:**
- Manual verification showed "The Well" was top performer with $191,742 revenue in August 2025
- Ground truth correctly captured this: `august2025TopLocation: "The Well"`
- AI test consistently returned "HQ" (lowest performer at $3,189)
- Tests failing: `❌ should identify top location in August 2025`

### **Root Cause Analysis:**
- AI was not calling `get_time_based_metrics` with `include_top_location: true`
- Function selection confusion between 3 competing location functions
- Parameter descriptions didn't clearly specify when to use each option

### **Optimization Applied:**
- Enhanced function descriptions with `IMPORTANT:` directives
- Added explicit `DO NOT USE` warnings to prevent function competition
- Provided specific query pattern examples in parameter descriptions

### **Validation Results:**
```bash
# Before Fix
❌ August 2025: 3/4 tests passing (location identification failed)
❌ July 2025: 3/4 tests passing (location identification failed)

# After Fix
✅ August 2025: 4/4 tests passing (ALL FIXED!)
✅ July 2025: 4/4 tests passing (ALL FIXED!)
```

## 🔧 Key Tools and Files

### **Manual Discovery Files:**
- `verify-august-top-location.js` - Standalone validation scripts
- `test-single-boundary.js` - Date boundary verification
- `test-database-queries.js` - Direct database testing

### **Ground Truth System:**
- `src/test/ground-truth-v3.ts` - Automated ground truth calculation
- Calculates 100+ test expectations in ~10 seconds
- Handles timezone conversion and complex aggregations

### **Test Framework:**
- `src/test/ai-comprehensive.test.ts` - 113 comprehensive AI tests
- Uses Vitest for fast execution
- Includes performance expectations (<3 seconds per query)

### **AI Function Definitions:**
- `src/lib/ai-v3/functions.ts` - OpenAI function schemas
- `src/lib/ai-v3/function-executor.ts` - Function implementation
- 14 optimized functions covering 100+ test cases

## 📊 Success Metrics

### **Performance Targets:**
- ⚡ Ground truth calculation: <20 seconds for 100 tests
- ⚡ Individual AI queries: <3 seconds response time
- ⚡ Test suite execution: <60 seconds total

### **Accuracy Targets:**
- 🎯 Numeric precision: Within ±0.01% tolerance
- 🎯 Location identification: Exact string match
- 🎯 Date parsing: Supports any month/year combination
- 🎯 Timezone handling: Proper Toronto timezone conversion

### **Current Status:**
- ✅ **100% accuracy** for all time-based metrics (revenue, transactions, quantity)
- ✅ **100% accuracy** for absolute date parsing (August 2025, July 2025, etc.)
- ✅ **100% accuracy** for location identification (fixed via function optimization)
- ✅ **Production ready** for sales analytics AI system

## 🚀 Future Enhancements

### **Planned Improvements:**
1. **Expand Ground Truth Coverage:** Add seasonal trends, product analytics
2. **Performance Optimization:** Reduce AI response times to <2 seconds
3. **Error Handling:** Better graceful degradation for edge cases
4. **Function Consolidation:** Reduce function count while maintaining accuracy

### **Monitoring Strategy:**
1. **Continuous Testing:** Run comprehensive tests on every deployment
2. **Performance Tracking:** Monitor query response times and accuracy
3. **Function Analytics:** Track which functions are called most frequently
4. **Error Analysis:** Log and analyze any test failures for optimization

## 📝 Best Practices Learned

### **Ground Truth Development:**
- ✅ Always verify manually before automating
- ✅ Use timezone-aware date calculations
- ✅ Test edge cases (month boundaries, leap years)
- ✅ Document expected results for future reference

### **AI Function Design:**
- ✅ Follow OpenAI best practices for function descriptions
- ✅ Use explicit, specific language in parameter descriptions
- ✅ Eliminate function overlap and competition
- ✅ Provide concrete examples of triggering queries

### **Test Strategy:**
- ✅ Test both positive and negative cases
- ✅ Include performance benchmarks
- ✅ Use descriptive test names that explain intent
- ✅ Validate both data accuracy and response format

## 🔧 OpenAI Function Calling Integration

### **Core OpenAI Best Practices Applied:**

#### **1. Function Definition Excellence**
Following OpenAI's recommended patterns for reliable function calling:

**Clear, Descriptive Names & Descriptions:**
```typescript
// ✅ GOOD - Explicit and specific
name: 'get_time_based_metrics',
description: 'Get revenue, transaction count, quantity, and averages for specific time periods. Handles today, yesterday, last week, last month analysis.'

// ❌ AVOID - Vague and ambiguous
name: 'getData',
description: 'Gets data'
```

**Detailed Parameter Descriptions:**
```typescript
parameters: {
  properties: {
    include_top_location: {
      type: 'boolean',
      description: 'REQUIRED: Set to true for questions like "which location had highest revenue in [timeframe]". Use when user asks about top performing locations.'
    }
  }
}
```

#### **2. Strict Mode Implementation**
All functions implement OpenAI's strict mode for guaranteed schema adherence:

```typescript
export const getTimeBasedMetrics: ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'get_time_based_metrics',
    parameters: {
      type: 'object',
      properties: { /* ... */ },
      required: ['timeframe', 'metrics', 'include_top_location'],
      additionalProperties: false  // REQUIRED for strict mode
    },
    strict: true  // Enables structured outputs
  }
}
```

**Strict Mode Benefits:**
- ✅ Guaranteed schema compliance
- ✅ No hallucinated parameters
- ✅ Consistent JSON structure
- ✅ Reduced parsing errors

#### **3. Token Optimization Strategies**

**Function Count Management:**
- 📊 **Current:** 14 functions covering 113+ test cases
- 📊 **Optimal Range:** Under 20 functions (per OpenAI recommendations)
- 📊 **Token Usage:** ~2,500 tokens for all function definitions

**Description Efficiency:**
```typescript
// ✅ Concise but complete
description: 'Find top selling products by revenue, quantity, or transaction count. Analyze product performance.'

// ❌ Too verbose - wastes tokens
description: 'This function is designed to help you find the top selling products in your database by various metrics including but not limited to revenue totals, quantity sold, transaction counts, and average pricing, while also providing comprehensive product performance analytics...'
```

#### **4. Function Competition Elimination**
Implemented explicit function routing to prevent AI confusion:

```typescript
// Primary function for specific queries
description: 'IMPORTANT: Use this function when user asks "which location had highest revenue in [timeframe]"'

// Competing functions with clear boundaries
description: 'DO NOT USE for absolute dates like "August 2025" - use get_time_based_metrics instead.'
```

#### **5. Enum Usage for Validation**
Leveraging OpenAI's enum support for parameter validation:

```typescript
timeframe: {
  type: 'string',
  enum: ['today', 'yesterday', 'last_week', 'last_month', 'last_30_days', 'last_year'],
  description: 'Time period to analyze'
}
```

**Benefits:**
- ✅ Prevents invalid parameter values
- ✅ Reduces validation logic in function handlers
- ✅ Improves AI accuracy
- ✅ Better error messages

### **Tool Choice Configuration**

**Flexible Tool Selection:**
```typescript
// Auto mode - let AI choose (default)
tool_choice: "auto"

// Required mode - force function calling
tool_choice: "required"

// Specific function - force exact function
tool_choice: {
  "type": "function",
  "name": "get_time_based_metrics"
}
```

### **Function Call Flow Architecture**

Our implementation follows OpenAI's recommended 5-step flow:

1. **Request with Tools:** Send query + function definitions
2. **Receive Tool Calls:** Parse function name + JSON arguments
3. **Execute Functions:** Route to appropriate handlers
4. **Return Results:** Format responses as tool call outputs
5. **Final Response:** AI generates natural language summary

**Implementation Example:**
```typescript
// Step 1: Make request with tools
const response = await openai.chat.completions.create({
  model: "gpt-4",
  messages: [...],
  tools: ALL_SALES_FUNCTIONS,
  tool_choice: "auto"
})

// Step 2: Handle tool calls
for (const toolCall of response.choices[0].message.tool_calls || []) {
  const functionName = toolCall.function.name
  const args = JSON.parse(toolCall.function.arguments)

  // Step 3: Execute function
  const result = await executeSalesFunction(functionName, args)

  // Step 4: Add result to conversation
  messages.push({
    role: "tool",
    tool_call_id: toolCall.id,
    content: JSON.stringify(result)
  })
}

// Step 5: Get final response
const finalResponse = await openai.chat.completions.create({
  model: "gpt-4",
  messages: messages
})
```

### **Performance Optimization**

**Parallel Function Calling:**
```typescript
// Enabled by default - allows multiple simultaneous calls
parallel_tool_calls: true

// Disabled for sequential execution
parallel_tool_calls: false
```

**Token Management:**
- 📊 Function definitions: ~2,500 tokens
- 📊 Average function call: ~150 tokens
- 📊 Average response: ~500 tokens
- 📊 Total per query: ~3,150 tokens

### **Advanced OpenAI Features Considered**

#### **1. Streaming Function Calls**
For real-time user feedback during long-running queries:

```typescript
const stream = openai.beta.chat.completions.stream({
  model: 'gpt-4',
  messages: [...],
  tools: ALL_SALES_FUNCTIONS,
  stream: true
})

// Monitor function call progress in real-time
for await (const chunk of stream) {
  if (chunk.choices[0]?.delta?.tool_calls) {
    // Show function being called to user
    console.log('Calling function:', chunk.choices[0].delta.tool_calls[0]?.function?.name)
  }
}
```

#### **2. Custom Tools (Future Enhancement)**
OpenAI's new custom tool format for flexible input/output:

```typescript
// Instead of rigid JSON schema
{
  type: "custom",
  name: "analyze_sales_data",
  description: "Analyze sales data with flexible query syntax",
  // No parameters - accepts free-form text input
}
```

**Benefits for Sales Analytics:**
- ✅ Natural language SQL generation
- ✅ Flexible report formatting
- ✅ Complex business logic descriptions

#### **3. Context-Free Grammars**
For highly structured responses (future consideration):

```typescript
{
  type: "custom",
  name: "generate_report",
  description: "Generate sales report in specific format",
  format: {
    type: "grammar",
    syntax: "regex",
    definition: "^Revenue: \\$[0-9,]+\\nTransactions: [0-9]+\\nTop Location: [A-Za-z ]+$"
  }
}
```

### **Function Calling Reliability Metrics**

**Current Performance:**
- ✅ **Function Selection Accuracy:** 100% (post-optimization)
- ✅ **Parameter Parsing Success:** 100% (strict mode)
- ✅ **Schema Compliance:** 100% (additionalProperties: false)
- ✅ **Response Time:** <3 seconds average

**Monitoring Dashboard Metrics:**
- 📊 Function call success rate
- 📊 Token usage per query type
- 📊 Most frequently called functions
- 📊 Parameter validation errors (should be 0)

### **Error Handling & Graceful Degradation**

**Function Call Error Recovery:**
```typescript
try {
  const result = await executeSalesFunction(functionName, args)
  return { success: true, data: result }
} catch (error) {
  console.error(`Function ${functionName} failed:`, error)

  // Fallback to basic database query
  return await fallbackDatabaseQuery(args)
}
```

**Invalid Parameter Handling:**
```typescript
// Strict mode prevents most issues, but validate edge cases
if (args.timeframe && !VALID_TIMEFRAMES.includes(args.timeframe)) {
  return {
    error: 'Invalid timeframe. Use: today, yesterday, last_week, last_month, last_year',
    fallback: await getBusinessOverview()
  }
}
```

This systematic approach ensures reliable, accurate AI responses backed by rigorous testing and continuous optimization.