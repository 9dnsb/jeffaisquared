import { PrismaClient } from '../generated/prisma'

const TRIGGER_WAIT_TIME = 100

export async function ensureUserProfile(
  userId: string,
  email: string,
  firstName: string,
  lastName: string,
  prismaClient: PrismaClient
): Promise<void> {
  try {
    // Wait a moment for trigger to potentially run
    await new Promise(resolve => setTimeout(resolve, TRIGGER_WAIT_TIME))

    // Check if profile already exists (created by trigger)
    const existingProfile = await prismaClient.profile.findUnique({
      where: { id: userId }
    })

    if (!existingProfile) {
      console.log('Trigger did not create profile, creating manually...')
      // Create profile manually as fallback
      await prismaClient.profile.create({
        data: {
          id: userId,
          email,
          firstName,
          lastName,
        }
      })
      console.log('Profile created manually for user:', userId)
    } else {
      console.log('Profile already exists (created by trigger):', existingProfile.id)
    }
  } catch (profileError) {
    console.error('Error creating profile:', profileError)
    // Don't fail the registration if profile creation fails
    // The user is still created in Supabase Auth
  }
}