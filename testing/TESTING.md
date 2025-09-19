# AI-Powered Sales Analytics Testing Guide

## Overview

This project uses a comprehensive testing framework to validate the AI-powered dynamic querying system. The framework combines ground truth data analysis with end-to-end AI validation to ensure both accuracy and user experience quality.

## Testing Architecture

```
User Query → AI Parameter Extraction → Query Execution → Database Results → AI Summary
     ↓                ↓                     ↓                 ↓              ↓
[test-ai-responses.js tests the full pipeline]    [test-database-queries.js validates data]
```

## Quick Start Commands

### For Claude Code Users

**Run Ground Truth Analysis:**
```bash
cd testing
dotenv -e ../.env.development -- node test-database-queries.js
```

**Run AI System Tests:**
```bash
cd testing
dotenv -e ../.env.development -- node test-ai-responses.js
```

**Full Testing Workflow:**
```bash
# 1. Reset and seed database
npm run db:reset

# 2. Analyze ground truth data
cd testing && dotenv -e ../.env.development -- node test-database-queries.js

# 3. Run AI validation tests
dotenv -e ../.env.development -- node test-ai-responses.js

# 4. Return to main directory
cd ..
```

## Testing Components

### 1. `testing/test-database-queries.js` - Ground Truth Analysis

**Purpose:** Establishes baseline data patterns by directly querying the database.

**What it does:**
- Calculates actual sales totals, averages, and breakdowns
- Provides statistics for test expectation calibration
- Validates data integrity and consistency

**Sample Output:**
```
📊 Overall Statistics:
Total Transactions: 20,640
Total Sales: $392,536.61
Average Transaction: $19.02

📍 Sales by Location:
HQ: $82,342.27 (21.0%) - 4,349 transactions
Yonge: $75,241.65 (19.2%) - 3,939 transactions
```

**When to run:**
- After database seeding
- When calibrating test expectations
- To debug data discrepancies

### 2. `testing/test-ai-responses.js` - AI System Validation

**Purpose:** Tests the complete AI pipeline from natural language to structured results.

**What it validates:**
- Parameter extraction accuracy
- Query execution correctness
- Result format and data ranges
- User experience quality

**Test Structure:**
```javascript
{
  id: 'test_identifier',
  prompt: "Natural language query",
  expectedRange: { min: 1000, max: 2000 },
  expectedMetrics: ['revenue', 'count'],
  expectedGroupBy: ['location']
}
```

## Testing Workflow for Claude Code

### Step 1: Prepare Test Environment

```bash
# Ensure clean database state
npm run db:reset

# Verify database is seeded with test data
npm run db:seed
```

### Step 2: Establish Ground Truth

```bash
cd testing
dotenv -e ../.env.development -- node test-database-queries.js
```

This will output current database statistics. Use these to:
- Verify test data is loaded correctly
- Calibrate expected ranges for AI tests
- Identify any data anomalies

### Step 3: Run AI Validation Tests

```bash
# While still in testing directory
dotenv -e ../.env.development -- node test-ai-responses.js
```

This will:
- Test 10+ natural language queries
- Validate AI parameter extraction
- Check query execution accuracy
- Report pass/fail results with detailed logs

### Step 4: Analyze Results

**If tests pass:** ✅ AI system is working correctly

**If tests fail:** ⚠️ Follow the debugging workflow:

1. **Check extraction logs** - Look for parameter extraction errors
2. **Verify business logic** - Ensure query execution matches expectations
3. **Compare with ground truth** - Re-run database analysis if needed
4. **Fix the system** - Improve AI prompts, validation, or query logic
5. **Never modify tests** - Tests should only change for genuine business requirement changes

## Current Test Coverage

**10 Tests Across 5 Categories:**

1. **Basic Aggregates** (2 tests)
   - Total sales queries
   - Transaction counting

2. **Location Analysis** (3 tests)
   - Location comparisons
   - Best performing locations
   - Location keyword mapping

3. **Product Analysis** (2 tests)
   - Top selling items
   - Specific item quantities

4. **Time Analysis** (1 test)
   - Monthly breakdowns

5. **Complex Queries** (2 tests)
   - Multi-dimensional analysis
   - Natural language edge cases

## Adding New Tests

### Test Case Template

```javascript
{
  id: 'descriptive_test_id',
  category: 'location|product|time|aggregate|complex',
  prompt: "Natural language query exactly as user would type",
  description: "What this test validates",

  // Expected AI extraction
  expectedMetrics: ['revenue', 'count'],
  expectedGroupBy: ['location'],

  // Expected results
  expectedRange: { min: 1000, max: 2000 },

  // Validation rules
  allowableVariance: 0.1, // 10% tolerance

  // Documentation
  businessLogic: "Why this result is expected",
  dataSource: "Based on ground truth analysis"
}
```

### Workflow for New Tests

1. **Run ground truth analysis** to understand current data patterns
2. **Design realistic test case** based on actual user queries
3. **Calculate expected ranges** from ground truth data
4. **Add test to `test-ai-responses.js`**
5. **Run test to verify it works**
6. **Document the test thoroughly**

## 🚨 Critical Testing Principles

### NEVER Modify Tests to Match Output

**✅ DO:**
- Fix bugs in AI parameter extraction
- Improve query execution logic
- Enhance AI prompts for better accuracy
- Verify business logic implementation

**❌ NEVER:**
- Change test expectations to match incorrect AI output
- Relax validation criteria to make failing tests pass
- Update ranges just because AI returns different values

**The ground truth is sacred.** Tests should only change when:
1. Business requirements genuinely change
2. Database schema changes
3. Seed data changes (adjust ranges only)

### Debugging Failed Tests

When tests fail, follow this order:

1. **Verify Ground Truth** - Re-run database analysis
2. **Check AI Logs** - Review parameter extraction accuracy
3. **Test Query Logic** - Ensure database queries work correctly
4. **Validate Ranges** - Confirm expectations match current data
5. **Fix the System** - Improve AI/validation/queries (NOT tests)
6. **Update Tests** - Only if business requirements changed

## Environment Setup

**Required Environment Variables:**
- Database connection configured in `.env.development`
- OpenAI API key for AI parameter extraction
- Proper Prisma client generation

**Dependencies:**
- Node.js environment with Prisma access
- `dotenv-cli` for environment management
- All project dependencies installed

## Files Location

```
testing/
├── test-database-queries.js    # Ground truth analysis
├── test-ai-responses.js        # AI system validation
└── TESTING_FRAMEWORK.md       # Detailed framework documentation
```

## Integration with Development

**Before major changes:**
```bash
cd testing && dotenv -e ../.env.development -- node test-ai-responses.js
```

**After implementing new features:**
```bash
# Full validation workflow
npm run db:reset
cd testing
dotenv -e ../.env.development -- node test-database-queries.js
dotenv -e ../.env.development -- node test-ai-responses.js
cd ..
```

**For continuous validation:**
- Run tests after any AI prompt changes
- Validate after query logic modifications
- Test before deploying parameter extraction updates

This testing framework ensures the AI system maintains high accuracy and reliability as it evolves.