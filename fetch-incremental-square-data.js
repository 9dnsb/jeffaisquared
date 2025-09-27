require('dotenv').config({ path: '.env.development' })
const fs = require('fs').promises
const path = require('path')

// Square API configuration - use production for real data
const SQUARE_BASE_URL = 'https://connect.squareup.com'
const ACCESS_TOKEN = process.env.SQUARE_ACCESS_TOKEN
const SQUARE_VERSION = '2025-09-24'

// Helper function to make Square API requests with exponential backoff
async function squareApiRequest(
  endpoint,
  method = 'GET',
  body = null,
  retryCount = 0
) {
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

  console.log(
    `🔗 ${method} ${endpoint}${retryCount > 0 ? ` (retry ${retryCount})` : ''}`
  )

  try {
    const response = await fetch(url, options)

    // Check if response is JSON before parsing
    const contentType = response.headers.get('content-type')
    let data

    if (contentType && contentType.includes('application/json')) {
      data = await response.json()
    } else {
      // Non-JSON response (likely error page from upstream server)
      const textResponse = await response.text()
      throw new Error(
        `Non-JSON response from Square API (${
          response.status
        }): ${textResponse.substring(0, 100)}...`
      )
    }

    // Handle rate limiting with exponential backoff
    if (response.status === 429) {
      const maxRetries = 5
      if (retryCount >= maxRetries) {
        throw new Error(`Rate limit exceeded after ${maxRetries} retries`)
      }

      // Exponential backoff: 2^retryCount seconds + random jitter
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
        `Square API Error: ${response.status} - ${JSON.stringify(data)}`
      )
    }

    return data
  } catch (error) {
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

// Load or create sync metadata
async function loadSyncMetadata() {
  const metadataPath = path.join(
    __dirname,
    'historical-data',
    'sync-metadata.json'
  )

  try {
    const data = await fs.readFile(metadataPath, 'utf8')
    return JSON.parse(data)
  } catch (error) {
    // Create default metadata if file doesn't exist
    const defaultMetadata = {
      lastSyncTimestamp: null,
      lastFullSync: null,
      syncHistory: [],
      totalOrdersSynced: 0,
      dataRanges: {
        earliest: null,
        latest: null,
      },
    }
    return defaultMetadata
  }
}

// Save sync metadata
async function saveSyncMetadata(metadata) {
  const dataDir = path.join(__dirname, 'historical-data')
  const metadataPath = path.join(dataDir, 'sync-metadata.json')

  try {
    await fs.mkdir(dataDir, { recursive: true })
  } catch (error) {
    // Directory might already exist
  }

  await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2))
}

// Determine what date range to fetch
async function determineIncrementalRange() {
  const metadata = await loadSyncMetadata()
  const now = new Date()

  let startDate
  if (metadata.lastSyncTimestamp) {
    // Fetch from last sync with 1 hour overlap to ensure no gaps
    startDate = new Date(metadata.lastSyncTimestamp)
    startDate.setHours(startDate.getHours() - 1)
  } else {
    // No previous sync - get last 24 hours as default
    startDate = new Date()
    startDate.setDate(startDate.getDate() - 1)
  }

  return {
    startDate,
    endDate: now,
    metadata,
  }
}

// Fetch incremental orders for all locations
async function fetchIncrementalOrders(locations, startDate, endDate) {
  console.log(
    `📊 Fetching incremental orders from ${startDate.toISOString()} to ${endDate.toISOString()}...`
  )

  let allOrders = []
  let totalOrdersFound = 0
  const totalLocations = locations.length

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
      let locationOrders = []
      let batchCount = 0

      do {
        batchCount++
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
          `   📦 Batch ${batchCount}: ${orders.length} orders (Location total: ${locationOrders.length})`
        )

        // Rate limiting with randomness to avoid thundering herd
        if (cursor) {
          const baseDelay = 200 // Base 200ms delay (5 QPS max)
          const jitter = Math.random() * 100 // 0-100ms random jitter
          const totalDelay = baseDelay + jitter
          console.log(
            `   ⏳ Rate limiting: waiting ${Math.round(totalDelay)}ms`
          )
          await new Promise((resolve) => setTimeout(resolve, totalDelay))
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
          .filter((item) => item.name && item.name.trim())
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

  console.log(`\n🎉 INCREMENTAL ORDERS FOUND: ${totalOrdersFound}`)
  return allOrders
}

// Load existing locations from historical data
async function loadExistingLocations() {
  try {
    const locationsPath = path.join(
      __dirname,
      'historical-data',
      'locations.json'
    )
    const data = await fs.readFile(locationsPath, 'utf8')
    return JSON.parse(data)
  } catch (error) {
    console.warn(
      '⚠️ Could not load existing locations, will fetch fresh from Square API'
    )
    // Fallback: fetch from Square API
    const result = await squareApiRequest('/v2/locations')
    return result.locations.map((loc) => ({
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
  }
}

// Save incremental data
async function saveIncrementalData(orders, metadata, startDate, endDate) {
  const dataDir = path.join(__dirname, 'historical-data')
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')

  // Save this batch of incremental orders
  const incrementalFile = path.join(
    dataDir,
    `incremental-orders-${timestamp}.json`
  )
  await fs.writeFile(incrementalFile, JSON.stringify(orders, null, 2))

  // Update metadata
  const updatedMetadata = {
    ...metadata,
    lastSyncTimestamp: endDate.toISOString(),
    syncHistory: [
      ...metadata.syncHistory,
      {
        timestamp: new Date().toISOString(),
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        ordersFound: orders.length,
        incrementalFile: `incremental-orders-${timestamp}.json`,
      },
    ],
    totalOrdersSynced: metadata.totalOrdersSynced + orders.length,
    dataRanges: {
      earliest: metadata.dataRanges.earliest || startDate.toISOString(),
      latest: endDate.toISOString(),
    },
  }

  await saveSyncMetadata(updatedMetadata)

  console.log(
    `💾 Saved ${orders.length} incremental orders to ${incrementalFile}`
  )
  console.log(`📊 Updated sync metadata`)

  return {
    incrementalFile,
    metadata: updatedMetadata,
  }
}

// Main incremental fetch function
async function fetchIncrementalSquareData() {
  try {
    console.log('🔄 FETCHING INCREMENTAL SQUARE DATA\n')
    console.log(`🔑 Using access token: ${ACCESS_TOKEN?.substring(0, 10)}...`)

    // Determine what range to fetch
    const { startDate, endDate, metadata } = await determineIncrementalRange()

    console.log(
      `📅 Fetching data from ${startDate.toISOString()} to ${endDate.toISOString()}`
    )
    console.log(
      `📈 Previous total orders synced: ${metadata.totalOrdersSynced}`
    )

    // Load locations (from cache or API)
    const locations = await loadExistingLocations()
    console.log(`📍 Using ${locations.length} locations`)

    // Fetch incremental orders
    const orders = await fetchIncrementalOrders(locations, startDate, endDate)

    if (orders.length === 0) {
      console.log('✅ No new orders found in this time range')
      return { orders: [], incrementalFile: null, metadata }
    }

    // Save incremental data
    const result = await saveIncrementalData(
      orders,
      metadata,
      startDate,
      endDate
    )

    console.log('\n🎉 INCREMENTAL DATA FETCH COMPLETE!')
    console.log(`📊 Found ${orders.length} new orders`)
    console.log(`📈 Total orders synced: ${result.metadata.totalOrdersSynced}`)
    console.log(`💾 Saved to: ${result.incrementalFile}`)

    return result
  } catch (error) {
    console.error('❌ Error fetching incremental data:', error)
    console.error('Full error:', error.stack)
    throw error
  }
}

// Export for use in other scripts
module.exports = {
  fetchIncrementalSquareData,
  loadSyncMetadata,
  saveSyncMetadata,
  determineIncrementalRange,
  loadExistingLocations,
}

// Run if called directly
if (require.main === module) {
  fetchIncrementalSquareData()
}
