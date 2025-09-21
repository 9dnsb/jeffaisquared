import { PrismaClient } from '../src/generated/prisma'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()

// Load Square historical data
function loadSquareData() {
  const dataDir = path.join(process.cwd(), 'historical-data')

  const categoriesData = JSON.parse(
    fs.readFileSync(path.join(dataDir, 'categories.json'), 'utf-8')
  )

  const itemsData = JSON.parse(
    fs.readFileSync(path.join(dataDir, 'items.json'), 'utf-8')
  )

  const locationsData = JSON.parse(
    fs.readFileSync(path.join(dataDir, 'locations.json'), 'utf-8')
  )

  const ordersData = JSON.parse(
    fs.readFileSync(path.join(dataDir, 'orders.json'), 'utf-8')
  )

  return { categoriesData, itemsData, locationsData, ordersData }
}

async function main() {
  console.log('🌱 Starting Square historical data seeding...')

  // Load Square data
  console.log('📂 Loading Square historical data files...')
  const { categoriesData, itemsData, locationsData, ordersData } = loadSquareData()
  console.log(`   ✅ Loaded ${categoriesData.length} categories`)
  console.log(`   ✅ Loaded ${itemsData.length} items`)
  console.log(`   ✅ Loaded ${locationsData.length} locations`)
  console.log(`   ✅ Loaded ${ordersData.length} orders`)

  // Clean existing data (handle missing tables gracefully)
  console.log('🧹 Cleaning existing data...')
  try {
    await prisma.lineItem.deleteMany()
    console.log('   ✅ Line items cleaned')
  } catch (error) {
    console.log('   ℹ️ Line items table does not exist (fresh schema)')
  }

  try {
    await prisma.order.deleteMany()
    console.log('   ✅ Orders cleaned')
  } catch (error) {
    console.log('   ℹ️ Orders table does not exist (fresh schema)')
  }

  try {
    await prisma.item.deleteMany()
    console.log('   ✅ Items cleaned')
  } catch (error) {
    console.log('   ℹ️ Items table does not exist (fresh schema)')
  }

  try {
    await prisma.category.deleteMany()
    console.log('   ✅ Categories cleaned')
  } catch (error) {
    console.log('   ℹ️ Categories table does not exist (fresh schema)')
  }

  try {
    await prisma.location.deleteMany()
    console.log('   ✅ Locations cleaned')
  } catch (error) {
    console.log('   ℹ️ Locations table does not exist (fresh schema)')
  }

  try {
    await prisma.chatMessage.deleteMany()
    await prisma.conversation.deleteMany()
    console.log('   ✅ Chat data cleaned')
  } catch (error) {
    console.log('   ℹ️ Chat tables cleaned or do not exist')
  }

  console.log('   ✅ Data cleanup completed')

  // Create categories
  console.log('📂 Creating categories...')
  const createdCategories = []
  for (const category of categoriesData) {
    const createdCategory = await prisma.category.create({
      data: {
        squareCategoryId: category.squareCategoryId,
        name: category.name,
        isActive: category.isActive,
      },
    })
    createdCategories.push(createdCategory)
    console.log(`   ✅ ${category.name}`)
  }

  // Create locations
  console.log('📍 Creating locations...')
  const createdLocations = []
  for (const location of locationsData) {
    const createdLocation = await prisma.location.create({
      data: {
        squareLocationId: location.squareLocationId,
        name: location.name,
        address: location.address,
        timezone: location.timezone,
        currency: location.currency,
        status: location.status,
        businessHours: location.businessHours,
      },
    })
    createdLocations.push(createdLocation)
    console.log(`   ✅ ${location.name}`)
  }

  // Create items
  console.log('🍰 Creating items...')
  const createdItems = []
  for (const item of itemsData) {
    const createdItem = await prisma.item.create({
      data: {
        squareItemId: item.squareItemId,
        squareCatalogId: item.squareCatalogId,
        squareCategoryId: item.squareCategoryId,
        name: item.name,
        category: item.category,
        isActive: item.isActive,
      },
    })
    createdItems.push(createdItem)
    console.log(`   ✅ ${item.name} (${item.category})`)
  }

  // Create orders and line items
  console.log('💰 Creating orders and line items...')
  let totalOrdersCreated = 0
  let totalLineItemsCreated = 0

  const BATCH_SIZE = 100

  for (let i = 0; i < ordersData.length; i += BATCH_SIZE) {
    const orderBatch = ordersData.slice(i, i + BATCH_SIZE)

    for (const orderData of orderBatch) {
      try {
        // Create order
        const createdOrder = await prisma.order.create({
          data: {
            squareOrderId: orderData.squareOrderId,
            locationId: orderData.locationId,
            date: new Date(orderData.date),
            state: orderData.state,
            totalAmount: orderData.totalAmount,
            currency: orderData.currency,
            version: orderData.version,
            source: orderData.source,
          },
        })

        // Create line items for this order
        for (const lineItemData of orderData.lineItems) {
          // Find the corresponding item by matching the category field with squareCatalogId
          const matchingItem = createdItems.find(
            item => item.squareCatalogId === lineItemData.category
          )

          await prisma.lineItem.create({
            data: {
              squareLineItemUid: lineItemData.squareLineItemUid,
              orderId: createdOrder.id,
              itemId: matchingItem?.id || null,
              name: lineItemData.name,
              quantity: lineItemData.quantity,
              unitPriceAmount: lineItemData.unitPriceAmount,
              totalPriceAmount: lineItemData.totalPriceAmount,
              currency: lineItemData.currency,
              taxAmount: lineItemData.taxAmount,
              discountAmount: lineItemData.discountAmount,
              variations: lineItemData.variations,
              category: lineItemData.category,
            },
          })
          totalLineItemsCreated++
        }

        totalOrdersCreated++
      } catch (error) {
        console.warn(`   ⚠️ Skipped order ${orderData.squareOrderId}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    console.log(
      `   📦 Processed orders batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(
        ordersData.length / BATCH_SIZE
      )} (${totalOrdersCreated} orders, ${totalLineItemsCreated} line items)`
    )
  }

  console.log('\n🎉 Square historical data seeding completed!')
  console.log(`📂 Created ${createdCategories.length} categories`)
  console.log(`📍 Created ${createdLocations.length} locations`)
  console.log(`🍰 Created ${createdItems.length} items`)
  console.log(`💰 Created ${totalOrdersCreated} orders`)
  console.log(`🛒 Created ${totalLineItemsCreated} line items`)

  // Calculate some basic stats
  const totalRevenue = ordersData.reduce((sum, order) => sum + order.totalAmount, 0)
  const avgOrderValue = totalRevenue / totalOrdersCreated

  console.log(`💵 Total revenue: $${(totalRevenue / 100).toFixed(2)} CAD`)
  console.log(`📈 Average order value: $${(avgOrderValue / 100).toFixed(2)} CAD`)
  console.log(`🚀 Database ready for Square API integration!`)
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