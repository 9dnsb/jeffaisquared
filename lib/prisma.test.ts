import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock PrismaClient before importing
const mockPrismaClient = {
  $connect: vi.fn(),
  $disconnect: vi.fn()
}

const mockPrismaClientConstructor = vi.fn(() => mockPrismaClient)

vi.mock('../src/generated/prisma', () => ({
  PrismaClient: mockPrismaClientConstructor
}))

describe('prisma', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    // Reset global prisma
    delete (globalThis as { prisma?: unknown }).prisma
  })

  it('should create new PrismaClient instance when none exists globally', async () => {
    const prismaModule = await import('./prisma')

    expect(mockPrismaClientConstructor).toHaveBeenCalledTimes(1)
    expect(prismaModule.default).toBe(mockPrismaClient)
  })

  it('should reuse existing global PrismaClient instance when available', async () => {
    const existingPrismaClient = { existing: 'client' }
    ;(globalThis as { prisma?: unknown }).prisma = existingPrismaClient

    const prismaModule = await import('./prisma')

    expect(mockPrismaClientConstructor).not.toHaveBeenCalled()
    expect(prismaModule.default).toBe(existingPrismaClient)
  })

  it('should set global prisma in non-production environment', async () => {
    const originalEnv = process.env['NODE_ENV']
    ;(process.env as any)['NODE_ENV'] = 'development'

    const prismaModule = await import('./prisma')

    expect((globalThis as { prisma?: unknown }).prisma).toBe(mockPrismaClient)
    expect(prismaModule.default).toBe(mockPrismaClient)

    ;(process.env as any)['NODE_ENV'] = originalEnv
  })

  it('should not set global prisma in production environment', async () => {
    const originalEnv = process.env['NODE_ENV']
    ;(process.env as any)['NODE_ENV'] = 'production'

    const prismaModule = await import('./prisma')

    expect((globalThis as { prisma?: unknown }).prisma).toBeUndefined()
    expect(prismaModule.default).toBe(mockPrismaClient)

    ;(process.env as any)['NODE_ENV'] = originalEnv
  })
})