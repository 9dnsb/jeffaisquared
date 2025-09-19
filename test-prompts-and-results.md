# Dynamic Query Testing - Comprehensive Test Prompts and Expected Results

## Test Data Overview
- **Date Range**: March 1, 2024 to September 19, 2025 (~18.6 months)
- **Total Transactions**: ~20,640
- **Total Sales**: ~$131,957
- **Average Transaction**: ~$19.21
- **Locations**: 6 locations with performance multipliers
- **Items**: 8 menu items with varying popularity and prices

## Locations and Expected Performance
| Location | ID | Performance Multiplier | Expected % of Sales |
|----------|----|-----------------------|-------------------|
| HQ (Main) | LZEVY2P88KZA8 | 1.2x | ~20% |
| Yonge | LAH170A0KK47P | 1.1x | ~18% |
| Bloor | LPSSMJYZX8X7P | 1.0x | ~17% |
| The Well | LT8YK4FBNGH17 | 0.9x | ~15% |
| Broadway | LDPNNFWBTFB26 | 0.8x | ~13% |
| Kingston | LYJ3TVBQ23F5V | 0.7x | ~12% |

## Menu Items and Expected Popularity
| Item | Base Price | Weight | Expected % of Sales |
|------|------------|--------|-------------------|
| Brew Coffee | $3.50 | 25 | ~25% |
| Latte | $5.25 | 20 | ~20% |
| Latte - Matcha | $6.50 | 15 | ~15% |
| Latte - Chai | $5.75 | 12 | ~12% |
| L'Americano | $4.25 | 10 | ~10% |
| Dancing Goats | $5.95 | 8 | ~8% |
| Croissant - Ham & Cheese | $7.50 | 6 | ~6% |
| Spinach Feta Danish | $6.25 | 4 | ~4% |

---

## Test Cases

### 1. Simple Aggregate Queries

#### Test 1.1: Basic Total Sales
**Prompt**: "What were our total sales this year?"
**Expected Parameters**:
```json
{
  "dateRanges": [{"period": "2024", "start": "2024-01-01", "end": "2024-12-31"}],
  "locationIds": [],
  "items": [],
  "metrics": ["revenue"],
  "groupBy": [],
  "aggregation": "sum"
}
```
**Expected Result**: ~$120,000-130,000 (most data is in 2024)

#### Test 1.2: Transaction Count
**Prompt**: "How many transactions did we have last month?"
**Expected Parameters**:
```json
{
  "dateRanges": [{"period": "august_2025", "start": "2025-08-01", "end": "2025-08-31"}],
  "locationIds": [],
  "items": [],
  "metrics": ["count"],
  "groupBy": [],
  "aggregation": "count"
}
```
**Expected Result**: ~1,100-1,300 transactions

#### Test 1.3: Average Transaction Value
**Prompt**: "What's our average transaction value this quarter?"
**Expected Parameters**:
```json
{
  "dateRanges": [{"period": "q3_2025", "start": "2025-07-01", "end": "2025-09-30"}],
  "locationIds": [],
  "items": [],
  "metrics": ["avg_transaction"],
  "groupBy": [],
  "aggregation": "avg"
}
```
**Expected Result**: ~$19-21

### 2. Location-Based Queries

#### Test 2.1: Location Comparison
**Prompt**: "Compare sales between Yonge and Bloor locations this month"
**Expected Parameters**:
```json
{
  "dateRanges": [{"period": "september_2025", "start": "2025-09-01", "end": "2025-09-30"}],
  "locationIds": ["LAH170A0KK47P", "LPSSMJYZX8X7P"],
  "items": [],
  "metrics": ["revenue"],
  "groupBy": ["location"],
  "aggregation": "sum"
}
```
**Expected Result**: Yonge (~$3,500) should be ~10% higher than Bloor (~$3,200)

#### Test 2.2: Best Performing Location
**Prompt**: "Which location had the highest sales last quarter?"
**Expected Parameters**:
```json
{
  "dateRanges": [{"period": "q2_2025", "start": "2025-04-01", "end": "2025-06-30"}],
  "locationIds": [],
  "items": [],
  "metrics": ["revenue"],
  "groupBy": ["location"],
  "aggregation": "sum"
}
```
**Expected Result**: HQ should be highest (~$8,000-9,000)

#### Test 2.3: Location Performance Breakdown
**Prompt**: "Show me revenue breakdown by location for August 2024"
**Expected Parameters**:
```json
{
  "dateRanges": [{"period": "august_2024", "start": "2024-08-01", "end": "2024-08-31"}],
  "locationIds": [],
  "items": [],
  "metrics": ["revenue"],
  "groupBy": ["location"],
  "aggregation": "sum"
}
```
**Expected Result**: HQ > Yonge > Bloor > Well > Broadway > Kingston

### 3. Product Analysis Queries

#### Test 3.1: Top Selling Items
**Prompt**: "What are our top 3 items by quantity sold this month?"
**Expected Parameters**:
```json
{
  "dateRanges": [{"period": "september_2025", "start": "2025-09-01", "end": "2025-09-30"}],
  "locationIds": [],
  "items": [],
  "metrics": ["quantity"],
  "groupBy": ["item"],
  "aggregation": "sum",
  "orderBy": {"field": "quantity", "direction": "desc"},
  "limit": 3
}
```
**Expected Result**: 1. Brew Coffee, 2. Latte, 3. Latte - Matcha

#### Test 3.2: Specific Item Sales
**Prompt**: "How many lattes did we sell in July 2024?"
**Expected Parameters**:
```json
{
  "dateRanges": [{"period": "july_2024", "start": "2024-07-01", "end": "2024-07-31"}],
  "locationIds": [],
  "items": ["Latte"],
  "metrics": ["quantity"],
  "groupBy": [],
  "aggregation": "sum"
}
```
**Expected Result**: ~400-500 lattes (20% of items × ~2,500 items in July)

#### Test 3.3: Item Revenue Analysis
**Prompt**: "Show me revenue by item for Q1 2024"
**Expected Parameters**:
```json
{
  "dateRanges": [{"period": "q1_2024", "start": "2024-01-01", "end": "2024-03-31"}],
  "locationIds": [],
  "items": [],
  "metrics": ["revenue"],
  "groupBy": ["item"],
  "aggregation": "sum"
}
```
**Expected Result**: Lattes (regular, matcha, chai) should dominate (~50% of revenue)

### 4. Time-Series Analysis

#### Test 4.1: Monthly Breakdown
**Prompt**: "Show me monthly sales for 2024"
**Expected Parameters**:
```json
{
  "dateRanges": [{"period": "2024", "start": "2024-01-01", "end": "2024-12-31"}],
  "locationIds": [],
  "items": [],
  "metrics": ["revenue"],
  "groupBy": ["month"],
  "aggregation": "sum"
}
```
**Expected Result**: Winter months (Dec, Jan, Feb) should be highest due to 1.2x multiplier

#### Test 4.2: Day of Week Analysis
**Prompt**: "Compare weekday vs weekend sales this quarter"
**Expected Parameters**:
```json
{
  "dateRanges": [{"period": "q3_2025", "start": "2025-07-01", "end": "2025-09-30"}],
  "locationIds": [],
  "items": [],
  "metrics": ["revenue"],
  "groupBy": ["day_of_week"],
  "aggregation": "sum"
}
```
**Expected Result**: Weekdays should be ~43% higher than weekends (1.0 vs 0.7 multiplier)

#### Test 4.3: Daily Sales Trend
**Prompt**: "Show me daily sales for the last 30 days"
**Expected Parameters**:
```json
{
  "dateRanges": [{"period": "last_30_days", "start": "2025-08-20", "end": "2025-09-19"}],
  "locationIds": [],
  "items": [],
  "metrics": ["revenue"],
  "groupBy": ["day"],
  "aggregation": "sum"
}
```
**Expected Result**: ~$700-800 per day average

### 5. Complex Comparison Queries

#### Test 5.1: Period Comparison
**Prompt**: "Compare August vs September 2024 sales"
**Expected Parameters**:
```json
{
  "dateRanges": [
    {"period": "august_2024", "start": "2024-08-01", "end": "2024-08-31"},
    {"period": "september_2024", "start": "2024-09-01", "end": "2024-09-30"}
  ],
  "locationIds": [],
  "items": [],
  "metrics": ["revenue"],
  "groupBy": [],
  "aggregation": "sum"
}
```
**Expected Result**: September should be ~37.5% higher (0.8 vs 1.1 seasonal multiplier)

#### Test 5.2: Item Comparison Across Locations
**Prompt**: "Compare latte sales between Yonge and Bloor in Q2 2024"
**Expected Parameters**:
```json
{
  "dateRanges": [{"period": "q2_2024", "start": "2024-04-01", "end": "2024-06-30"}],
  "locationIds": ["LAH170A0KK47P", "LPSSMJYZX8X7P"],
  "items": ["Latte"],
  "metrics": ["revenue", "quantity"],
  "groupBy": ["location"],
  "aggregation": "sum"
}
```
**Expected Result**: Yonge should be ~10% higher in both revenue and quantity

#### Test 5.3: Multi-Dimensional Analysis
**Prompt**: "Show me latte sales by location and month for 2024"
**Expected Parameters**:
```json
{
  "dateRanges": [{"period": "2024", "start": "2024-01-01", "end": "2024-12-31"}],
  "locationIds": [],
  "items": ["Latte"],
  "metrics": ["revenue"],
  "groupBy": ["location", "month"],
  "aggregation": "sum"
}
```
**Expected Result**: Complex matrix showing seasonal and location variations

### 6. Edge Cases and Ambiguous Queries

#### Test 6.1: Ambiguous Time Reference
**Prompt**: "What were sales last month?"
**Expected Behavior**: Should interpret as most recent complete month
**Expected Parameters**: Should use August 2025 as "last month" from September 2025

#### Test 6.2: Misspelled Items
**Prompt**: "How many latees did we sell?"
**Expected Behavior**: Should correctly identify "latees" as "Latte"

#### Test 6.3: Informal Location Names
**Prompt**: "Sales at the main location this week"
**Expected Behavior**: Should map "main location" to HQ (LZEVY2P88KZA8)

#### Test 6.4: Vague Request
**Prompt**: "Tell me about our business performance"
**Expected Behavior**: Should provide general overview with total sales, transactions, and top metrics

---

## Expected Issues to Address

### 1. Date Parsing Edge Cases
- Relative dates ("last month", "this quarter")
- Year boundaries (Dec 2024 vs Jan 2025)
- Current date context awareness

### 2. Location Keyword Mapping
- Ensure all aliases work correctly
- Handle partial matches and typos

### 3. Item Name Matching
- Case insensitive matching
- Handle variations in item names
- Fuzzy matching for typos

### 4. Metric Calculations
- Ensure proper aggregation for complex groupings
- Handle missing data gracefully
- Verify calculation accuracy for averages

### 5. Query Strategy Selection
- Optimize for complex queries
- Proper fallbacks when queries fail
- Performance considerations for large datasets

---

## Testing Protocol

1. **Setup**: Ensure fresh seed data is available
2. **Execute**: Run each test prompt through the AI system
3. **Validate**: Compare actual results with expected ranges
4. **Debug**: For mismatches, examine:
   - Parameter extraction accuracy
   - Query execution logic
   - Data calculation correctness
5. **Fix**: Update relevant components and retest
6. **Document**: Record final results and any system improvements