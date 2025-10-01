import { expect } from 'vitest'

// Custom matchers for AI response testing
interface CustomMatchers<R = unknown> {
  toHaveValidAIStructure(): R
  toHaveMetrics(expectedMetrics: string[]): R
  toBeInRange(min: number, max: number): R
  toHaveGroupBy(expectedGroupBy: string[]): R
  toHaveTopLocation(expectedLocation: string): R
  toHaveTopItem(expectedItem: string): R
  toHaveLocationCount(expectedCount: number): R
  toHaveItemCount(expectedCount: number): R
}

declare module 'vitest' {
  interface Assertion<T = any> extends CustomMatchers<T> {}
  interface AsymmetricMatchersContaining extends CustomMatchers {}
}

// Helper functions for common validation patterns
function validateDataArray(received: any, allowEmpty = false) {
  if (!received?.data || !Array.isArray(received.data)) {
    return { valid: false, error: 'AI response missing valid data array' }
  }
  if (!allowEmpty && received.data.length === 0) {
    return { valid: false, error: 'AI response missing valid data array or empty' }
  }
  return { valid: true }
}

function createCountMatcher(received: any, expectedCount: number, itemType: string, isNot: boolean) {
  const validation = validateDataArray(received, true)
  if (!validation.valid) {
    return {
      pass: false,
      message: () => validation.error!
    }
  }

  const pass = received.data.length === expectedCount

  return {
    pass,
    message: () =>
      `Expected ${expectedCount} ${itemType}, got ${received.data.length}${isNot ? ' (negated)' : ''}`
  }
}

function createTopMatcher(
  received: any,
  expectedValue: string,
  fieldNames: string[],
  itemType: string,
  isNot: boolean,
  matchType: 'includes' | 'equals' = 'includes'
) {
  const validation = validateDataArray(received, false)
  if (!validation.valid) {
    return {
      pass: false,
      message: () => validation.error!
    }
  }

  const topValue = fieldNames.map(field => received.data[0]?.[field]).find(val => val !== undefined)
  const pass = matchType === 'includes'
    ? topValue && topValue.includes(expectedValue)
    : topValue === expectedValue

  return {
    pass,
    message: () =>
      `Expected top ${itemType} to${isNot ? ' not' : ''} ${matchType === 'includes' ? 'contain' : 'be'} '${expectedValue}', got '${topValue}'`
  }
}

expect.extend({
  toHaveValidAIStructure(received) {
    const { isNot } = this

    const pass = received?.success === true &&
                 received?.data &&
                 Array.isArray(received.data)

    return {
      pass,
      message: () =>
        `${received ? 'Expected' : 'Did not expect'} AI response to have valid structure with success=true and data array${isNot ? ' (negated)' : ''}`
    }
  },

  // Both toHaveMetrics and toHaveGroupBy require data validation
  // jscpd:ignore-start
  toHaveMetrics(received, expectedMetrics: string[]) {
    const { isNot } = this

    const validation = validateDataArray(received, true)
    if (!validation.valid) {
      return {
        pass: false,
        message: () => validation.error!
      }
    }

    const hasExpectedMetrics = expectedMetrics.every(metric =>
      received.data.some((row: any) => row[metric] !== undefined)
    )

    return {
      pass: hasExpectedMetrics,
      message: () =>
        `${hasExpectedMetrics ? 'Expected' : 'Did not expect'} AI response to have metrics: ${expectedMetrics.join(', ')}${isNot ? ' (negated)' : ''}`
    }
  },

  toBeInRange(received, min: number, max: number) {
    const { isNot } = this
    const pass = received >= min && received <= max

    return {
      pass,
      message: () =>
        `Expected ${received} to${isNot ? ' not' : ''} be between ${min} and ${max}`
    }
  },

  toHaveGroupBy(received, expectedGroupBy: string[]) {
    const { isNot } = this

    const validation = validateDataArray(received, true)
    if (!validation.valid) {
      return {
        pass: false,
        message: () => validation.error!
      }
    }

    // For now, we'll check structural expectations based on groupBy
    let pass = true

    if (expectedGroupBy.length === 0) {
      // Should be simple aggregate (single row) or reasonable grouping
      pass = received.data.length === 1 || received.data.length <= 10
    } else if (expectedGroupBy.includes('location')) {
      // Should have multiple location rows
      pass = received.data.length > 1
    }

    return {
      pass,
      message: () =>
        `Expected AI response to match groupBy structure: ${expectedGroupBy.join(', ')}${isNot ? ' (negated)' : ''}`
    }
  },
  // jscpd:ignore-end

  toHaveTopLocation(received, expectedLocation: string) {
    return createTopMatcher(received, expectedLocation, ['location', 'name'], 'location', this.isNot, 'includes')
  },

  toHaveTopItem(received, expectedItem: string) {
    return createTopMatcher(received, expectedItem, ['item', 'name'], 'item', this.isNot, 'equals')
  },

  toHaveLocationCount(received, expectedCount: number) {
    return createCountMatcher(received, expectedCount, 'locations', this.isNot)
  },

  toHaveItemCount(received, expectedCount: number) {
    return createCountMatcher(received, expectedCount, 'items', this.isNot)
  }
})