import { PrismaClient } from '../src/generated/prisma'

const prisma = new PrismaClient()

async function main() {
  console.log('Start seeding...')

  // Create location
  const location = await prisma.location.upsert({
    where: { locationId: 'LT8YK4FBNGH17' },
    update: {},
    create: {
      locationId: 'LT8YK4FBNGH17',
      name: 'Main Location',
    },
  })

  // Create items
  const items = [
    'Latte - Matcha',
    'Brew Coffee',
    'Latte - Chai',
    'Latte',
    'Dancing Goats',
    "L'Americano",
    'Croissant - Ham &  Cheese',
    'Spinach Feta Danish',
  ]

  const createdItems = []
  for (const itemName of items) {
    const item = await prisma.item.upsert({
      where: { name: itemName },
      update: {},
      create: { name: itemName },
    })
    createdItems.push(item)
  }

  // Create sample sales with items
  const sampleSales = [
    {
      date: new Date('2025-04-28T13:53:53'),
      totalSales: 8.48,
      items: [{ name: 'Latte - Matcha', price: 8.48 }]
    },
    {
      date: new Date('2025-04-28T13:54:48'),
      totalSales: 5.08,
      items: [{ name: 'Brew Coffee', price: 5.08 }]
    },
    {
      date: new Date('2025-04-28T13:54:21'),
      totalSales: 21.28,
      items: [{ name: 'Latte - Chai', price: 8.48 }, { name: 'Latte - Matcha', price: 12.80 }]
    },
    {
      date: new Date('2025-04-28T13:56:51'),
      totalSales: 24.58,
      items: [{ name: 'Latte', price: 9.61 }, { name: 'Dancing Goats', price: 7.63 }, { name: 'Latte - Chai', price: 7.34 }]
    },
    {
      date: new Date('2025-04-28T13:57:40'),
      totalSales: 18.73,
      items: [{ name: "L'Americano", price: 6.50 }, { name: 'Croissant - Ham &  Cheese', price: 7.58 }, { name: 'Spinach Feta Danish', price: 4.65 }]
    }
  ]

  for (const saleData of sampleSales) {
    const sale = await prisma.sale.create({
      data: {
        date: saleData.date,
        locationId: location.locationId,
        totalSales: saleData.totalSales,
      },
    })

    for (const itemData of saleData.items) {
      const item = await prisma.item.findUnique({
        where: { name: itemData.name }
      })

      if (item) {
        await prisma.saleItem.create({
          data: {
            saleId: sale.id,
            itemId: item.id,
            price: itemData.price,
            quantity: 1,
          },
        })
      }
    }
  }

  console.log('Seeding finished.')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })