require('dotenv').config({ path: '.env.development' })
const fs = require('fs').promises
const path = require('path')

// Square API configuration - use production for real data
const SQUARE_BASE_URL = 'https://connect.squareup.com'
const ACCESS_TOKEN = process.env.SQUARE_ACCESS_TOKEN
const SQUARE_VERSION = '2025-08-20'

// Helper function to make Square API requests
async function squareApiRequest(endpoint, method = 'GET', body = null) {
  const url = `${SQUARE_BASE_URL}${endpoint}`
  const options = {
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

  console.log(`🔗 ${method} ${endpoint}`)

  const response = await fetch(url, options)
  const data = await response.json()

  if (!response.ok) {
    throw new Error(
      `Square API Error: ${response.status} - ${JSON.stringify(data)}`
    )
  }

  return data
}

// Fetch all locations
async function fetchAllLocations() {
  console.log('📍 Fetching all locations...')
  const result = await squareApiRequest('/v2/locations')

  const locations = result.locations.map((loc) => ({
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

// Fetch historical orders for all locations
async function fetchAllHistoricalOrders(locations, days = 365) {
  console.log(`📊 Fetching ${days} days of historical orders...`)

  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  const endDate = new Date()

  let allOrders = []
  let totalOrdersFound = 0

  for (const location of locations) {
    console.log(
      `\n🏪 Processing location: ${location.name} (${location.squareLocationId})`
    )

    try {
      let cursor = null
      let locationOrders = []

      do {
        const searchBody = {
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
            sort: {
              sort_field: 'CREATED_AT',
              sort_order: 'DESC',
            },
          },
          limit: 1000,
        }

        if (cursor) {
          searchBody.cursor = cursor
        }

        const ordersResult = await squareApiRequest(
          '/v2/orders/search',
          'POST',
          searchBody
        )

        const orders = ordersResult.orders || []
        locationOrders = locationOrders.concat(orders)

        cursor = ordersResult.cursor

        console.log(
          `   📦 Batch: ${orders.length} orders (Total: ${locationOrders.length})`
        )

        // Rate limiting - Square has limits
        if (cursor) {
          await new Promise((resolve) => setTimeout(resolve, 100))
        }
      } while (cursor)

      console.log(`✅ ${location.name}: ${locationOrders.length} total orders`)

      // Process orders for this location
      const processedOrders = locationOrders.map((order) => ({
        squareOrderId: order.id,
        locationId: location.squareLocationId,
        date: new Date(order.created_at),
        state: order.state,
        totalAmount: order.total_money?.amount || 0,
        currency: order.total_money?.currency || 'CAD',
        version: order.version || 1,
        source: order.source?.name || null,
        lineItems: (order.line_items || [])
          .filter((item) => item.name && item.name.trim()) // Filter out items without valid names
          .map((item) => ({
            squareLineItemUid: item.uid,
            name: item.name.trim(),
            quantity: parseInt(item.quantity) || 1,
            unitPriceAmount: item.base_price_money?.amount || 0,
            totalPriceAmount: item.total_money?.amount || 0,
            currency: item.total_money?.currency || 'CAD',
            taxAmount: item.total_tax_money?.amount || 0,
            discountAmount: item.total_discount_money?.amount || 0,
            variations: item.variation_name || null,
            category: item.catalog_object_id || null,
          })),
      }))

      allOrders = allOrders.concat(processedOrders)
      totalOrdersFound += locationOrders.length
    } catch (error) {
      console.error(
        `❌ Error fetching orders for ${location.name}:`,
        error.message
      )
    }
  }

  console.log(`\n🎉 TOTAL HISTORICAL ORDERS: ${totalOrdersFound}`)
  return allOrders
}

// Extract unique items from all orders using Square catalog data
async function extractUniqueItems(orders, catalogMapping) {
  console.log('🍰 Extracting unique items with Square catalog data...')

  const itemsMap = new Map()

  orders.forEach((order) => {
    order.lineItems.forEach((lineItem) => {
      const itemName = lineItem.name || 'Unknown Item'
      if (!itemsMap.has(itemName)) {
        // Get real category from Square catalog
        const variation = catalogMapping.variations.get(lineItem.category)
        const parentItem = variation ? catalogMapping.items.get(variation.itemId) : null
        const category = parentItem?.categoryId ? catalogMapping.categories.get(parentItem.categoryId) : null

        itemsMap.set(itemName, {
          name: itemName,
          category: category?.name || categorizeItem(itemName), // Use Square category or fallback
          squareCatalogId: lineItem.category,
          squareItemId: variation?.itemId || null,
          squareCategoryId: parentItem?.categoryId || null,
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
  const items = Array.from(itemsMap.values()).map((item) => ({
    name: item.name,
    category: item.category,
    squareCatalogId: item.squareCatalogId,
    squareItemId: item.squareItemId,
    squareCategoryId: item.squareCategoryId,
    isActive: item.isActive,
  }))

  console.log(`✅ Found ${items.length} unique items with Square catalog mapping`)
  return items
}

// Simple item categorization based on name
function categorizeItem(itemName) {
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

// Save data to JSON files for seeding
async function saveDataToFiles(locations, orders, items) {
  console.log('💾 Saving data to files...')

  const dataDir = path.join(__dirname, 'historical-data')

  try {
    await fs.mkdir(dataDir, { recursive: true })
  } catch (error) {
    // Directory might already exist
  }

  // Save locations
  await fs.writeFile(
    path.join(dataDir, 'locations.json'),
    JSON.stringify(locations, null, 2)
  )

  // Save items
  await fs.writeFile(
    path.join(dataDir, 'items.json'),
    JSON.stringify(items, null, 2)
  )

  // Save orders (might be large, so save in chunks if needed)
  await fs.writeFile(
    path.join(dataDir, 'orders.json'),
    JSON.stringify(orders, null, 2)
  )

  // Save summary stats
  const summary = {
    totalLocations: locations.length,
    totalItems: items.length,
    totalOrders: orders.length,
    totalRevenue:
      orders.reduce((sum, order) => sum + order.totalAmount, 0) / 100,
    dateRange: {
      earliest:
        orders.length > 0
          ? Math.min(...orders.map((o) => new Date(o.date).getTime()))
          : null,
      latest:
        orders.length > 0
          ? Math.max(...orders.map((o) => new Date(o.date).getTime()))
          : null,
    },
    generatedAt: new Date().toISOString(),
  }

  if (summary.dateRange.earliest) {
    summary.dateRange.earliest = new Date(
      summary.dateRange.earliest
    ).toISOString()
    summary.dateRange.latest = new Date(summary.dateRange.latest).toISOString()
  }

  await fs.writeFile(
    path.join(dataDir, 'summary.json'),
    JSON.stringify(summary, null, 2)
  )

  console.log(`✅ Data saved to ${dataDir}/`)
  console.log(`📊 Summary:`)
  console.log(`   Locations: ${summary.totalLocations}`)
  console.log(`   Items: ${summary.totalItems}`)
  console.log(`   Orders: ${summary.totalOrders}`)
  console.log(`   Revenue: $${summary.totalRevenue.toFixed(2)}`)
  console.log(
    `   Date range: ${summary.dateRange.earliest?.split('T')[0]} to ${
      summary.dateRange.latest?.split('T')[0]
    }`
  )

  return summary
}

// Fetch Square catalog data for proper categorization
async function fetchCatalogMapping() {
  console.log('📚 Fetching Square catalog for proper categorization...')

  const catalogMapping = {
    items: new Map(),
    variations: new Map(),
    categories: new Map()
  }

  try {
    // Get all catalog objects
    let allObjects = []
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
    allObjects.forEach(obj => {
      if (obj.type === 'ITEM') {
        const name = obj.item_data?.name || 'Unknown Item'
        const categoryId = obj.item_data?.category_id
        catalogMapping.items.set(obj.id, { name, categoryId })

        // Extract variations from this item
        if (obj.item_data?.variations) {
          obj.item_data.variations.forEach(variation => {
            catalogMapping.variations.set(variation.id, {
              name: variation.item_variation_data?.name || 'Regular',
              itemId: obj.id,
              itemName: name
            })
          })
        }
      } else if (obj.type === 'CATEGORY') {
        const name = obj.category_data?.name || 'Unknown Category'
        catalogMapping.categories.set(obj.id, { name })
      }
    })

    console.log(`✅ Mapped ${catalogMapping.items.size} items, ${catalogMapping.variations.size} variations, ${catalogMapping.categories.size} categories`)
    return catalogMapping

  } catch (error) {
    console.warn(`⚠️ Failed to fetch catalog data: ${error.message}`)
    console.warn('Will use fallback categorization')
    return catalogMapping
  }
}

// Main function
async function fetchAllHistoricalData() {
  try {
    console.log('🚀 FETCHING ALL HISTORICAL SQUARE DATA\n')
    console.log(`🔑 Using access token: ${ACCESS_TOKEN?.substring(0, 10)}...`)
    console.log(`🌐 Environment: Production Square API\n`)

    // Fetch catalog data first for proper categorization
    const catalogMapping = await fetchCatalogMapping()

    // Fetch all data
    const locations = await fetchAllLocations()
    const orders = await fetchAllHistoricalOrders(locations, 1) // 1 day for testing (will revert to 730 for 2 years)
    const items = await extractUniqueItems(orders, catalogMapping)

    // Save to files
    const summary = await saveDataToFiles(locations, orders, items)

    console.log('\n🎉 HISTORICAL DATA FETCH COMPLETE!')
    console.log('\nFiles created:')
    console.log('  📍 historical-data/locations.json')
    console.log('  🍰 historical-data/items.json')
    console.log('  📊 historical-data/orders.json')
    console.log('  📈 historical-data/summary.json')
    console.log('\nYou can now update your seed.ts to use this real data!')
  } catch (error) {
    console.error('❌ Error fetching historical data:', error)
    console.error('Full error:', error.stack)
  }
}

// Run if called directly
if (require.main === module) {
  fetchAllHistoricalData()
}

module.exports = {
  fetchAllHistoricalData,
  fetchAllLocations,
  fetchAllHistoricalOrders,
  extractUniqueItems,
  saveDataToFiles,
}