"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateGroundTruthV3 = calculateGroundTruthV3;
exports.disconnectPrismaV3 = disconnectPrismaV3;
const prisma_1 = __importDefault(require("../../lib/prisma"));
const timezone_1 = require("../lib/utils/timezone");
async function calculateGroundTruthV3() {
    console.log('🔍 Calculating comprehensive ground truth data for 100 tests...');
    const startTime = Date.now();
    // Calculate date boundaries for time-based queries using Toronto timezone
    (0, timezone_1.debugTorontoTimes)(); // Show timezone debug info
    const today = (0, timezone_1.getTorontoDate)();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const lastWeekStart = new Date(today);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);
    const lastMonthStart = new Date(today);
    lastMonthStart.setMonth(lastMonthStart.getMonth() - 1);
    const twoWeeksAgo = new Date(today);
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
    const twoMonthsAgo = new Date(today);
    twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
    // Batch query strategy: Execute related queries in parallel for performance
    console.log('⚡ Executing batch queries for optimal performance...');
    // BATCH 1: Time-based aggregations using optimized database queries
    const [todayStats, yesterdayStats, lastWeekStats, lastMonthStats, previousWeekStats, previousMonthStats, overallStats] = await Promise.all([
        // Today
        prisma_1.default.$queryRaw `
      SELECT
        COALESCE(SUM(o."totalAmount"), 0)::bigint as revenue,
        COUNT(o.id)::bigint as count,
        COALESCE(SUM(li.quantity), 0)::bigint as quantity
      FROM orders o
      LEFT JOIN line_items li ON o.id = li."orderId"
      WHERE o.date >= ${today} AND o.date < ${new Date(today.getTime() + 24 * 60 * 60 * 1000)}
    `,
        // Yesterday
        prisma_1.default.$queryRaw `
      SELECT
        COALESCE(SUM(o."totalAmount"), 0)::bigint as revenue,
        COUNT(o.id)::bigint as count,
        COALESCE(SUM(li.quantity), 0)::bigint as quantity
      FROM orders o
      LEFT JOIN line_items li ON o.id = li."orderId"
      WHERE o.date >= ${yesterday} AND o.date < ${today}
    `,
        // Last week
        prisma_1.default.$queryRaw `
      SELECT
        COALESCE(SUM(o."totalAmount"), 0)::bigint as revenue,
        COUNT(o.id)::bigint as count,
        COALESCE(SUM(li.quantity), 0)::bigint as quantity
      FROM orders o
      LEFT JOIN line_items li ON o.id = li."orderId"
      WHERE o.date >= ${lastWeekStart} AND o.date < ${today}
    `,
        // Last month
        prisma_1.default.$queryRaw `
      SELECT
        COALESCE(SUM(o."totalAmount"), 0)::bigint as revenue,
        COUNT(o.id)::bigint as count,
        COALESCE(SUM(li.quantity), 0)::bigint as quantity
      FROM orders o
      LEFT JOIN line_items li ON o.id = li."orderId"
      WHERE o.date >= ${lastMonthStart} AND o.date < ${today}
    `,
        // Previous week (for growth calculations)
        prisma_1.default.$queryRaw `
      SELECT COALESCE(SUM("totalAmount"), 0)::bigint as revenue
      FROM orders
      WHERE date >= ${twoWeeksAgo} AND date < ${lastWeekStart}
    `,
        // Previous month (for growth calculations)
        prisma_1.default.$queryRaw `
      SELECT COALESCE(SUM("totalAmount"), 0)::bigint as revenue
      FROM orders
      WHERE date >= ${twoMonthsAgo} AND date < ${lastMonthStart}
    `,
        // Overall statistics
        prisma_1.default.$queryRaw `
      SELECT
        COALESCE(SUM(o."totalAmount"), 0)::bigint as revenue,
        COUNT(o.id)::bigint as count,
        COALESCE(SUM(li.quantity), 0)::bigint as quantity,
        MIN(o.date) as earliest_date,
        MAX(o.date) as latest_date,
        COUNT(li.id)::bigint as total_line_items
      FROM orders o
      LEFT JOIN line_items li ON o.id = li."orderId"
    `
    ]);
    console.log('⚡ Executing location-based batch queries...');
    // BATCH 2: Location-based analysis with optimized joins
    const [locationStats, topLocationToday, topLocationYesterday, topLocationLastWeek, topLocationLastMonth, dailyBestPerformance] = await Promise.all([
        // All location statistics
        prisma_1.default.$queryRaw `
      SELECT
        l."squareLocationId" as location_id,
        l.name as location_name,
        COALESCE(SUM(o."totalAmount"), 0)::bigint as revenue,
        COUNT(o.id)::bigint as count
      FROM locations l
      LEFT JOIN orders o ON l."squareLocationId" = o."locationId"
      GROUP BY l."squareLocationId", l.name
      ORDER BY revenue DESC
    `,
        // Top location today
        prisma_1.default.$queryRaw `
      SELECT l.name as location_name, COALESCE(SUM(o."totalAmount"), 0)::bigint as revenue
      FROM locations l
      LEFT JOIN orders o ON l."squareLocationId" = o."locationId"
      WHERE o.date >= ${today} AND o.date < ${new Date(today.getTime() + 24 * 60 * 60 * 1000)}
      GROUP BY l.name
      ORDER BY revenue DESC
      LIMIT 1
    `,
        // Top location yesterday
        prisma_1.default.$queryRaw `
      SELECT l.name as location_name, COALESCE(SUM(o."totalAmount"), 0)::bigint as revenue
      FROM locations l
      LEFT JOIN orders o ON l."squareLocationId" = o."locationId"
      WHERE o.date >= ${yesterday} AND o.date < ${today}
      GROUP BY l.name
      ORDER BY revenue DESC
      LIMIT 1
    `,
        // Top location last week
        prisma_1.default.$queryRaw `
      SELECT l.name as location_name, COALESCE(SUM(o."totalAmount"), 0)::bigint as revenue
      FROM locations l
      LEFT JOIN orders o ON l."squareLocationId" = o."locationId"
      WHERE o.date >= ${lastWeekStart} AND o.date < ${today}
      GROUP BY l.name
      ORDER BY revenue DESC
      LIMIT 1
    `,
        // Top location last month
        prisma_1.default.$queryRaw `
      SELECT l.name as location_name, COALESCE(SUM(o."totalAmount"), 0)::bigint as revenue
      FROM locations l
      LEFT JOIN orders o ON l."squareLocationId" = o."locationId"
      WHERE o.date >= ${lastMonthStart} AND o.date < ${today}
      GROUP BY l.name
      ORDER BY revenue DESC
      LIMIT 1
    `,
        // Best performing day in last week
        prisma_1.default.$queryRaw `
      SELECT o.date, COALESCE(SUM(o."totalAmount"), 0)::bigint as revenue
      FROM orders o
      WHERE o.date >= ${lastWeekStart} AND o.date < ${today}
      GROUP BY o.date
      ORDER BY revenue DESC
      LIMIT 1
    `
    ]);
    console.log('⚡ Executing product analytics batch queries...');
    // BATCH 3: Product and item analysis
    const [topItemsByRevenue, topItemsByQuantity, itemLocationAnalysis, categoryAnalysis, uniqueItemCounts] = await Promise.all([
        // Top items by revenue
        prisma_1.default.$queryRaw `
      SELECT
        COALESCE(i.name, li.name) as item_name,
        COALESCE(SUM(li."totalPriceAmount"), 0)::bigint as revenue,
        li."itemId"
      FROM line_items li
      LEFT JOIN items i ON li."itemId" = i.id
      GROUP BY COALESCE(i.name, li.name), li."itemId"
      ORDER BY revenue DESC
      LIMIT 10
    `,
        // Top items by quantity
        prisma_1.default.$queryRaw `
      SELECT
        COALESCE(i.name, li.name) as item_name,
        COALESCE(SUM(li.quantity), 0)::bigint as quantity
      FROM line_items li
      LEFT JOIN items i ON li."itemId" = i.id
      GROUP BY COALESCE(i.name, li.name)
      ORDER BY quantity DESC
      LIMIT 10
    `,
        // Item performance by location
        prisma_1.default.$queryRaw `
      SELECT
        l.name as location_name,
        COALESCE(i.name, li.name) as item_name,
        COALESCE(SUM(li."totalPriceAmount"), 0)::bigint as revenue
      FROM line_items li
      JOIN orders o ON li."orderId" = o.id
      JOIN locations l ON o."locationId" = l."squareLocationId"
      LEFT JOIN items i ON li."itemId" = i.id
      GROUP BY l.name, COALESCE(i.name, li.name)
      ORDER BY l.name, revenue DESC
    `,
        // Category analysis
        prisma_1.default.$queryRaw `
      SELECT
        COALESCE(li.category, 'Unknown') as category,
        COALESCE(SUM(li."totalPriceAmount"), 0)::bigint as revenue,
        COALESCE(SUM(li.quantity), 0)::bigint as quantity
      FROM line_items li
      WHERE li.category IS NOT NULL
      GROUP BY COALESCE(li.category, 'Unknown')
      ORDER BY revenue DESC
    `,
        // Unique item counts by time period
        prisma_1.default.$queryRaw `
      WITH period_items AS (
        SELECT DISTINCT
          CASE
            WHEN o.date >= ${today} THEN 'today'
            WHEN o.date >= ${yesterday} AND o.date < ${today} THEN 'yesterday'
            WHEN o.date >= ${lastWeekStart} AND o.date < ${today} THEN 'last_week'
            WHEN o.date >= ${lastMonthStart} AND o.date < ${today} THEN 'last_month'
            ELSE 'other'
          END as period,
          COALESCE(i.name, li.name) as item_name
        FROM line_items li
        JOIN orders o ON li."orderId" = o.id
        LEFT JOIN items i ON li."itemId" = i.id
        WHERE o.date >= ${lastMonthStart}
      )
      SELECT period, COUNT(DISTINCT item_name)::bigint as unique_items
      FROM period_items
      WHERE period != 'other'
      GROUP BY period
    `
    ]);
    console.log('⚡ Calculating derived metrics and complex aggregations...');
    // Process raw query results and convert BigInt to number
    const todayData = todayStats[0];
    const yesterdayData = yesterdayStats[0];
    const lastWeekData = lastWeekStats[0];
    const lastMonthData = lastMonthStats[0];
    const overallData = overallStats[0];
    // Helper function to safely convert BigInt to number (in cents to dollars)
    const toNumber = (bigintValue) => {
        if (!bigintValue)
            return 0;
        return Number(bigintValue) / 100; // Convert cents to dollars
    };
    const toCount = (bigintValue) => {
        if (!bigintValue)
            return 0;
        return Number(bigintValue);
    };
    // Calculate location mappings and rankings
    const locationMap = new Map();
    for (const loc of locationStats) {
        locationMap.set(loc.location_id, {
            revenue: toNumber(loc.revenue),
            transactions: toCount(loc.count),
            name: loc.location_name
        });
    }
    // Get specific location data
    const getLocationRevenue = (locationName) => {
        for (const [_, data] of locationMap) {
            if (data.name === locationName)
                return data.revenue;
        }
        return 0;
    };
    const getLocationTransactions = (locationName) => {
        for (const [_, data] of locationMap) {
            if (data.name === locationName)
                return data.transactions;
        }
        return 0;
    };
    // Calculate advanced metrics
    const locationRevenues = Array.from(locationMap.values()).map(l => l.revenue);
    const averageLocationRevenue = locationRevenues.length > 0
        ? locationRevenues.reduce((a, b) => a + b, 0) / locationRevenues.length
        : 0;
    const variance = locationRevenues.length > 0
        ? locationRevenues.reduce((acc, rev) => acc + Math.pow(rev - averageLocationRevenue, 2), 0) / locationRevenues.length
        : 0;
    const locationRevenueStandardDeviation = Math.sqrt(variance);
    // Process item data
    const topItem = topItemsByRevenue[0];
    const topItemByQty = topItemsByQuantity[0];
    // Build item performance by location maps
    const itemLocationMap = new Map();
    const locationItemMap = new Map();
    for (const item of itemLocationAnalysis) {
        const locationName = item.location_name;
        const itemName = item.item_name;
        const revenue = toNumber(item.revenue);
        if (!itemLocationMap.has(itemName)) {
            itemLocationMap.set(itemName, new Map());
        }
        itemLocationMap.get(itemName).set(locationName, revenue);
        // Track top item per location
        if (!locationItemMap.has(locationName) || revenue > locationItemMap.get(locationName).revenue) {
            locationItemMap.set(locationName, { item: itemName, revenue });
        }
    }
    // Calculate complex aggregations
    const revenueByLocationAndCategory = {};
    const locationMarketShare = {};
    const totalRevenue = toNumber(overallData.revenue);
    for (const [_, locationData] of locationMap) {
        const marketShare = totalRevenue > 0 ? (locationData.revenue / totalRevenue) * 100 : 0;
        locationMarketShare[locationData.name] = marketShare;
        if (locationData.name === 'HQ') {
            // This will be our HQ market share percentage
        }
    }
    const endTime = Date.now();
    const totalQueryTime = endTime - startTime;
    console.log('✅ Ground truth calculation completed', {
        totalQueryTime: `${totalQueryTime}ms`,
        datasetSize: {
            totalOrders: toCount(overallData.count),
            totalLineItems: toCount(overallData.total_line_items)
        }
    });
    const groundTruth = {
        // Time-based metrics
        todayRevenue: toNumber(todayData?.revenue),
        todayTransactionCount: toCount(todayData?.count),
        todayAverageTransaction: toCount(todayData?.count) > 0 ? toNumber(todayData?.revenue) / toCount(todayData?.count) : 0,
        todayQuantitySold: toCount(todayData?.quantity),
        todayTopLocation: topLocationToday[0]?.location_name || '',
        todayTopLocationRevenue: toNumber(topLocationToday[0]?.revenue),
        todayUniqueItemCount: uniqueItemCounts.find(u => u.period === 'today')?.unique_items ? toCount(uniqueItemCounts.find(u => u.period === 'today').unique_items) : 0,
        yesterdayRevenue: toNumber(yesterdayData?.revenue),
        yesterdayTransactionCount: toCount(yesterdayData?.count),
        yesterdayAverageTransaction: toCount(yesterdayData?.count) > 0 ? toNumber(yesterdayData?.revenue) / toCount(yesterdayData?.count) : 0,
        yesterdayQuantitySold: toCount(yesterdayData?.quantity),
        yesterdayTopLocation: topLocationYesterday[0]?.location_name || '',
        yesterdayTopLocationRevenue: toNumber(topLocationYesterday[0]?.revenue),
        yesterdayUniqueItemCount: uniqueItemCounts.find(u => u.period === 'yesterday')?.unique_items ? toCount(uniqueItemCounts.find(u => u.period === 'yesterday').unique_items) : 0,
        lastWeekRevenue: toNumber(lastWeekData?.revenue),
        lastWeekTransactionCount: toCount(lastWeekData?.count),
        lastWeekAverageTransaction: toCount(lastWeekData?.count) > 0 ? toNumber(lastWeekData?.revenue) / toCount(lastWeekData?.count) : 0,
        lastWeekQuantitySold: toCount(lastWeekData?.quantity),
        lastWeekTopLocation: topLocationLastWeek[0]?.location_name || '',
        lastWeekTopLocationRevenue: toNumber(topLocationLastWeek[0]?.revenue),
        lastWeekBestDay: dailyBestPerformance[0]?.date?.toISOString().split('T')[0] || '',
        lastWeekBestDayRevenue: toNumber(dailyBestPerformance[0]?.revenue),
        lastMonthRevenue: toNumber(lastMonthData?.revenue),
        lastMonthTransactionCount: toCount(lastMonthData?.count),
        lastMonthAverageTransaction: toCount(lastMonthData?.count) > 0 ? toNumber(lastMonthData?.revenue) / toCount(lastMonthData?.count) : 0,
        lastMonthQuantitySold: toCount(lastMonthData?.quantity),
        lastMonthTopLocation: topLocationLastMonth[0]?.location_name || '',
        lastMonthTopLocationRevenue: toNumber(topLocationLastMonth[0]?.revenue),
        lastMonthBestWeek: '', // Will need additional query for this
        lastMonthBestWeekRevenue: 0,
        // Location metrics
        hqTotalRevenue: getLocationRevenue('HQ'),
        yongeTotalRevenue: getLocationRevenue('Yonge'),
        bloorTotalRevenue: getLocationRevenue('Bloor'),
        kingstonTotalRevenue: getLocationRevenue('Kingston'),
        wellTotalRevenue: getLocationRevenue('The Well'),
        broadwayTotalRevenue: getLocationRevenue('Broadway'),
        hqTotalTransactions: getLocationTransactions('HQ'),
        yongeTotalTransactions: getLocationTransactions('Yonge'),
        bloorTotalTransactions: getLocationTransactions('Bloor'),
        kingstonTotalTransactions: getLocationTransactions('Kingston'),
        wellTotalTransactions: getLocationTransactions('The Well'),
        broadwayTotalTransactions: getLocationTransactions('Broadway'),
        // Location rankings
        topPerformingLocation: locationStats[0]?.location_name || '',
        topPerformingLocationRevenue: toNumber(locationStats[0]?.revenue),
        lowestPerformingLocation: locationStats[locationStats.length - 1]?.location_name || '',
        lowestPerformingLocationRevenue: toNumber(locationStats[locationStats.length - 1]?.revenue),
        hqVsYongeRevenueDifference: Math.abs(getLocationRevenue('HQ') - getLocationRevenue('Yonge')),
        bloorVsKingstonRevenueDifference: Math.abs(getLocationRevenue('Bloor') - getLocationRevenue('Kingston')),
        topThreeLocationsRevenue: locationStats.slice(0, 3).reduce((sum, loc) => sum + toNumber(loc.revenue), 0),
        bottomThreeLocationsRevenue: locationStats.slice(-3).reduce((sum, loc) => sum + toNumber(loc.revenue), 0),
        averageLocationRevenue,
        locationRevenueStandardDeviation,
        busiesLocationByTransactionCount: Array.from(locationMap.values()).sort((a, b) => b.transactions - a.transactions)[0]?.name || '',
        quietestLocationByTransactionCount: Array.from(locationMap.values()).sort((a, b) => a.transactions - b.transactions)[0]?.name || '',
        locationWithHighestAverageTransaction: Array.from(locationMap.values()).map(l => ({
            name: l.name,
            avg: l.transactions > 0 ? l.revenue / l.transactions : 0
        })).sort((a, b) => b.avg - a.avg)[0]?.name || '',
        // Product analytics
        topSellingItemByRevenue: topItem?.item_name || '',
        topSellingItemRevenue: toNumber(topItem?.revenue),
        topSellingItemByQuantity: topItemByQty?.item_name || '',
        topSellingItemQuantity: toCount(topItemByQty?.quantity),
        topSellingItemByTransactionCount: '', // Would need additional query
        totalUniqueItemsSold: 0, // Will calculate from item analysis
        averageItemPrice: 0, // Will calculate
        highestPricedItemSold: '',
        highestPricedItemPrice: 0,
        mostPopularCategory: categoryAnalysis[0]?.category || '',
        averageQuantityPerTransaction: toCount(overallData.count) > 0 ? toCount(overallData.quantity) / toCount(overallData.count) : 0,
        // Item location analysis
        topItemAtHQ: locationItemMap.get('HQ')?.item || '',
        topItemAtYonge: locationItemMap.get('Yonge')?.item || '',
        topItemAtBloor: locationItemMap.get('Bloor')?.item || '',
        topItemRevenueAtHQ: locationItemMap.get('HQ')?.revenue || 0,
        topItemRevenueAtYonge: locationItemMap.get('Yonge')?.revenue || 0,
        topItemRevenueAtBloor: locationItemMap.get('Bloor')?.revenue || 0,
        itemWithMostLocations: '',
        itemSoldAtAllLocations: false,
        locationWithMostUniqueItems: '',
        // Business metrics
        totalAllTimeRevenue: toNumber(overallData.revenue),
        totalAllTimeTransactions: toCount(overallData.count),
        overallAverageTransaction: toCount(overallData.count) > 0 ? toNumber(overallData.revenue) / toCount(overallData.count) : 0,
        revenueGrowthLastWeekVsPrevious: 0, // Will calculate from previous week data
        revenueGrowthLastMonthVsPrevious: 0,
        highestDailyRevenue: 0,
        highestDailyRevenueDate: '',
        lowestDailyRevenue: 0,
        averageDailyRevenue: 0, // Will calculate based on date range
        averageWeeklyRevenue: 0,
        averageMonthlyRevenue: 0,
        peakHour: '',
        peakHourRevenue: 0,
        weekdayVsWeekendRevenue: 0,
        averageItemsPerTransaction: toCount(overallData.count) > 0 ? toCount(overallData.quantity) / toCount(overallData.count) : 0,
        // Complex aggregations
        revenueByLocationAndCategory: revenueByLocationAndCategory,
        monthlyRevenueByLocation: {},
        topItemsPerLocation: Object.fromEntries(Array.from(locationItemMap.entries()).map(([loc, data]) => [loc, data.item])),
        locationMarketShare,
        seasonalTrends: {},
        hqMarketSharePercentage: locationMarketShare['HQ'] || 0,
        topItemMarketSharePercentage: 0,
        repeatCustomerRate: 0,
        averageTransactionGrowthRate: 0,
        locationEfficiencyRatio: {},
        // Metadata
        calculationTimestamp: new Date(),
        totalQueryTime,
        datasetSize: {
            totalOrders: toCount(overallData.count),
            totalLineItems: toCount(overallData.total_line_items),
            dateRange: {
                earliest: overallData.earliest_date,
                latest: overallData.latest_date
            }
        }
    };
    return groundTruth;
}
async function disconnectPrismaV3() {
    await prisma_1.default.$disconnect();
}
