require('dotenv').config({ path: '.env.development' })
const { PrismaClient } = require('./src/generated/prisma')

const prisma = new PrismaClient()

async function checkProgress() {
  try {
    const orderCount = await prisma.order.count()
    const locationCount = await prisma.location.count()
    const categoryCount = await prisma.category.count()

    console.log('📊 Current database status:')
    console.log(`Orders: ${orderCount}`)
    console.log(`Locations: ${locationCount}`)
    console.log(`Categories: ${categoryCount}`)

    if (orderCount > 0) {
      const latestOrder = await prisma.order.findFirst({
        orderBy: { date: 'desc' }
      })
      const earliestOrder = await prisma.order.findFirst({
        orderBy: { date: 'asc' }
      })

      console.log(`Date range: ${earliestOrder?.date} to ${latestOrder?.date}`)
    }

  } catch (error) {
    console.error('Error checking progress:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkProgress()