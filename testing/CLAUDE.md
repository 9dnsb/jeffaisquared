# Testing Instructions for Claude

## Overview

This directory contains the comprehensive testing framework for the AI-powered sales analytics system. As Claude, you should use these tools to validate the dynamic querying system and maintain high accuracy.

## Testing Commands for Claude

### Ground Truth Data Analysis

**Always run this first** to understand current database state:

```bash
cd testing
dotenv -e ../.env.development -- node test-database-queries.js
```

This establishes the "ground truth" by:
- Calculating actual sales totals and breakdowns
- Providing baseline statistics for validation
- Identifying data patterns and anomalies

### AI System Validation

**Run after ground truth analysis** to validate the complete AI pipeline:

```bash
cd testing
dotenv -e ../.env.development -- node test-ai-responses.js
```

This tests:
- Natural language parameter extraction
- Query execution accuracy
- Result formatting and ranges
- End-to-end AI performance

### Complete Testing Workflow

When validating the system or after making changes:

```bash
# 1. Reset database to clean state
npm run db:reset

# 2. Navigate to testing directory
cd testing

# 3. Analyze ground truth data
dotenv -e ../.env.development -- node test-database-queries.js

# 4. Run AI validation tests
dotenv -e ../.env.development -- node test-ai-responses.js

# 5. Return to main directory
cd ..
```

## When to Run Tests

### Required Testing Scenarios

**Always run tests when:**
- User asks you to validate the AI system
- User reports issues with query accuracy
- User requests testing of specific query patterns
- After making changes to AI prompts or query logic

**Proactively run tests when:**
- Debugging query execution problems
- Validating new test cases
- Ensuring system reliability

### Testing Strategy

1. **Start with ground truth** - Always establish baseline data first
2. **Run comprehensive AI tests** - Validate the complete pipeline
3. **Analyze failures systematically** - Debug issues methodically
4. **Never modify tests to match output** - Fix the system, not the tests

## Test Analysis and Debugging

### When Tests Pass ✅

- System is functioning correctly
- AI extraction and query execution are accurate
- Results match expected business logic

### When Tests Fail ⚠️

**Follow this debugging order:**

1. **Check Ground Truth**: Re-run `test-database-queries.js` to verify data
2. **Review AI Logs**: Look for parameter extraction errors in output
3. **Validate Query Logic**: Ensure database queries execute correctly
4. **Confirm Expectations**: Verify test ranges match current data
5. **Fix the System**: Improve AI prompts, validation, or query execution
6. **NEVER modify tests**: Tests should only change for genuine business changes

### Common Failure Patterns

**Parameter Extraction Issues:**
- AI fails to extract correct metrics or groupBy
- Location mapping errors
- Date parsing problems

**Query Execution Problems:**
- Database queries return unexpected results
- Aggregation calculations are incorrect
- Missing or invalid data filters

**Range Validation Failures:**
- Results outside expected ranges
- Business logic violations
- Data inconsistencies

## Current Test Coverage

**10 Tests Across 5 Categories:**

1. **Basic Aggregates** (2 tests)
   - "What were our total sales?"
   - "How many transactions did we have?"

2. **Location Analysis** (3 tests)
   - "Compare sales between HQ and Yonge"
   - "Which location has the highest sales?"
   - Location keyword mapping validation

3. **Product Analysis** (2 tests)
   - "What are our top 3 selling items?"
   - "How many lattes did we sell?"

4. **Time Analysis** (1 test)
   - "Show me monthly sales breakdown"

5. **Complex Queries** (2 tests)
   - Multi-dimensional analysis
   - Natural language edge cases

## Critical Testing Principles

### 🚨 NEVER MODIFY TESTS TO MATCH OUTPUT

**The ground truth is sacred.** When tests fail:

**✅ DO:**
- Investigate AI parameter extraction accuracy
- Fix bugs in query execution logic
- Improve AI prompts for better extraction
- Verify database query implementation
- Check if business logic genuinely changed

**❌ NEVER:**
- Change test expectations to match incorrect output
- Adjust ranges because AI returns different values
- Update test cases to accommodate AI mistakes
- Relax validation criteria to make tests pass

### Test Integrity Rules

Tests should only change when:
1. **Business requirements change** (new calculation methods)
2. **Database schema changes** (structural modifications)
3. **Seed data changes** (adjust ranges only, not logic)

If AI consistently fails a test, **the AI needs improvement, not the test.**

## Adding New Tests

### Test Case Structure

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

### New Test Workflow

1. **Run ground truth analysis** to understand current data
2. **Design realistic test case** based on user query patterns
3. **Calculate expected ranges** from ground truth output
4. **Add test to `test-ai-responses.js`**
5. **Validate test works correctly**
6. **Document thoroughly**

## Files in This Directory

- `test-database-queries.js` - Ground truth data analysis script
- `test-ai-responses.js` - Comprehensive AI system validation
- `CLAUDE.md` - This instruction file for Claude

## Integration with Main Testing Guide

The main project directory contains `TESTING.md` with user-facing documentation. This `CLAUDE.md` file provides Claude-specific instructions for:

- Running tests systematically
- Debugging failed tests
- Maintaining test integrity
- Expanding test coverage

Use these tools proactively to ensure the AI-powered sales analytics system maintains high accuracy and reliability.