import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { TEST_CONSTANTS } from '../src/test/test-utils'

// Mock createClient from Supabase
const mockSupabaseClient = {
  auth: { getUser: vi.fn() },
  from: vi.fn()
}

const mockCreateClient = vi.fn(() => mockSupabaseClient)

vi.mock('@supabase/supabase-js', () => ({
  createClient: mockCreateClient
}))

describe('supabase', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('should create supabase client with environment variables', async () => {
    process.env['NEXT_PUBLIC_SUPABASE_URL'] = TEST_CONSTANTS.TEST_SUPABASE_URL
    process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'] = TEST_CONSTANTS.TEST_ANON_KEY

    const supabaseModule = await import('./supabase')

    expect(mockCreateClient).toHaveBeenCalledWith(
      TEST_CONSTANTS.TEST_SUPABASE_URL,
      TEST_CONSTANTS.TEST_ANON_KEY
    )
    expect(supabaseModule.supabase).toBe(mockSupabaseClient)
    expect(supabaseModule.default).toBe(mockSupabaseClient)
  })

  it('should throw error when SUPABASE_URL is missing', async () => {
    delete process.env['NEXT_PUBLIC_SUPABASE_URL']
    process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'] = TEST_CONSTANTS.TEST_ANON_KEY

    await expect(import('./supabase')).rejects.toThrow(
      TEST_CONSTANTS.MISSING_SUPABASE_ENV_ERROR
    )
  })

  it('should throw error when SUPABASE_ANON_KEY is missing', async () => {
    process.env['NEXT_PUBLIC_SUPABASE_URL'] = TEST_CONSTANTS.TEST_SUPABASE_URL
    delete process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY']

    await expect(import('./supabase')).rejects.toThrow(
      TEST_CONSTANTS.MISSING_SUPABASE_ENV_ERROR
    )
  })

  it('should throw error when both environment variables are missing', async () => {
    delete process.env['NEXT_PUBLIC_SUPABASE_URL']
    delete process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY']

    await expect(import('./supabase')).rejects.toThrow(
      TEST_CONSTANTS.MISSING_SUPABASE_ENV_ERROR
    )
  })
})