import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ensureUserProfile } from './profile-utils'

// Mock Prisma Client
const mockPrismaClient = {
  profile: {
    findUnique: vi.fn(),
    create: vi.fn()
  }
} as any

describe('profile-utils', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    console.log = vi.fn()
    console.error = vi.fn()

    // Mock setTimeout for the trigger wait
    vi.spyOn(global, 'setTimeout').mockImplementation((callback: any) => {
      callback()
      return {} as any
    })
  })

  const testUserId = '123'
  const testEmail = 'test@example.com'
  const testFirstName = 'John'
  const testLastName = 'Doe'

  describe('ensureUserProfile', () => {
    it('should create profile manually when trigger did not create it', async () => {
      // Mock that profile doesn't exist (trigger didn't run)
      mockPrismaClient.profile.findUnique.mockResolvedValue(null)
      mockPrismaClient.profile.create.mockResolvedValue({
        id: testUserId,
        email: testEmail,
        firstName: testFirstName,
        lastName: testLastName
      })

      await ensureUserProfile(testUserId, testEmail, testFirstName, testLastName, mockPrismaClient)

      expect(mockPrismaClient.profile.findUnique).toHaveBeenCalledWith({
        where: { id: testUserId }
      })
      expect(mockPrismaClient.profile.create).toHaveBeenCalledWith({
        data: {
          id: testUserId,
          email: testEmail,
          firstName: testFirstName,
          lastName: testLastName,
        }
      })
      expect(console.log).toHaveBeenCalledWith('Trigger did not create profile, creating manually...')
      expect(console.log).toHaveBeenCalledWith('Profile created manually for user:', testUserId)
    })

    it('should handle case when profile already exists (created by trigger)', async () => {
      const existingProfile = {
        id: testUserId,
        email: testEmail,
        firstName: testFirstName,
        lastName: testLastName
      }

      // Mock that profile already exists
      mockPrismaClient.profile.findUnique.mockResolvedValue(existingProfile)

      await ensureUserProfile(testUserId, testEmail, testFirstName, testLastName, mockPrismaClient)

      expect(mockPrismaClient.profile.findUnique).toHaveBeenCalledWith({
        where: { id: testUserId }
      })
      expect(mockPrismaClient.profile.create).not.toHaveBeenCalled()
      expect(console.log).toHaveBeenCalledWith('Profile already exists (created by trigger):', existingProfile.id)
    })

    it('should handle profile creation errors gracefully', async () => {
      const profileError = new Error('Database connection failed')

      // Mock findUnique to throw an error
      mockPrismaClient.profile.findUnique.mockRejectedValue(profileError)

      // Should not throw - errors are caught and logged
      await expect(ensureUserProfile(testUserId, testEmail, testFirstName, testLastName, mockPrismaClient)).resolves.toBeUndefined()

      expect(console.error).toHaveBeenCalledWith('Error creating profile:', profileError)
    })
  })
})