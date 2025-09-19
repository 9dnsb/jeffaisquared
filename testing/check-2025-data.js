// Quick script to check 2025 data for Yonge and Bloor locations
const { PrismaClient } = require('../src/generated/prisma')
const prisma = new PrismaClient()

async function check2025Data() {
  console.log('🔍 Checking 2025 data for Yonge and Bloor locations...\n')

  // Get 2025 data for Yonge and Bloor
  const yongeAndBloor2025 = await prisma.sale.aggregate({
    _sum: {
      totalSales: true
    },
    where: {
      AND: [
        {
          date: {
            gte: new Date('2025-01-01'),
            lt: new Date('2026-01-01')
          }
        },
        {
          location: {
            name: {
              in: ['De Mello Coffee - Yonge', 'De Mello Coffee - Bloor']
            }
          }
        }
      ]
    }
  })

  // Get individual location data for 2025
  const yonge2025 = await prisma.sale.aggregate({
    _sum: {
      totalSales: true
    },
    where: {
      AND: [
        {
          date: {
            gte: new Date('2025-01-01'),
            lt: new Date('2026-01-01')
          }
        },
        {
          location: {
            name: 'De Mello Coffee - Yonge'
          }
        }
      ]
    }
  })

  const bloor2025 = await prisma.sale.aggregate({
    _sum: {
      totalSales: true
    },
    where: {
      AND: [
        {
          date: {
            gte: new Date('2025-01-01'),
            lt: new Date('2026-01-01')
          }
        },
        {
          location: {
            name: 'De Mello Coffee - Bloor'
          }
        }
      ]
    }
  })

  console.log('📊 2025 Data Results:')
  console.log(`Yonge (2025): $${yonge2025._sum.totalSales || 0}`)
  console.log(`Bloor (2025): $${bloor2025._sum.totalSales || 0}`)
  console.log(`Combined (2025): $${yongeAndBloor2025._sum.totalSales || 0}`)

  await prisma.$disconnect()
}

check2025Data().catch(console.error)