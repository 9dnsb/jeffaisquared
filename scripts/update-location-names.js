const { PrismaClient } = require('../src/generated/prisma')

const prisma = new PrismaClient()

// Location mapping from the image
const locationMappings = {
  'LZEVY2P88KZA8': 'De Mello Coffee - HQ (Main)',
  'LAH170A0KK47P': 'De Mello Coffee - Yonge',
  'LPSSMJYZX8X7P': 'De Mello Coffee - Bloor',
  'LT8YK4FBNGH17': 'De Mello Coffee - The Well',
  'LDPNNFWBTFB26': 'De Mello Coffee - Broadway',
  'LYJ3TVBQ23F5V': 'De Mello Coffee - Kingston'
}

async function updateLocationNames() {
  console.log('Starting location name updates...')

  try {
    // First, let's see what locations currently exist
    const existingLocations = await prisma.location.findMany()
    console.log('Current locations in database:')
    console.log(existingLocations)

    // Update or create locations with proper names
    for (const [locationId, name] of Object.entries(locationMappings)) {
      const result = await prisma.location.upsert({
        where: { locationId },
        update: { name },
        create: {
          locationId,
          name
        }
      })
      console.log(`✅ Updated/Created: ${result.locationId} -> ${result.name}`)
    }

    // Show final state
    const updatedLocations = await prisma.location.findMany()
    console.log('\nFinal locations in database:')
    console.log(updatedLocations)

  } catch (error) {
    console.error('Error updating locations:', error)
  } finally {
    await prisma.$disconnect()
  }
}

updateLocationNames()