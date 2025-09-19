import { PrismaClient } from '../src/generated/prisma'

const prisma = new PrismaClient()

// Location configurations with realistic performance multipliers
const LOCATIONS = [
  { id: 'LZEVY2P88KZA8', name: 'De Mello Coffee - HQ (Main)', multiplier: 1.2 },
  { id: 'LAH170A0KK47P', name: 'De Mello Coffee - Yonge', multiplier: 1.1 },
  { id: 'LPSSMJYZX8X7P', name: 'De Mello Coffee - Bloor', multiplier: 1.0 },
  { id: 'LT8YK4FBNGH17', name: 'De Mello Coffee - The Well', multiplier: 0.9 },
  { id: 'LDPNNFWBTFB26', name: 'De Mello Coffee - Broadway', multiplier: 0.8 },
  { id: 'LYJ3TVBQ23F5V', name: 'De Mello Coffee - Kingston', multiplier: 0.7 },
]

// Menu items with realistic pricing and popularity weights
const MENU_ITEMS = [
  { name: 'Brew Coffee', basePrice: 3.5, weight: 25 },
  { name: 'Latte', basePrice: 5.25, weight: 20 },
  { name: 'Latte - Matcha', basePrice: 6.5, weight: 15 },
  { name: 'Latte - Chai', basePrice: 5.75, weight: 12 },
  { name: "L'Americano", basePrice: 4.25, weight: 10 },
  { name: 'Dancing Goats', basePrice: 5.95, weight: 8 },
  { name: 'Croissant - Ham & Cheese', basePrice: 7.5, weight: 6 },
  { name: 'Spinach Feta Danish', basePrice: 6.25, weight: 4 },
]

// Deterministic random number generator using Linear Congruential Generator (LCG)
class DeterministicRandom {
  private seed: number

  constructor(seed: number) {
    this.seed = seed
  }

  // LCG parameters (from Numerical Recipes)
  next(): number {
    this.seed = (this.seed * 1664525 + 1013904223) % Math.pow(2, 32)
    return this.seed / Math.pow(2, 32)
  }

  float(min: number, max: number): number {
    return this.next() * (max - min) + min
  }

  int(min: number, max: number): number {
    return Math.floor(this.float(min, max + 1))
  }

  // Weighted random selection
  weightedChoice<T>(items: T[], weights: number[]): T {
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0)
    let random = this.next() * totalWeight

    for (let i = 0; i < items.length; i++) {
      random -= weights[i]
      if (random <= 0) {
        return items[i]
      }
    }
    return items[items.length - 1]
  }
}

function getSeasonalMultiplier(date: Date): number {
  const month = date.getMonth()
  // Winter (Dec, Jan, Feb) - higher hot drink sales
  if (month === 11 || month === 0 || month === 1) return 1.2
  // Spring (Mar, Apr, May) - moderate sales
  if (month >= 2 && month <= 4) return 1.0
  // Summer (Jun, Jul, Aug) - lower hot drink sales
  if (month >= 5 && month <= 7) return 0.8
  // Fall (Sep, Oct, Nov) - increasing sales
  return 1.1
}

function getDayOfWeekMultiplier(date: Date): number {
  const dayOfWeek = date.getDay()
  // Weekend: Saturday (6), Sunday (0)
  if (dayOfWeek === 0 || dayOfWeek === 6) return 0.7
  // Weekdays
  return 1.0
}

// Create a deterministic seed based on date
function createDateSeed(date: Date): number {
  const year = date.getFullYear()
  const month = date.getMonth()
  const day = date.getDate()
  return year * 10000 + month * 100 + day
}

async function main() {
  console.log('🌱 Starting deterministic seed data generation...')

  // Clean existing data (preserves database structure, much faster than reset)
  console.log('🧹 Cleaning existing data...')
  await prisma.saleItem.deleteMany()
  await prisma.sale.deleteMany()
  await prisma.item.deleteMany()
  await prisma.location.deleteMany()
  await prisma.chatMessage.deleteMany()
  await prisma.conversation.deleteMany()
  console.log('   ✅ Existing data cleaned')

  // Create all locations
  console.log('📍 Creating locations...')
  const createdLocations = []
  for (const location of LOCATIONS) {
    const loc = await prisma.location.upsert({
      where: { locationId: location.id },
      update: { name: location.name },
      create: {
        locationId: location.id,
        name: location.name,
      },
    })
    createdLocations.push({ ...loc, multiplier: location.multiplier })
    console.log(`   ✅ ${location.name}`)
  }

  // Create all menu items
  console.log('🍰 Creating menu items...')
  const createdItems: Array<{
    id: string
    name: string
    basePrice: number
    weight: number
  }> = []
  for (const item of MENU_ITEMS) {
    const menuItem = await prisma.item.upsert({
      where: { name: item.name },
      update: {},
      create: { name: item.name },
    })
    createdItems.push({
      id: menuItem.id,
      name: menuItem.name,
      basePrice: item.basePrice,
      weight: item.weight,
    })
    console.log(`   ✅ ${item.name} - $${item.basePrice}`)
  }

  // Generate deterministic sample data (6 months worth, batch processed)
  console.log('💰 Generating deterministic sales data...')

  const startDate = new Date('2024-03-01')
  const endDate = new Date('2025-09-21')
  const salesBatch: any[] = []
  const saleItemsBatch: any[] = []

  let totalSales = 0
  let totalTransactions = 0

  // Generate all sales data deterministically
  const currentDate = new Date(startDate)
  while (currentDate <= endDate) {
    const dateSeed = createDateSeed(currentDate)
    const dayRng = new DeterministicRandom(dateSeed)

    const isWeekend = currentDate.getDay() === 0 || currentDate.getDay() === 6

    // Deterministic day skipping (using the same logic but with deterministic random)
    if (dayRng.next() < (isWeekend ? 0.1 : 0.02)) {
      currentDate.setDate(currentDate.getDate() + 1)
      continue
    }

    const seasonalMultiplier = getSeasonalMultiplier(currentDate)
    const dayMultiplier = getDayOfWeekMultiplier(currentDate)

    // Generate sales for each location on this day
    for (let locationIndex = 0; locationIndex < createdLocations.length; locationIndex++) {
      const location = createdLocations[locationIndex]

      // Create a unique seed for each location on each day
      const locationSeed = dateSeed + (locationIndex + 1) * 1000
      const locationRng = new DeterministicRandom(locationSeed)

      // Deterministic transaction count: 3-12 transactions per location per day
      const dailyTransactions = Math.round(
        locationRng.float(3, 12) *
          seasonalMultiplier *
          dayMultiplier *
          location.multiplier
      )

      for (let i = 0; i < dailyTransactions; i++) {
        // Create unique seed for each transaction
        const transactionSeed = locationSeed + i * 100
        const transactionRng = new DeterministicRandom(transactionSeed)

        const hour = transactionRng.int(7, 20)
        const minute = transactionRng.int(0, 59)
        const saleDate = new Date(currentDate)
        saleDate.setHours(hour, minute)

        // Deterministic item selection (1-3 items per sale)
        const itemCount = transactionRng.int(1, 3)
        let saleTotal = 0
        const tempSaleId = `temp_${totalTransactions}`

        for (let j = 0; j < itemCount; j++) {
          // Create unique seed for each item in transaction
          const itemSeed = transactionSeed + j * 10
          const itemRng = new DeterministicRandom(itemSeed)

          // Use weighted selection for items
          const weights = createdItems.map(item => item.weight)
          const selectedItem = itemRng.weightedChoice(createdItems, weights)

          const quantity = itemRng.int(1, 2)
          const price = selectedItem.basePrice * itemRng.float(0.9, 1.1) * quantity

          saleTotal += price

          saleItemsBatch.push({
            tempSaleId,
            itemId: selectedItem.id,
            price: Math.round(price * 100) / 100,
            quantity,
          })
        }

        // Add tax
        saleTotal *= 1.13

        salesBatch.push({
          tempSaleId,
          date: new Date(saleDate),
          locationId: location.locationId,
          totalSales: Math.round(saleTotal * 100) / 100,
        })

        totalSales += saleTotal
        totalTransactions++
      }
    }

    currentDate.setDate(currentDate.getDate() + 1)
  }

  console.log(
    `💾 Generated ${totalTransactions} transactions deterministically. Now bulk inserting...`
  )

  // Batch insert sales (much faster than individual creates)
  const BATCH_SIZE = 500
  const salesCreated: any[] = []

  for (let i = 0; i < salesBatch.length; i += BATCH_SIZE) {
    const batch = salesBatch.slice(i, i + BATCH_SIZE)

    const createdSales = await Promise.all(
      batch.map((sale) =>
        prisma.sale.create({
          data: {
            date: sale.date,
            locationId: sale.locationId,
            totalSales: sale.totalSales,
          },
        })
      )
    )

    salesCreated.push(
      ...createdSales.map((sale, index) => ({
        realId: sale.id,
        tempId: batch[index].tempSaleId,
      }))
    )

    console.log(
      `   📦 Inserted sales batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(
        salesBatch.length / BATCH_SIZE
      )}`
    )
  }

  // Create sale items mapping real sale IDs
  console.log('🛒 Inserting sale items...')
  const saleItemsToCreate = saleItemsBatch.map((item) => {
    const saleMapping = salesCreated.find((s) => s.tempId === item.tempSaleId)
    return {
      saleId: saleMapping!.realId,
      itemId: item.itemId,
      price: item.price,
      quantity: item.quantity,
    }
  })

  for (let i = 0; i < saleItemsToCreate.length; i += BATCH_SIZE) {
    const batch = saleItemsToCreate.slice(i, i + BATCH_SIZE)

    await Promise.all(
      batch.map((item) => prisma.saleItem.create({ data: item }))
    )

    console.log(
      `   🛒 Inserted sale items batch ${
        Math.floor(i / BATCH_SIZE) + 1
      }/${Math.ceil(saleItemsToCreate.length / BATCH_SIZE)}`
    )
  }

  console.log('\n🎉 Deterministic seeding completed!')
  console.log(
    `📊 Generated ${totalTransactions} transactions across ${LOCATIONS.length} locations`
  )
  console.log(`💵 Total sales: $${totalSales.toFixed(2)}`)
  console.log(
    `📈 Average transaction: $${(totalSales / totalTransactions).toFixed(2)}`
  )
  console.log(
    `🔒 Deterministic: This seed will generate identical data every time`
  )
  console.log(
    `🚀 Next time: Just run 'npm run db:seed' - same data guaranteed!`
  )
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