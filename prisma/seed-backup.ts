import { PrismaClient } from '../src/generated/prisma'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()

// Determine seed mode from environment or arguments
const SEED_MODE = process.env.SEED_MODE || (process.argv.includes('--incremental') ? 'incremental' : 'full')

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

// Load incremental data files
function loadIncrementalData() {
  const dataDir = path.join(process.cwd(), 'historical-data')

  // Load sync metadata to find incremental files
  let syncMetadata
  try {
    syncMetadata = JSON.parse(
      fs.readFileSync(path.join(dataDir, 'sync-metadata.json'), 'utf-8')
    )
  } catch (error) {
    console.log('   ℹ️ No sync metadata found - no incremental data available')
    return { ordersData: [] }
  }

  // Find unprocessed incremental files
  const allIncrementalOrders = []

  for (const syncEntry of syncMetadata.syncHistory) {
    if (syncEntry.incrementalFile) {
      try {
        const incrementalPath = path.join(dataDir, syncEntry.incrementalFile)
        const incrementalOrders = JSON.parse(fs.readFileSync(incrementalPath, 'utf-8'))
        allIncrementalOrders.push(...incrementalOrders)
      } catch (error) {
        console.warn(`   ⚠️ Could not load incremental file: ${syncEntry.incrementalFile}`)
      }
    }
  }

  return { ordersData: allIncrementalOrders }
}

async function main() {
  console.log(`🌱 Starting Square data seeding in ${SEED_MODE.toUpperCase()} mode...`)

  if (SEED_MODE === 'incremental') {
    await performIncrementalSeed()
  } else {
    await performFullSeed()
  }
}

async function performFullSeed() {
  console.log('🔄 Performing FULL seed with complete dataset...')

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

  await seedBaseData(categoriesData, itemsData, locationsData)
  await seedOrdersData(ordersData)

  console.log('\n🎉 FULL Square historical data seeding completed!')
}

async function performIncrementalSeed() {
  console.log('⚡ Performing INCREMENTAL seed with new data only...')

  // Load incremental data
  console.log('📂 Loading incremental data files...')
  const { ordersData } = loadIncrementalData()
  console.log(`   ✅ Loaded ${ordersData.length} incremental orders`)

  if (ordersData.length === 0) {
    console.log('   ℹ️ No incremental data to process')
    return
  }

  // For incremental, we only need to add new orders (locations, items, categories should already exist)
  await seedOrdersData(ordersData, true) // true = incremental mode

  console.log('\n🎉 INCREMENTAL Square data seeding completed!')
}

async function seedBaseData(categoriesData: any[], itemsData: any[], locationsData: any[]) {
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

  console.log(`📂 Created ${createdCategories.length} categories`)
  console.log(`📍 Created ${createdLocations.length} locations`)
  console.log(`🍰 Created ${createdItems.length} items`)
}

async function seedOrdersData(ordersData: any[], incremental = false) {
  const mode = incremental ? 'INCREMENTAL' : 'FULL'
  console.log(`💰 ${mode} seeding orders and line items...`)

  let totalOrdersCreated = 0
  let totalOrdersUpdated = 0
  let totalLineItemsCreated = 0

  const BATCH_SIZE = 100

  for (let i = 0; i < ordersData.length; i += BATCH_SIZE) {
    const orderBatch = ordersData.slice(i, i + BATCH_SIZE)

    for (const orderData of orderBatch) {
      try {
        let createdOrder

        if (incremental) {
          // Use upsert for incremental mode to handle duplicates
          createdOrder = await prisma.order.upsert({
            where: {
              squareOrderId: orderData.squareOrderId,
            },
            update: {
              // Update existing order with latest data
              state: orderData.state,
              totalAmount: orderData.totalAmount,
              version: orderData.version,
            },
            create: {
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

          // Check if this was a new order or updated order
          const wasCreated = !await prisma.order.findFirst({
            where: {
              squareOrderId: orderData.squareOrderId,
              version: { lt: orderData.version }
            }
          })

          if (wasCreated) {
            totalOrdersCreated++
          } else {
            totalOrdersUpdated++
          }
        } else {
          // Create mode for full seed
          createdOrder = await prisma.order.create({
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
          totalOrdersCreated++
        }

        // Handle line items
        for (const lineItemData of orderData.lineItems) {
          // Find the corresponding item by matching the category field with squareCatalogId
          const matchingItem = await prisma.item.findFirst({
            where: { squareCatalogId: lineItemData.category }
          })

          if (incremental) {
            // Use upsert for line items in incremental mode
            await prisma.lineItem.upsert({
              where: {
                squareLineItemUid: lineItemData.squareLineItemUid,
              },
              update: {
                // Update existing line item
                quantity: lineItemData.quantity,
                unitPriceAmount: lineItemData.unitPriceAmount,
                totalPriceAmount: lineItemData.totalPriceAmount,
                taxAmount: lineItemData.taxAmount,
                discountAmount: lineItemData.discountAmount,
              },
              create: {
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
          } else {
            // Create mode for full seed
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
          }
          totalLineItemsCreated++
        }

      } catch (error) {
        console.warn(`   ⚠️ Skipped order ${orderData.squareOrderId}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    const progressMsg = incremental
      ? `   📦 Processed batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(ordersData.length / BATCH_SIZE)} (${totalOrdersCreated} new, ${totalOrdersUpdated} updated, ${totalLineItemsCreated} line items)`
      : `   📦 Processed batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(ordersData.length / BATCH_SIZE)} (${totalOrdersCreated} orders, ${totalLineItemsCreated} line items)`

    console.log(progressMsg)
  }

  const summaryMsg = incremental
    ? `💰 Orders processed: ${totalOrdersCreated} new, ${totalOrdersUpdated} updated`
    : `💰 Orders created: ${totalOrdersCreated}`

  console.log(`\n✅ ${mode} orders seeding completed!`)
  console.log(summaryMsg)
  console.log(`🛒 Line items processed: ${totalLineItemsCreated}`)

  // Calculate some basic stats
  if (ordersData.length > 0) {
    const totalRevenue = ordersData.reduce((sum, order) => sum + order.totalAmount, 0)
    const avgOrderValue = totalOrdersCreated > 0 ? totalRevenue / totalOrdersCreated : 0

    console.log(`💵 Total revenue in this batch: $${(totalRevenue / 100).toFixed(2)} CAD`)
    if (avgOrderValue > 0) {
      console.log(`📈 Average order value: $${(avgOrderValue / 100).toFixed(2)} CAD`)
    }
  }
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