import { PrismaClient } from '../src/generated/prisma'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()

// Environment configuration
const SQUARE_BASE_URL = 'https://connect.squareup.com'
const ACCESS_TOKEN = process.env.SQUARE_ACCESS_TOKEN
const SQUARE_VERSION = '2025-08-20'

// Determine seed mode from environment or arguments
const SEED_MODE = process.env.SEED_MODE || (process.argv.includes('--incremental') ? 'incremental' : 'full')
const USE_SQUARE_API = process.env.USE_SQUARE_API === 'true' || process.argv.includes('--from-api')

console.log(`🌱 Starting seed in ${SEED_MODE} mode`)
console.log(`📊 Data source: ${USE_SQUARE_API ? 'Square API' : 'Historical files'}`)

// =======================
// SQUARE API FUNCTIONS
// =======================

async function squareApiRequest(
  endpoint: string,
  method = 'GET',
  body: any = null,
  retryCount = 0
): Promise<any> {
  const url = `${SQUARE_BASE_URL}${endpoint}`
  const options: RequestInit = {
    method,
    headers: {
      'Authorization': `Bearer ${ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
      'Square-Version': SQUARE_VERSION,
    },
  }

  if (body) {
    options.body = JSON.stringify(body)
  }

  console.log(`🔗 ${method} ${endpoint}${retryCount > 0 ? ` (retry ${retryCount})` : ''}`)

  try {
    const response = await fetch(url, options)
    const data = await response.json()

    // Handle rate limiting with exponential backoff
    if (response.status === 429) {
      const maxRetries = 5
      if (retryCount >= maxRetries) {
        throw new Error(`Rate limit exceeded after ${maxRetries} retries`)
      }

      const baseDelay = Math.pow(2, retryCount) * 1000 // 1s, 2s, 4s, 8s, 16s
      const jitter = Math.random() * 1000 // 0-1 second random jitter
      const totalDelay = baseDelay + jitter

      console.log(`⏳ Rate limited. Waiting ${Math.round(totalDelay)}ms before retry ${retryCount + 1}/${maxRetries}`)
      await new Promise((resolve) => setTimeout(resolve, totalDelay))

      return squareApiRequest(endpoint, method, body, retryCount + 1)
    }

    if (!response.ok) {
      throw new Error(`Square API error: ${response.status} ${response.statusText}`)
    }

    return data
  } catch (error: any) {
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      // Network error - retry with exponential backoff
      const maxRetries = 3
      if (retryCount >= maxRetries) {
        throw new Error(`Network error after ${maxRetries} retries: ${error.message}`)
      }

      const baseDelay = Math.pow(2, retryCount) * 1000
      const jitter = Math.random() * 1000
      const totalDelay = baseDelay + jitter

      console.log(`🔌 Network error. Waiting ${Math.round(totalDelay)}ms before retry ${retryCount + 1}/${maxRetries}`)
      await new Promise((resolve) => setTimeout(resolve, totalDelay))

      return squareApiRequest(endpoint, method, body, retryCount + 1)
    }

    throw error
  }
}

async function fetchSquareLocations() {
  console.log('📍 Fetching all locations from Square API...')
  const result = await squareApiRequest('/v2/locations')

  const locations = result.locations.map((loc: any) => ({
    squareLocationId: loc.id,
    name: loc.name,
    address: loc.address
      ? `${loc.address.address_line_1 || ''} ${loc.address.locality || ''} ${loc.address.administrative_district_level_1 || ''}`.trim()
      : null,
    timezone: loc.timezone,
    currency: loc.currency,
    status: loc.status,
    businessHours: loc.business_hours || null,
  }))

  console.log(`✅ Found ${locations.length} locations`)
  return locations
}

async function fetchSquareCatalogMapping() {
  console.log('📦 Fetching Square catalog data...')

  const catalogMapping = {
    items: new Map(),
    variations: new Map(),
    categories: new Map(),
  }

  try {
    let cursor = null

    do {
      const queryParams = new URLSearchParams({
        types: 'ITEM,ITEM_VARIATION,CATEGORY'
      })

      if (cursor) {
        queryParams.append('cursor', cursor)
      }

      const data = await squareApiRequest(`/v2/catalog/list?${queryParams}`)

      if (data.objects) {
        data.objects.forEach((obj: any) => {
          if (obj.type === 'ITEM') {
            const name = obj.item_data?.name || 'Unknown Item'
            catalogMapping.items.set(obj.id, { name })
          } else if (obj.type === 'ITEM_VARIATION') {
            const name = obj.item_variation_data?.name || 'Unknown Variation'
            catalogMapping.variations.set(obj.id, {
              name,
              itemId: obj.id,
              itemName: name,
            })
          } else if (obj.type === 'CATEGORY') {
            const name = obj.category_data?.name || 'Unknown Category'
            catalogMapping.categories.set(obj.id, { name })
          }
        })
      }

      cursor = data.cursor
    } while (cursor)

    console.log(`✅ Mapped ${catalogMapping.items.size} items, ${catalogMapping.variations.size} variations, ${catalogMapping.categories.size} categories`)
    return catalogMapping
  } catch (error) {
    console.warn(`⚠️ Failed to fetch catalog data: ${error}`)
    console.warn('Will use fallback categorization')
    return catalogMapping
  }
}

async function fetchSquareOrdersStreaming(locations: any[], days = 730) {
  console.log(`📊 Fetching ${days} days of orders from Square API (streaming mode)...`)

  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)
  const endDate = new Date()

  let totalOrdersProcessed = 0
  const totalLocations = locations.length

  // Process each location and stream directly to database
  for (let locationIndex = 0; locationIndex < locations.length; locationIndex++) {
    const location = locations[locationIndex]
    const progressPercent = Math.round((locationIndex / totalLocations) * 100)

    console.log(`\n🏪 Processing location ${locationIndex + 1}/${totalLocations} (${progressPercent}%): ${location.name}`)

    try {
      let cursor = null
      let batchCount = 0
      const BATCH_SIZE = 1000 // Process in smaller chunks

      do {
        batchCount++
        const searchBody: {
          location_ids: string[]
          query: {
            filter: {
              date_time_filter: {
                created_at: {
                  start_at: string
                  end_at: string
                }
              }
              state_filter: {
                states: string[]
              }
            }
          }
          limit: number
          cursor?: string
        } = {
          location_ids: [location.squareLocationId],
          query: {
            filter: {
              date_time_filter: {
                created_at: {
                  start_at: startDate.toISOString(),
                  end_at: endDate.toISOString(),
                },
              },
              state_filter: {
                states: ['COMPLETED'],
              },
            },
          },
          limit: BATCH_SIZE,
        }

        if (cursor) {
          searchBody.cursor = cursor
        }

        console.log(`   📦 Batch ${batchCount} for ${location.name}...`)

        const result = await squareApiRequest('/v2/orders/search', 'POST', searchBody)

        if (result.orders && result.orders.length > 0) {
          // Process this batch immediately
          const processedOrders = await processOrderBatch(result.orders, location.squareLocationId)

          // Seed this batch directly to database
          await seedOrderBatch(processedOrders)

          totalOrdersProcessed += result.orders.length
          console.log(`   ✅ Processed ${result.orders.length} orders (Total: ${totalOrdersProcessed})`)
        }

        cursor = result.cursor

        // Rate limiting: wait 200ms + jitter between requests
        const delay = 200 + Math.random() * 100
        await new Promise(resolve => setTimeout(resolve, delay))

      } while (cursor)

      console.log(`✅ Completed ${location.name}: processed all orders`)

    } catch (error) {
      console.error(`❌ Error processing location ${location.name}:`, error)
      throw error
    }
  }

  console.log(`🎉 TOTAL ORDERS PROCESSED: ${totalOrdersProcessed}`)
  return totalOrdersProcessed
}

async function processOrderBatch(orders: any[], locationId: string) {
  return orders.map((order: any) => ({
    squareOrderId: order.id,
    locationId: locationId,
    date: new Date(order.created_at),
    state: order.state,
    totalAmount: order.total_money?.amount || 0,
    currency: order.total_money?.currency || 'USD',
    version: order.version,
    source: order.source?.name || null,
  }))
}

async function seedOrderBatch(orders: any[]) {
  if (orders.length === 0) return

  try {
    await prisma.order.createMany({
      data: orders,
      skipDuplicates: true
    })
  } catch (error) {
    console.error('Error seeding order batch:', error)
    throw error
  }
}

// =======================
// FILE-BASED FUNCTIONS (EXISTING)
// =======================

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

function loadIncrementalData() {
  const dataDir = path.join(process.cwd(), 'historical-data')

  let syncMetadata
  try {
    syncMetadata = JSON.parse(
      fs.readFileSync(path.join(dataDir, 'sync-metadata.json'), 'utf-8')
    )
  } catch (error) {
    console.log('   ℹ️ No sync metadata found - no incremental data available')
    return { ordersData: [] }
  }

  const allIncrementalOrders: any[] = []

  syncMetadata.syncHistory?.forEach((sync: any) => {
    if (sync.incrementalFile) {
      try {
        const incrementalData = JSON.parse(
          fs.readFileSync(path.join(dataDir, sync.incrementalFile), 'utf-8')
        )
        if (incrementalData.orders) {
          allIncrementalOrders.push(...incrementalData.orders)
        }
      } catch (error) {
        console.warn(`⚠️ Could not load incremental file: ${sync.incrementalFile}`)
      }
    }
  })

  console.log(`📊 Loaded ${allIncrementalOrders.length} incremental orders`)
  return { ordersData: allIncrementalOrders }
}

// =======================
// SEEDING FUNCTIONS
// =======================

async function seedLocations(locations: any[]) {
  console.log(`📍 Seeding ${locations.length} locations...`)

  for (const location of locations) {
    await prisma.location.upsert({
      where: { squareLocationId: location.squareLocationId },
      update: location,
      create: location,
    })
  }

  console.log('✅ Locations seeded successfully')
}

async function seedCategories(categories: any[]) {
  console.log(`🏷️ Seeding ${categories.length} categories...`)

  for (const category of categories) {
    await prisma.category.upsert({
      where: { squareCategoryId: category.squareCategoryId },
      update: {
        name: category.name,
        isActive: category.isActive,
      },
      create: category,
    })
  }

  console.log('✅ Categories seeded successfully')
}

async function seedItems(items: any[]) {
  console.log(`🍰 Seeding ${items.length} items...`)

  const BATCH_SIZE = 100
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE)

    for (const item of batch) {
      await prisma.item.upsert({
        where: { squareItemId: item.squareItemId },
        update: {
          name: item.name,
          category: item.category,
          isActive: item.isActive,
        },
        create: item,
      })
    }

    console.log(`   ✅ Processed ${Math.min(i + BATCH_SIZE, items.length)}/${items.length} items`)
  }

  console.log('✅ Items seeded successfully')
}

async function seedOrdersInBatches(orders: any[]) {
  console.log(`📊 Seeding ${orders.length} orders in batches...`)

  const BATCH_SIZE = 5000
  let successCount = 0

  for (let i = 0; i < orders.length; i += BATCH_SIZE) {
    const batch = orders.slice(i, i + BATCH_SIZE)

    try {
      if (SEED_MODE === 'incremental') {
        // Use upsert for incremental mode
        for (const order of batch) {
          await prisma.order.upsert({
            where: { squareOrderId: order.squareOrderId },
            update: {
              state: order.state,
              totalAmount: order.totalAmount,
              version: order.version,
            },
            create: order,
          })
        }
      } else {
        // Use createMany for full mode (faster)
        await prisma.order.createMany({
          data: batch,
          skipDuplicates: true,
        })
      }

      successCount += batch.length
      const progressPercent = Math.round((successCount / orders.length) * 100)
      console.log(`   ✅ Seeded ${successCount}/${orders.length} orders (${progressPercent}%)`)

    } catch (error) {
      console.error(`❌ Error seeding batch starting at index ${i}:`, error)
      throw error
    }
  }

  console.log('✅ Orders seeded successfully')
}

// =======================
// MAIN SEEDING LOGIC
// =======================

async function main() {
  try {
    console.log('🚀 Starting Square data seeding...\n')

    if (SEED_MODE === 'full') {
      if (USE_SQUARE_API) {
        console.log('🌐 FULL SEED FROM SQUARE API')

        // Fetch catalog mapping first
        const catalogMapping = await fetchSquareCatalogMapping()

        // Fetch and seed locations
        const locations = await fetchSquareLocations()
        await seedLocations(locations)

        // Seed categories from catalog
        const categoriesData = Array.from(catalogMapping.categories.entries()).map(
          ([id, data]: [string, any]) => ({
            squareCategoryId: id,
            name: data.name,
            isActive: true,
          })
        )
        await seedCategories(categoriesData)

        // Stream orders directly to database (no memory accumulation)
        const totalOrdersProcessed = await fetchSquareOrdersStreaming(locations, 730) // 2 years

        console.log(`\n🎉 Full seed complete! Processed ${totalOrdersProcessed} orders from Square API`)

      } else {
        console.log('📁 FULL SEED FROM FILES')

        // Check if files exist
        const dataDir = path.join(process.cwd(), 'historical-data')
        if (!fs.existsSync(path.join(dataDir, 'orders.json'))) {
          throw new Error('Historical data files not found. Run with --from-api flag or fetch data first.')
        }

        const { categoriesData, itemsData, locationsData, ordersData } = loadSquareData()

        await seedLocations(locationsData)
        await seedCategories(categoriesData)
        await seedItems(itemsData)
        await seedOrdersInBatches(ordersData)

        console.log('\n🎉 Full seed complete from historical files!')
      }

    } else if (SEED_MODE === 'incremental') {
      console.log('⚡ INCREMENTAL SEED FROM FILES')

      const { ordersData } = loadIncrementalData()

      if (ordersData.length === 0) {
        console.log('ℹ️ No new incremental data to seed')
        return
      }

      await seedOrdersInBatches(ordersData)
      console.log(`\n🎉 Incremental seed complete! Added ${ordersData.length} new orders`)

    } else {
      throw new Error(`Invalid SEED_MODE: ${SEED_MODE}`)
    }

  } catch (error) {
    console.error('❌ Error during seeding:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the main function
main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })