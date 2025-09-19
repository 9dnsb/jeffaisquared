# Dynamic AI-Driven Query System

## Overview

This system transforms natural language requests into dynamic database queries using AI-powered parameter extraction and flexible query building. Instead of hard-coding specific query types, the AI translates user intent into structured parameters that are executed by a dynamic query engine.

## Architecture

### 🧠 **AI-Driven Parameter Extraction**
```
User: "Compare latte sales between Yonge and Bloor in August vs September"
      ↓
AI extracts: {
  items: ["Latte"],
  locationIds: ["LAH170A0KK47P", "LPSSMJYZX8X7P"],
  dateRanges: [
    {period: "august_2024", start: "2024-08-01", end: "2024-08-31"},
    {period: "september_2024", start: "2024-09-01", end: "2024-09-30"}
  ],
  metrics: ["revenue", "quantity"],
  groupBy: ["location", "period"]
}
```

### 🔄 **Three-Tier Processing Pipeline**

1. **Parameter Extraction** (`enhancedParameterExtractor.ts`)
   - AI converts natural language to structured JSON
   - Schema-aware prompts understand your data model
   - Confidence scoring and reasoning

2. **Validation & Repair** (`parameterValidator.ts`)
   - Validates extracted parameters with Zod schemas
   - Repairs common AI extraction errors
   - Intelligent fallbacks when extraction fails

3. **Dynamic Query Execution** (`dynamicQueryBuilder.ts`)
   - Single query engine handles unlimited combinations
   - Supports simple aggregates, grouping, comparisons
   - Standardized result format

## Components

### 📅 **Date Parser** (`dateParser.ts`)
Handles natural language date expressions:
- **Relative dates**: "last month", "yesterday", "this year"
- **Specific dates**: "August 2024", "August 25", "Q1 2024"
- **Comparisons**: "August vs September", "compare Q1 vs Q2"

```typescript
DateParser.parseNaturalLanguage("August 2024")
// Returns: [{period: "august_2024", start: Date(2024-08-01), end: Date(2024-08-31)}]
```

### 🎯 **Parameter Schema** (`dynamicQuery.ts`)
Type-safe parameter definitions with Zod validation:

```typescript
interface QueryParameters {
  dateRanges: DateRange[]           // One or more time periods
  locationIds: string[]             // 6 hard-coded location IDs
  items: string[]                   // Product names from database
  metrics: string[]                 // ["revenue", "quantity", "count", "avg_transaction", ...]
  groupBy: string[]                 // ["location", "item", "month", "day", ...]
  aggregation: "sum" | "avg" | "count" | "max" | "min"
  orderBy?: {field: string, direction: "asc" | "desc"}
  limit?: number
}
```

### 🏗️ **Dynamic Query Builder** (`dynamicQueryBuilder.ts`)
Executes queries based on extracted parameters:

**Query Strategies:**
- **Simple**: No grouping (aggregate summary)
- **Grouped**: Single dimension grouping (by location, time, item)
- **Comparison**: Multiple date ranges
- **Complex**: Multi-dimensional grouping

**Example Query Building:**
```typescript
// Parameters: {groupBy: ["location"], metrics: ["revenue"], dateRanges: [august2024]}
// Builds: SELECT locationId, SUM(totalSales) FROM sales WHERE date BETWEEN ... GROUP BY locationId
```

### 🤖 **AI Parameter Extractor** (`enhancedParameterExtractor.ts`)
Schema-aware AI prompts that understand your business:

```typescript
// AI knows about:
// - 6 specific locations with keywords ("Yonge", "Bloor", "HQ")
// - Available metrics (revenue, quantity, avg_transaction, etc.)
// - Grouping options (location, time periods, items)
// - Your database schema (Sales, SaleItems, Items, Locations)
```

## Supported Query Types

### 📊 **Sales Analytics**
- "What were our sales in August 2024?"
- "Show me revenue last month"
- "Total sales this year vs last year"

### 📍 **Location Performance**
- "Compare sales between Yonge and Bloor locations"
- "Which location performed best last month?"
- "Sales breakdown by location for Q1"

### 🕒 **Time-Series Analysis**
- "Monthly sales breakdown for this year"
- "Show me daily sales last week"
- "Compare weekdays vs weekends"

### 🛍️ **Product Analysis**
- "Top 5 items by revenue last month"
- "How many lattes did we sell in August?"
- "Which items sell best at each location?"

### 🔄 **Complex Comparisons**
- "Compare latte sales between Yonge and Bloor in August vs September"
- "Monthly growth rate for all locations"
- "Top items this quarter vs last quarter"

## Available Metrics

- **revenue**: Total sales amount (sum of totalSales or price×quantity)
- **quantity**: Total units sold (sum of item quantities)
- **count**: Number of transactions
- **avg_transaction**: Average sale amount per transaction
- **items_per_sale**: Average number of items per transaction
- **avg_item_price**: Average price per individual item
- **unique_items**: Count of distinct products sold

## Location Mapping

The system recognizes these location keywords:

| Location ID | Keywords |
|-------------|----------|
| `LZEVY2P88KZA8` | hq, main, head office, headquarters |
| `LAH170A0KK47P` | yonge, yonge street |
| `LPSSMJYZX8X7P` | bloor, bloor street |
| `LT8YK4FBNGH17` | well, the well, spadina |
| `LDPNNFWBTFB26` | broadway |
| `LYJ3TVBQ23F5V` | kingston, brock street |

## Error Handling & Fallbacks

### 🔧 **Parameter Repair**
When AI extraction fails, the system attempts to repair:
- Convert location names to IDs using keyword mapping
- Parse dates using `DateParser` when AI provides raw strings
- Add default metrics when none specified
- Fix malformed parameter structures

### 🛡️ **Graceful Degradation**
- **Low AI confidence** → Use simplified query approach
- **Parameter validation fails** → Apply intelligent fallbacks
- **Database query fails** → Return error with context
- **No data found** → Clear "no results" message

### 📝 **Example Fallback Flow**
```
User: "sales stuff last thingy" (unclear request)
      ↓
AI extraction fails (low confidence)
      ↓
Fallback parameters: {
  dateRanges: [last_30_days],
  locationIds: [],  // all locations
  metrics: ["revenue", "count"],
  groupBy: []       // simple aggregate
}
      ↓
"I used general search parameters since your request was unclear.
 Please be more specific about the time period, location, or items."
```

## Integration Points

### 🔌 **Chat API Integration**
```typescript
// In src/app/api/chat/route.ts
case 'data_query':
  const dataResult = await dynamicDataQueryHandler.processDataQuery({
    userMessage,
    conversationHistory,
    intent: 'data_query'
  })
```

### 📊 **Response Format**
```typescript
interface DataQueryResult {
  success: boolean
  summary: string                    // Natural language response
  data?: QueryResultRow[]           // Structured data
  queryPlan: string                 // Query strategy used
  queryType: string                 // Legacy compatibility
  recordCount?: number              // Number of results
  metadata: {
    processingTime: number
    model: string
    filters: Record<string, any>
  }
}
```

## Performance Considerations

### ⚡ **Query Optimization**
- Limits: 1000 max records, configurable per query
- Indexing: Queries use existing database indexes on date, locationId
- Caching: 15-minute self-cleaning cache for repeated queries
- Batching: Multiple date ranges executed efficiently

### 🧠 **AI Token Management**
- Uses GPT-4o for complex parameter extraction
- Optimized prompts to minimize token usage
- Confidence-based model selection
- Result summarization to stay within limits

## Future Enhancements

### 🔮 **Planned Features**
- **Multi-dimensional grouping**: Location + time combinations
- **Advanced aggregations**: Percentile calculations, moving averages
- **Predictive queries**: "Forecast next month's sales"
- **Natural language filters**: "Sales on busy days only"

### 🎯 **Optimization Opportunities**
- Query result caching for common patterns
- Pre-computed aggregations for faster responses
- Smart query plan optimization based on data size
- Learning from user query patterns

## Development Guidelines

### 🛠️ **Adding New Metrics**
1. Add to `QueryParametersSchema.metrics` enum
2. Implement calculation in `DynamicQueryBuilder` metric switch
3. Update AI prompt with metric description
4. Add formatting logic in `formatMetric()`

### 📈 **Adding New Grouping Dimensions**
1. Add to `QueryParametersSchema.groupBy` enum
2. Implement grouping logic in appropriate query method
3. Update result formatting to handle new dimension
4. Test with various metric combinations

### 🔍 **Debugging Queries**
- Enable detailed logging: `logger.data()`, `logger.queryExecution()`
- Check AI extraction: Look for confidence scores and reasoning
- Validate parameters: Review validation errors and repair attempts
- Monitor performance: Track processing times and token usage

## Code Quality & Standards

### 📏 **ESLint Configuration**
The dynamic query files use relaxed TypeScript rules due to AI data handling requirements:
- `@typescript-eslint/no-explicit-any`: `warn` (AI responses need `any`)
- `@typescript-eslint/no-unsafe-*`: `warn` (AI parsing inherently unsafe)
- `no-magic-numbers`: Ignores common values (30, 100, 500, 1000)

### 🧪 **Testing Strategy**
- Unit tests for date parsing edge cases
- Parameter validation test suite
- Query building integration tests
- End-to-end AI extraction scenarios

---

## Quick Start Example

```typescript
// Simple usage
const result = await dynamicDataQueryHandler.processDataQuery({
  userMessage: "What were our sales in August 2024?",
  conversationHistory: [],
  intent: 'data_query'
})

console.log(result.summary)
// "In August 2024, you had total sales of $12,456.78 across 234 transactions..."
```

This dynamic system replaces dozens of hard-coded query handlers with a single, intelligent engine that can handle unlimited query variations while maintaining type safety and performance.