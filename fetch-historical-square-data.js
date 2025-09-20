require('dotenv').config({ path: '.env.production' });

const SQUARE_BASE_URL = 'https://connect.squareup.com';
const ACCESS_TOKEN = process.env.SQUARE_ACCESS_TOKEN;

// Helper function to make Square API requests
async function squareApiRequest(endpoint, method = 'GET', body = null) {
  const url = `${SQUARE_BASE_URL}${endpoint}`;
  const options = {
    method,
    headers: {
      'Authorization': `Bearer ${ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
      'Square-Version': '2025-08-20'
    }
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(`Square API Error: ${response.status} - ${JSON.stringify(data)}`);
  }

  return data;
}

async function fetchComprehensiveData() {
  try {
    console.log('🔍 COMPREHENSIVE HISTORICAL DATA ANALYSIS\n');

    // Get all locations
    const locationsResult = await squareApiRequest('/v2/locations');
    console.log(`📍 Found ${locationsResult.locations.length} locations:\n`);

    // Calculate date ranges
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    // Check The Well location (matches Excel data)
    const theWellLocation = locationsResult.locations.find(loc =>
      loc.id === 'LT8YK4FBNGH17' || loc.name.includes('The Well')
    );

    if (theWellLocation) {
      console.log(`🎯 ANALYZING THE WELL LOCATION (matches Excel data)`);
      console.log(`Location: ${theWellLocation.name} (${theWellLocation.id})\n`);

      // Search for orders from The Well (last 6 months)
      const searchBody = {
        location_ids: [theWellLocation.id],
        query: {
          filter: {
            date_time_filter: {
              created_at: {
                start_at: sixMonthsAgo.toISOString(),
                end_at: new Date().toISOString()
              }
            },
            state_filter: {
              states: ['COMPLETED']
            }
          },
          sort: {
            sort_field: 'CREATED_AT',
            sort_order: 'DESC'
          }
        },
        limit: 100 // Get more orders
      };

      const ordersResult = await squareApiRequest('/v2/orders/search', 'POST', searchBody);

      console.log(`📊 THE WELL HISTORICAL DATA:`);
      console.log(`Orders found (6 months): ${ordersResult.orders?.length || 0}`);

      if (ordersResult.orders && ordersResult.orders.length > 0) {
        let totalRevenue = 0;
        const itemCounts = {};
        const dailySales = {};

        // Analyze all orders
        ordersResult.orders.forEach(order => {
          // Calculate revenue
          if (order.total_money) {
            totalRevenue += order.total_money.amount / 100;
          }

          // Count items
          if (order.line_items) {
            order.line_items.forEach(item => {
              const name = item.name || 'Unknown';
              const quantity = parseInt(item.quantity) || 1;
              itemCounts[name] = (itemCounts[name] || 0) + quantity;
            });
          }

          // Daily sales
          const date = order.created_at.split('T')[0];
          dailySales[date] = (dailySales[date] || 0) + (order.total_money?.amount || 0) / 100;
        });

        console.log(`Total Revenue: $${totalRevenue.toFixed(2)} CAD`);
        console.log(`Average Order: $${(totalRevenue / ordersResult.orders.length).toFixed(2)}`);

        console.log(`\n🏆 TOP SELLING ITEMS:`);
        Object.entries(itemCounts)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 10)
          .forEach(([item, count], index) => {
            console.log(`  ${index + 1}. ${item}: ${count} sold`);
          });

        console.log(`\n📅 RECENT DAILY SALES (last 10 days):`);
        Object.entries(dailySales)
          .sort(([a], [b]) => b.localeCompare(a))
          .slice(0, 10)
          .forEach(([date, sales]) => {
            console.log(`  ${date}: $${sales.toFixed(2)}`);
          });

        // Show sample recent orders
        console.log(`\n📋 SAMPLE RECENT ORDERS:`);
        ordersResult.orders.slice(0, 3).forEach((order, index) => {
          console.log(`\nOrder ${index + 1}:`);
          console.log(`  Date: ${order.created_at}`);
          console.log(`  Total: $${(order.total_money?.amount / 100).toFixed(2)}`);
          console.log(`  Items: ${order.line_items?.map(item => item.name).join(', ') || 'None'}`);
        });

        // Compare to Excel data structure
        console.log(`\n🔄 EXCEL FORMAT COMPARISON:`);
        console.log(`Excel has ${936} transactions from April 28 - May 13, 2025`);
        console.log(`API shows ${ordersResult.orders.length} completed orders in last 6 months`);
        console.log(`Excel location: LT8YK4FBNGH17 ✅ MATCHES The Well location`);

      } else {
        console.log('❌ No completed orders found for The Well location');
      }
    } else {
      console.log('❌ The Well location (LT8YK4FBNGH17) not found in current locations');
    }

    // Quick check of all locations
    console.log(`\n📊 ALL LOCATIONS SUMMARY (last 30 days):`);
    for (const location of locationsResult.locations.slice(0, 3)) { // Check first 3 to avoid rate limits
      const quickSearch = {
        location_ids: [location.id],
        query: {
          filter: {
            date_time_filter: {
              created_at: {
                start_at: thirtyDaysAgo.toISOString(),
                end_at: new Date().toISOString()
              }
            },
            state_filter: {
              states: ['COMPLETED']
            }
          }
        },
        limit: 5
      };

      try {
        const quickResult = await squareApiRequest('/v2/orders/search', 'POST', quickSearch);
        console.log(`  ${location.name}: ${quickResult.orders?.length || 0} orders`);
      } catch (error) {
        console.log(`  ${location.name}: Error fetching data`);
      }
    }

  } catch (error) {
    console.error('❌ Error fetching comprehensive data:', error.message);
  }
}

fetchComprehensiveData();