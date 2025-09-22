# Square Data Sync System

A comprehensive system for fetching and syncing Square transaction data with rate limiting, incremental updates, and upsert capabilities.

## Quick Start

### Initial Setup (2 Years Historical Data)
```bash
# Fetch 2 years of historical data and seed database
node sync-square-data.js full
```

### Daily Updates (Incremental)
```bash
# Fetch only new data since last sync
node sync-square-data.js incremental
```

## System Overview

### 1. Historical Data Fetch (`fetch-historical-square-data-comprehensive.js`)
- Fetches 2 years (730 days) of Square transaction data
- Implements Square-recommended rate limiting with exponential backoff
- Includes randomized delays to prevent thundering herd effects
- Handles 429 rate limit errors gracefully
- Saves data to `historical-data/` JSON files

**Features:**
- ✅ 5 QPS rate limiting (safer than 10 QPS theoretical limit)
- ✅ Exponential backoff: 1s, 2s, 4s, 8s, 16s + random jitter
- ✅ Progress tracking with batch counts and percentages
- ✅ Network error retry with exponential backoff
- ✅ Comprehensive error handling

### 2. Incremental Data Fetch (`fetch-incremental-square-data.js`)
- Fetches only new data since last successful sync
- Uses sync metadata to track progress and avoid gaps
- Saves incremental data to timestamped JSON files
- Automatically handles overlaps to prevent data loss

**Features:**
- ✅ Metadata-driven date range detection
- ✅ 1-hour overlap buffer to prevent gaps
- ✅ Timestamped incremental files
- ✅ Same rate limiting as historical fetch
- ✅ Progress tracking and completion logging

### 3. Enhanced Seed System (`prisma/seed.ts`)
- Supports both full seed and incremental modes
- Uses upsert logic to prevent duplicates
- Handles order updates (Square orders can change state/version)
- Optimized for both scenarios

**Usage:**
```bash
# Full seed (cleans existing data)
npm run db:seed

# Incremental seed (upserts new data)
SEED_MODE=incremental npm run db:seed
# or
npm run db:seed -- --incremental
```

### 4. Unified Sync Wrapper (`sync-square-data.js`)
- Orchestrates the entire sync workflow
- Handles both full and incremental modes
- Shows sync status and progress
- Error handling and logging

## File Structure

```
historical-data/
├── sync-metadata.json          # Tracks sync progress and history
├── locations.json              # Square locations (from initial fetch)
├── categories.json             # Square categories (from initial fetch)
├── items.json                  # Square items (from initial fetch)
├── orders.json                 # Historical orders (from initial fetch)
└── incremental-orders-*.json   # Timestamped incremental data
```

## Sync Metadata Format

```json
{
  "lastSyncTimestamp": "2025-01-20T10:30:00.000Z",
  "lastFullSync": "2025-01-15T08:00:00.000Z",
  "totalOrdersSynced": 15420,
  "dataRanges": {
    "earliest": "2023-01-20T00:00:00.000Z",
    "latest": "2025-01-20T10:30:00.000Z"
  },
  "syncHistory": [
    {
      "timestamp": "2025-01-20T10:30:00.000Z",
      "startDate": "2025-01-19T09:30:00.000Z",
      "endDate": "2025-01-20T10:30:00.000Z",
      "ordersFound": 42,
      "incrementalFile": "incremental-orders-2025-01-20T10-30-00.json"
    }
  ]
}
```

## Rate Limiting Details

Based on Square's official guidance:
- **Base rate**: 200ms between requests (5 QPS, safer than 10 QPS limit)
- **Random jitter**: 0-100ms added to prevent synchronized requests
- **429 handling**: Exponential backoff 1s, 2s, 4s, 8s, 16s + jitter
- **Network errors**: Separate retry logic with exponential backoff

## Workflow Examples

### Initial Setup Workflow
1. Run `node sync-square-data.js full`
2. Fetches 2 years of historical data (~730 days)
3. Seeds database with all historical data
4. Creates sync metadata for future incremental updates

### Daily Update Workflow
1. Run `node sync-square-data.js incremental` (can be automated)
2. Checks sync metadata for last sync time
3. Fetches data from last sync + 1 hour overlap
4. Uses upsert to add only new orders and update existing ones
5. Updates sync metadata with new timestamp

### Handling Gaps
- If incremental sync fails, the next run will automatically fetch missing data
- 1-hour overlap buffer prevents small timing gaps
- Sync metadata tracks all attempted syncs for debugging

## Error Scenarios

### Rate Limiting
- Automatically handled with exponential backoff
- Max 5 retries before failing
- Random jitter prevents thundering herd

### Network Issues
- Separate retry logic for connection problems
- Max 3 retries with exponential backoff
- Clear error messages for debugging

### Data Conflicts
- Upsert logic handles order updates (version changes)
- Line items are upserted by Square UID
- Duplicate orders are updated, not duplicated

## Performance Considerations

### Full Historical Sync
- ~730 days of data across multiple locations
- Rate limited to 5 QPS for safety
- Estimated time: Depends on order volume per location
- Memory efficient: Processes in batches

### Incremental Sync
- Typically fetches 1-24 hours of new data
- Much faster than full sync
- Can run frequently (hourly/daily)
- Minimal database impact due to upserts

## Monitoring and Debugging

### Check Sync Status
```bash
node -e "require('./sync-square-data.js').showSyncStatus()"
```

### View Sync History
```bash
cat historical-data/sync-metadata.json | jq '.syncHistory'
```

### Manual Database Reset
```bash
npm run db:reset  # Resets and re-seeds with historical data
```

## Automation

### Daily Cron Job
```bash
# Add to crontab for daily 6 AM sync
0 6 * * * cd /path/to/project && node sync-square-data.js incremental >> sync.log 2>&1
```

### Hourly Sync (High Volume)
```bash
# Hourly sync for high-volume businesses
0 * * * * cd /path/to/project && node sync-square-data.js incremental >> sync.log 2>&1
```

This system ensures reliable, efficient Square data synchronization without hitting rate limits or creating data gaps.