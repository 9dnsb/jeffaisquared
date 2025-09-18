/**
 * Strict type overrides for Prisma to work with ultra-strict TypeScript rules
 * These types provide better type safety than Prisma's default loose types
 */

// Strict where input that replaces Prisma's loose Record<string, unknown>
export type StrictWhereInput = Record<string, string | number | boolean | Date | null>

// Nested where input for relations
export type StrictNestedWhereInput = Record<string, string | number | boolean | Date | Record<string, string | number | boolean | Date | null> | null>

// Strict Prisma query parameters
export type StrictPrismaQuery = {
  where?: StrictWhereInput
  select?: Record<string, boolean>
  include?: Record<string, boolean>
  orderBy?: Record<string, 'asc' | 'desc'>
  take?: number
  skip?: number
}

// Strict query parameters for complex queries with nested relations
export type StrictPrismaQueryWithNested = {
  where?: StrictNestedWhereInput
  select?: Record<string, boolean | Record<string, boolean>>
  include?: Record<string, boolean | Record<string, boolean>>
  orderBy?: Record<string, 'asc' | 'desc'> | Array<Record<string, 'asc' | 'desc'>>
  take?: number
  skip?: number
}

// Strict date range filter
export type StrictDateFilter = {
  gte?: Date
  lte?: Date
  gt?: Date
  lt?: Date
  equals?: Date
}

// Strict string filter
export type StrictStringFilter = {
  equals?: string
  contains?: string
  startsWith?: string
  endsWith?: string
  mode?: 'default' | 'insensitive'
}

// Strict number filter
export type StrictNumberFilter = {
  equals?: number
  gt?: number
  gte?: number
  lt?: number
  lte?: number
}

// Common filter combinations for sales data
export type SaleFilters = {
  createdAt?: StrictDateFilter
  totalMoney?: StrictNumberFilter
  locationId?: string
  status?: string
}

export type SaleItemFilters = {
  name?: StrictStringFilter
  categoryName?: StrictStringFilter
  quantity?: StrictNumberFilter
  unitPrice?: StrictNumberFilter
}

// Type-safe query builders
export type StrictSaleQuery = StrictPrismaQueryWithNested & {
  where?: SaleFilters & StrictNestedWhereInput
}

export type StrictSaleItemQuery = StrictPrismaQueryWithNested & {
  where?: SaleItemFilters & StrictNestedWhereInput
}

// Utility type for ensuring proper query structure
export type EnsureStrictQuery<T> = T extends StrictPrismaQuery ? T : never

// Type guard to verify query structure at runtime
export function isStrictPrismaQuery(query: unknown): query is StrictPrismaQuery {
  if (typeof query !== 'object' || query === null) {
    return false
  }

  const q = query as Record<string, unknown>

  // Check if where clause exists and is properly typed
  if (q['where'] !== undefined) {
    if (typeof q['where'] !== 'object' || q['where'] === null) {
      return false
    }
  }

  // Check select clause
  if (q['select'] !== undefined) {
    if (typeof q['select'] !== 'object' || q['select'] === null) {
      return false
    }
  }

  // Check include clause
  if (q['include'] !== undefined) {
    if (typeof q['include'] !== 'object' || q['include'] === null) {
      return false
    }
  }

  return true
}

// Helper to convert loose Prisma types to strict types
export function ensureStrictQuery<T extends StrictPrismaQuery>(query: T): T {
  if (!isStrictPrismaQuery(query)) {
    throw new Error('Query does not conform to strict Prisma query structure')
  }
  return query
}