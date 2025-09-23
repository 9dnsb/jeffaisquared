import { PrismaClient } from '../src/generated/prisma'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()

// Environment configuration
const SQUARE_BASE_URL = 'https://connect.squareup.com'
const ACCESS_TOKEN = process.env.SQUARE_ACCESS_TOKEN
const SQUARE_VERSION = '2025-08-20'

// Determine seed mode from environment or arguments
const SEED_MODE =
  process.env.SEED_MODE ||
  (process.argv.includes('--incremental') ? 'incremental' : 'full')
const USE_SQUARE_API =
  process.env.USE_SQUARE_API === 'true' || process.argv.includes('--from-api')

console.log(`🌱 Starting seed in ${SEED_MODE} mode`)
console.log(
  `📊 Data source: ${USE_SQUARE_API ? 'Square API' : 'Historical files'}`
)

// =======================
// SQUARE API FUNCTIONS
// =======================

// Fetch Square catalog data for proper categorization
async function fetchSquareCatalogMapping() {
  console.log('📚 Fetching Square catalog for proper categorization...')

  const catalogMapping = {
    items: new Map(),
    variations: new Map(),
    categories: new Map(),
  }

  try {
    // Get all catalog objects
    let allObjects: any[] = []
    let cursor = null

    do {
      const endpoint = cursor
        ? `/v2/catalog/list?cursor=${cursor}`
        : '/v2/catalog/list'

      const result = await squareApiRequest(endpoint)

      if (result.objects) {
        allObjects = allObjects.concat(result.objects)
      }

      cursor = result.cursor
    } while (cursor)

    console.log(`✅ Retrieved ${allObjects.length} catalog objects`)

    // Process catalog objects
    allObjects.forEach((obj: any) => {
      if (obj.type === 'ITEM') {
        const name = obj.item_data?.name || 'Unknown Item'
        // Handle both single category_id and categories array (Square supports both)
        let categoryIds: string[] = []
        if (obj.item_data?.categories) {
          // Categories array - extract just the IDs from the objects
          categoryIds = obj.item_data.categories.map((cat: any) =>
            typeof cat === 'string' ? cat : cat.id
          )
        } else if (obj.item_data?.category_id) {
          // Single category_id
          categoryIds = [obj.item_data.category_id]
        }
        catalogMapping.items.set(obj.id, { name, categoryIds })

        // Extract variations from this item
        if (obj.item_data?.variations) {
          obj.item_data.variations.forEach((variation: any) => {
            catalogMapping.variations.set(variation.id, {
              name: variation.item_variation_data?.name || 'Regular',
              itemId: obj.id,
              itemName: name,
            })
          })
        }
      } else if (obj.type === 'CATEGORY') {
        const name = obj.category_data?.name || 'Unknown Category'
        catalogMapping.categories.set(obj.id, { name })
      }
    })

    console.log(
      `✅ Mapped ${catalogMapping.items.size} items, ${catalogMapping.variations.size} variations, ${catalogMapping.categories.size} categories`
    )
    return catalogMapping
  } catch (error: any) {
    console.warn(`⚠️ Failed to fetch catalog data: ${error.message}`)
    console.warn('Will use fallback categorization')
    return catalogMapping
  }
}

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
      Authorization: `Bearer ${ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
      'Square-Version': SQUARE_VERSION,
    },
  }

  if (body) {
    options.body = JSON.stringify(body)
  }

  console.log(
    `🔗 ${method} ${endpoint}${retryCount > 0 ? ` (retry ${retryCount})` : ''}`
  )

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

      console.log(
        `⏳ Rate limited. Waiting ${Math.round(totalDelay)}ms before retry ${
          retryCount + 1
        }/${maxRetries}`
      )
      await new Promise((resolve) => setTimeout(resolve, totalDelay))

      return squareApiRequest(endpoint, method, body, retryCount + 1)
    }

    if (!response.ok) {
      throw new Error(
        `Square API error: ${response.status} ${response.statusText}`
      )
    }

    return data
  } catch (error: any) {
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      // Network error - retry with exponential backoff
      const maxRetries = 3
      if (retryCount >= maxRetries) {
        throw new Error(
          `Network error after ${maxRetries} retries: ${error.message}`
        )
      }

      const baseDelay = Math.pow(2, retryCount) * 1000
      const jitter = Math.random() * 1000
      const totalDelay = baseDelay + jitter

      console.log(
        `🔌 Network error. Waiting ${Math.round(totalDelay)}ms before retry ${
          retryCount + 1
        }/${maxRetries}`
      )
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
      ? `${loc.address.address_line_1 || ''} ${loc.address.locality || ''} ${
          loc.address.administrative_district_level_1 || ''
        }`.trim()
      : null,
    timezone: loc.timezone,
    currency: loc.currency,
    status: loc.status,
    businessHours: loc.business_hours || null,
  }))

  console.log(`✅ Found ${locations.length} locations`)
  return locations
}

async function fetchSquareOrdersStreaming(
  locations: any[],
  days: number | null = 730,
  catalogMapping: any = null
) {
  if (days === null) {
    console.log(
      '📊 Fetching ALL-TIME orders from Square API (streaming mode)...'
    )
  } else {
    console.log(
      `📊 Fetching ${days} days of orders from Square API (streaming mode)...`
    )
  }

  const startDate =
    days === null
      ? new Date('2000-01-01')
      : (() => {
          const date = new Date()
          date.setDate(date.getDate() - days)
          return date
        })()
  const endDate = new Date()

  let totalOrdersProcessed = 0
  const totalLocations = locations.length

  // Process each location and stream directly to database
  for (
    let locationIndex = 0;
    locationIndex < locations.length;
    locationIndex++
  ) {
    const location = locations[locationIndex]
    const progressPercent = Math.round((locationIndex / totalLocations) * 100)

    console.log(
      `\n🏪 Processing location ${
        locationIndex + 1
      }/${totalLocations} (${progressPercent}%): ${location.name}`
    )

    try {
      let cursor = null
      let batchCount = 0
      const BATCH_SIZE = 1000 // Process in smaller chunks

      do {
        batchCount++
        const searchBody: any = {
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

        const result = await squareApiRequest(
          '/v2/orders/search',
          'POST',
          searchBody
        )

        if (result.orders && result.orders.length > 0) {
          // Process this batch immediately
          const processedOrders = await processOrderBatch(
            result.orders,
            location.squareLocationId
          )

          // Seed this batch directly to database
          await seedOrderBatch(processedOrders, catalogMapping)

          totalOrdersProcessed += result.orders.length
          console.log(
            `   ✅ Processed ${result.orders.length} orders (Total: ${totalOrdersProcessed})`
          )
        }

        cursor = result.cursor

        // Rate limiting: wait 200ms + jitter between requests
        const delay = 200 + Math.random() * 100
        await new Promise((resolve) => setTimeout(resolve, delay))
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
    lineItems: (order.line_items || [])
      .filter((item: any) => item.name && item.name.trim()) // Filter out items without valid names
      .map((item: any) => ({
        squareLineItemUid: item.uid,
        name: item.name.trim(),
        quantity: parseInt(item.quantity) || 1,
        unitPriceAmount: item.base_price_money?.amount || 0,
        totalPriceAmount: item.total_money?.amount || 0,
        currency: item.total_money?.currency || 'USD',
        taxAmount: item.total_tax_money?.amount || 0,
        discountAmount: item.total_discount_money?.amount || 0,
        variations: item.variation_name || null,
        category: item.catalog_object_id || null,
      })),
  }))
}

// Extract unique items from orders using Square catalog data for proper categorization
async function extractUniqueItems(orders: any[], catalogMapping: any) {
  console.log('🍰 Extracting unique items with Square catalog data...')

  const itemsMap = new Map()

  orders.forEach((order: any) => {
    order.lineItems.forEach((lineItem: any) => {
      const itemName = lineItem.name || 'Unknown Item'
      if (!itemsMap.has(itemName)) {
        // Get real category from Square catalog
        const variation = catalogMapping.variations.get(lineItem.category)
        const parentItem = variation
          ? catalogMapping.items.get(variation.itemId)
          : null

        // Get the first category from the categories array (Square allows multiple but we found none in practice)
        const categoryIds = parentItem?.categoryIds || []
        const primaryCategoryId = categoryIds.length > 0 ? categoryIds[0] : null
        const squareCategory = primaryCategoryId
          ? catalogMapping.categories.get(primaryCategoryId)
          : null

        itemsMap.set(itemName, {
          name: itemName,
          category: squareCategory?.name || categorizeItem(itemName), // Use Square category name or fallback
          squareCatalogId: lineItem.category,
          squareItemId: variation?.itemId || null,
          squareCategoryId: primaryCategoryId,
          isActive: true,
          // Calculate average price
          totalRevenue: 0,
          totalQuantity: 0,
        })
      }

      const item = itemsMap.get(itemName)
      item.totalRevenue += lineItem.totalPriceAmount
      item.totalQuantity += lineItem.quantity
    })
  })

  // Calculate average prices and clean up
  const items = Array.from(itemsMap.values()).map((item: any) => ({
    name: item.name,
    category: item.category,
    squareCatalogId: item.squareCatalogId,
    squareItemId: item.squareItemId,
    squareCategoryId: item.squareCategoryId,
    isActive: item.isActive,
  }))

  console.log(
    `✅ Found ${items.length} unique items with Square catalog mapping`
  )
  return items
}

// Intelligent item categorization that maps Square categories to simplified categories
function categorizeItem(
  itemName: string,
  squareCategory: string | null = null
): string {
  // If we have a Square category, try to map it to a simplified category first
  if (squareCategory) {
    const categoryLower = squareCategory.toLowerCase()

    // Map Square categories to simplified categories
    if (categoryLower.includes('coffee')) return 'coffee'
    if (categoryLower.includes('tea')) return 'tea'
    if (categoryLower.includes('food')) return 'food'
    if (categoryLower.includes('beverage')) return 'beverages'
    if (categoryLower.includes('signature')) return 'signature-drinks'
    if (categoryLower.includes('retail')) return 'retail'
    if (categoryLower.includes('wholesale')) return 'wholesale'
    if (
      categoryLower.includes('apparel') ||
      categoryLower.includes('merchandize')
    )
      return 'merchandise'
    if (
      categoryLower.includes('syrup') ||
      categoryLower.includes('powder') ||
      categoryLower.includes('modification')
    )
      return 'add-ons'
    if (categoryLower.includes('education') || categoryLower.includes('event'))
      return 'services'

    // If we have a Square category but it doesn't match our mapping, use it as-is
    return squareCategory.toLowerCase().replace(/[^a-z0-9]/g, '-')
  }

  // Fallback to name-based categorization if no Square category
  if (!itemName || typeof itemName !== 'string') {
    return 'other'
  }
  const name = itemName.toLowerCase()

  if (
    name.includes('coffee') ||
    name.includes('brew') ||
    name.includes('americano') ||
    name.includes('espresso')
  ) {
    return 'coffee'
  }
  if (
    name.includes('latte') ||
    name.includes('cappuccino') ||
    name.includes('macchiato')
  ) {
    return 'coffee-drinks'
  }
  if (
    name.includes('tea') ||
    name.includes('chai') ||
    name.includes('matcha')
  ) {
    return 'tea'
  }
  if (
    name.includes('croissant') ||
    name.includes('danish') ||
    name.includes('muffin') ||
    name.includes('bagel')
  ) {
    return 'pastry'
  }
  if (
    name.includes('sandwich') ||
    name.includes('wrap') ||
    name.includes('salad')
  ) {
    return 'food'
  }
  if (name.includes('juice') || name.includes('smoothie')) {
    return 'beverages'
  }

  return 'other'
}

async function seedOrderBatch(orders: any[], catalogMapping: any = null) {
  if (orders.length === 0) return

  try {
    // Extract and create unique items first
    const itemsMap = new Map()
    orders.forEach((order) => {
      order.lineItems.forEach((lineItem: any) => {
        const itemName = lineItem.name
        if (!itemsMap.has(itemName)) {
          // Use catalog mapping if available (like in extractUniqueItems)
          let squareCategoryId = null
          let categoryName = categorizeItem(itemName)
          let squareItemId = null

          if (catalogMapping) {
            // Get real category from Square catalog (same logic as extractUniqueItems)
            const variation = catalogMapping.variations.get(lineItem.category)
            const parentItem = variation
              ? catalogMapping.items.get(variation.itemId)
              : null

            // Get the first category from the categories array
            const categoryIds = parentItem?.categoryIds || []
            const primaryCategoryId =
              categoryIds.length > 0 ? categoryIds[0] : null
            const squareCategory = primaryCategoryId
              ? catalogMapping.categories.get(primaryCategoryId)
              : null

            squareCategoryId = primaryCategoryId
            categoryName = squareCategory?.name || categorizeItem(itemName)
            squareItemId = variation?.itemId || null
          }

          itemsMap.set(itemName, {
            squareItemId:
              squareItemId ||
              lineItem.category ||
              `GENERATED_${itemName.replace(/\s+/g, '_').toUpperCase()}`,
            squareCatalogId:
              lineItem.category ||
              `CATALOG_${itemName.replace(/\s+/g, '_').toUpperCase()}`,
            squareCategoryId: squareCategoryId,
            name: itemName,
            category: categoryName,
            isActive: true,
          })
        }
      })
    })

    // Create items (upsert to avoid duplicates)
    for (const [itemName, itemData] of itemsMap.entries()) {
      try {
        await prisma.item.upsert({
          where: { squareItemId: itemData.squareItemId },
          update: {
            name: itemData.name,
            category: itemData.category,
            squareCategoryId: itemData.squareCategoryId,
            isActive: itemData.isActive,
          },
          create: itemData,
        })
      } catch (error) {
        console.warn(`⚠️ Could not create item ${itemName}:`, error)
      }
    }

    // Create orders (without lineItems - we'll handle those separately)
    const orderData = orders.map((order) => ({
      squareOrderId: order.squareOrderId,
      locationId: order.locationId,
      date: order.date,
      state: order.state,
      totalAmount: order.totalAmount,
      currency: order.currency,
      version: order.version,
      source: order.source,
    }))

    await prisma.order.createMany({
      data: orderData,
      skipDuplicates: true,
    })

    // Create line items
    const allLineItems: any[] = []
    for (const order of orders) {
      for (const lineItem of order.lineItems) {
        // Find the item ID we just created
        // Use the same logic as item creation to find the correct squareItemId
        let searchSquareItemId = null

        if (catalogMapping) {
          // Use catalog mapping to find the correct item ID
          const variation = catalogMapping.variations.get(lineItem.category)
          const squareItemId = variation?.itemId || null
          searchSquareItemId =
            squareItemId ||
            lineItem.category ||
            `GENERATED_${lineItem.name.replace(/\s+/g, '_').toUpperCase()}`
        } else {
          searchSquareItemId =
            lineItem.category ||
            `GENERATED_${lineItem.name.replace(/\s+/g, '_').toUpperCase()}`
        }

        let item = await prisma.item.findUnique({
          where: {
            squareItemId: searchSquareItemId,
          },
        })

        // If item doesn't exist, create it on the fly
        if (!item) {
          let squareCategoryId = null
          let categoryName = categorizeItem(lineItem.name)
          let realSquareItemId = null

          if (catalogMapping) {
            // Get real category from Square catalog (same logic as extractUniqueItems)
            const variation = catalogMapping.variations.get(lineItem.category)
            const parentItem = variation
              ? catalogMapping.items.get(variation.itemId)
              : null

            // Get the first category from the categories array
            const categoryIds = parentItem?.categoryIds || []
            const primaryCategoryId =
              categoryIds.length > 0 ? categoryIds[0] : null
            const squareCategory = primaryCategoryId
              ? catalogMapping.categories.get(primaryCategoryId)
              : null

            squareCategoryId = primaryCategoryId
            categoryName = squareCategory?.name || categorizeItem(lineItem.name)
            realSquareItemId = variation?.itemId || null
          }

          const itemData = {
            squareItemId:
              realSquareItemId ||
              lineItem.category ||
              `GENERATED_${lineItem.name.replace(/\s+/g, '_').toUpperCase()}`,
            squareCatalogId:
              lineItem.category ||
              `CATALOG_${lineItem.name.replace(/\s+/g, '_').toUpperCase()}`,
            squareCategoryId: squareCategoryId,
            name: lineItem.name,
            category: categoryName,
            isActive: true,
          }

          try {
            item = await prisma.item.upsert({
              where: { squareItemId: itemData.squareItemId },
              update: {
                name: itemData.name,
                category: itemData.category,
                squareCategoryId: itemData.squareCategoryId,
                isActive: itemData.isActive,
              },
              create: itemData,
            })
          } catch (error) {
            console.warn(`⚠️ Could not create item ${lineItem.name}:`, error)
          }
        }

        if (item) {
          allLineItems.push({
            squareLineItemUid: lineItem.squareLineItemUid,
            orderId: order.squareOrderId, // This will need to be the actual order ID from DB
            itemId: item.id,
            name: lineItem.name,
            quantity: lineItem.quantity,
            unitPriceAmount: lineItem.unitPriceAmount,
            totalPriceAmount: lineItem.totalPriceAmount,
            currency: lineItem.currency,
            taxAmount: lineItem.taxAmount,
            discountAmount: lineItem.discountAmount,
            variations: lineItem.variations,
            category: lineItem.category,
          })
        } else {
          console.warn(
            `⚠️ Could not create/find item for line item: ${lineItem.name} (searchSquareItemId: ${searchSquareItemId})`
          )
        }
      }
    }

    // Get the actual order IDs from database
    const createdOrders = await prisma.order.findMany({
      where: {
        squareOrderId: {
          in: orders.map((o) => o.squareOrderId),
        },
      },
      select: {
        id: true,
        squareOrderId: true,
      },
    })

    const orderIdMap = new Map(
      createdOrders.map((o) => [o.squareOrderId, o.id])
    )

    // Update line items with correct order IDs
    const lineItemsWithCorrectOrderIds = allLineItems.map((lineItem) => ({
      ...lineItem,
      orderId: orderIdMap.get(lineItem.orderId) || lineItem.orderId,
    }))

    // Create line items in batches
    if (lineItemsWithCorrectOrderIds.length > 0) {
      console.log(
        `   📋 Creating ${lineItemsWithCorrectOrderIds.length} line items...`
      )
      await prisma.lineItem.createMany({
        data: lineItemsWithCorrectOrderIds,
        skipDuplicates: true,
      })
      console.log(
        `   ✅ Created ${lineItemsWithCorrectOrderIds.length} line items`
      )
    } else {
      console.warn(`   ⚠️ No line items to create!`)
    }
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
        // Incremental files contain arrays of orders directly, not wrapped in an object
        if (Array.isArray(incrementalData)) {
          allIncrementalOrders.push(...incrementalData)
        } else if (incrementalData.orders) {
          // Fallback for files that might be wrapped in an object
          allIncrementalOrders.push(...incrementalData.orders)
        }
      } catch (error) {
        console.warn(
          `⚠️ Could not load incremental file: ${sync.incrementalFile}`
        )
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
          squareCategoryId: item.squareCategoryId,
          isActive: item.isActive,
        },
        create: item,
      })
    }

    console.log(
      `   ✅ Processed ${Math.min(i + BATCH_SIZE, items.length)}/${
        items.length
      } items`
    )
  }

  console.log('✅ Items seeded successfully')
}

async function seedOrdersInBatches(orders: any[]) {
  console.log(`📊 Seeding ${orders.length} orders in batches...`)

  // Separate orders and line items for incremental mode
  const ordersForDb = orders.map((order) => {
    const { lineItems, ...orderData } = order
    return orderData
  })

  const BATCH_SIZE = 5000
  let successCount = 0

  for (let i = 0; i < ordersForDb.length; i += BATCH_SIZE) {
    const batch = ordersForDb.slice(i, i + BATCH_SIZE)

    try {
      // Use createMany with skipDuplicates for both modes (handles incremental updates)
      await prisma.order.createMany({
        data: batch,
        skipDuplicates: true,
      })

      successCount += batch.length
      const progressPercent = Math.round((successCount / orders.length) * 100)
      console.log(
        `   ✅ Seeded ${successCount}/${orders.length} orders (${progressPercent}%)`
      )
    } catch (error) {
      console.error(`❌ Error seeding batch starting at index ${i}:`, error)
      throw error
    }
  }

  console.log('✅ Orders seeded successfully')
}

async function seedIncrementalLineItems(orders: any[]) {
  console.log('📦 Processing line items for incremental orders...')

  // Get order IDs from database for the line items
  const orderIds = orders.map((o) => o.squareOrderId)
  const dbOrders = await prisma.order.findMany({
    where: { squareOrderId: { in: orderIds } },
    select: { id: true, squareOrderId: true },
  })

  const orderIdMap = new Map(dbOrders.map((o) => [o.squareOrderId, o.id]))

  // Extract and flatten all line items
  const allLineItems: any[] = []
  for (const order of orders) {
    const dbOrderId = orderIdMap.get(order.squareOrderId)
    if (dbOrderId && order.lineItems) {
      for (const lineItem of order.lineItems) {
        allLineItems.push({
          squareLineItemUid: lineItem.squareLineItemUid,
          orderId: dbOrderId,
          name: lineItem.name,
          quantity: lineItem.quantity,
          unitPriceAmount: lineItem.unitPriceAmount,
          totalPriceAmount: lineItem.totalPriceAmount,
          currency: lineItem.currency,
          taxAmount: lineItem.taxAmount || 0,
          discountAmount: lineItem.discountAmount || 0,
          variations: lineItem.variations,
          category: lineItem.category,
        })
      }
    }
  }

  if (allLineItems.length > 0) {
    console.log(`📦 Seeding ${allLineItems.length} line items...`)
    await prisma.lineItem.createMany({
      data: allLineItems,
      skipDuplicates: true,
    })
    console.log('✅ Line items seeded successfully')
  } else {
    console.log('ℹ️ No line items to seed')
  }
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
        const categoriesData = Array.from(
          catalogMapping.categories.entries()
        ).map(([id, data]: [string, any]) => ({
          squareCategoryId: id,
          name: data.name,
          isActive: true,
        }))
        await seedCategories(categoriesData)

        // Stream orders directly to database (no memory accumulation)
        const totalOrdersProcessed = await fetchSquareOrdersStreaming(
          locations,
          null, // null = all time
          catalogMapping
        )

        console.log(
          `\n🎉 Full seed complete! Processed ${totalOrdersProcessed} orders from Square API`
        )
      } else {
        console.log('📁 FULL SEED FROM FILES')

        // Check if files exist
        const dataDir = path.join(process.cwd(), 'historical-data')
        if (!fs.existsSync(path.join(dataDir, 'orders.json'))) {
          throw new Error(
            'Historical data files not found. Run with --from-api flag or fetch data first.'
          )
        }

        const { categoriesData, itemsData, locationsData, ordersData } =
          loadSquareData()

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
      await seedIncrementalLineItems(ordersData)
      console.log(
        `\n🎉 Incremental seed complete! Added ${ordersData.length} new orders`
      )
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
main().catch((e) => {
  console.error(e)
  process.exit(1)
})
