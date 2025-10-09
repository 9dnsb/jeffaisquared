/**
 * Schema Documentation Generator
 * Parses Prisma schema and generates human-readable descriptions for embeddings
 *
 * Usage: npx tsx scripts/generate-schema-docs.ts
 */

import { readFileSync } from 'fs'
import { join } from 'path'

// Schema object types
type SchemaObjectType = 'table' | 'column' | 'relationship' | 'index'

// Schema documentation entry
interface SchemaDoc {
  objectName: string
  objectType: SchemaObjectType
  description: string
}

// Prisma field information
interface PrismaField {
  name: string
  type: string
  isArray: boolean
  isOptional: boolean
  isRelation: boolean
  relationTo?: string
  relationName?: string
  comment?: string
  defaultValue?: string
  isUnique?: boolean
  isId?: boolean
}

// Prisma model information
interface PrismaModel {
  name: string
  tableName: string
  fields: PrismaField[]
  indexes: string[]
  relations: string[]
  comment?: string
}

/**
 * Parse Prisma schema file
 */
function parsePrismaSchema(schemaPath: string): PrismaModel[] {
  const schemaContent = readFileSync(schemaPath, 'utf-8')
  const models: PrismaModel[] = []

  // Split into model blocks
  const modelRegex = /model\s+(\w+)\s*\{([^}]+)\}/g
  let match

  while ((match = modelRegex.exec(schemaContent)) !== null) {
    const modelName = match[1]
    const modelBody = match[2]

    // Skip SchemaEmbedding (we don't need to embed ourselves)
    if (modelName === 'SchemaEmbedding') {
      continue
    }

    const model: PrismaModel = {
      name: modelName,
      tableName: extractTableName(modelBody) || modelName.toLowerCase() + 's',
      fields: [],
      indexes: [],
      relations: [],
    }

    // Parse fields
    const lines = modelBody.split('\n')
    for (const line of lines) {
      const trimmed = line.trim()

      // Skip empty lines and comments
      if (!trimmed || trimmed.startsWith('//')) {
        continue
      }

      // Parse field
      if (!trimmed.startsWith('@@')) {
        const field = parseField(trimmed, modelName)
        if (field) {
          model.fields.push(field)

          // Track relations
          if (field.isRelation && field.relationTo) {
            model.relations.push(field.relationTo)
          }
        }
      }

      // Parse indexes
      if (trimmed.startsWith('@@index')) {
        model.indexes.push(trimmed)
      }

      // Parse table mapping
      if (trimmed.startsWith('@@map')) {
        const mapMatch = trimmed.match(/@@map\("([^"]+)"\)/)
        if (mapMatch) {
          model.tableName = mapMatch[1]
        }
      }
    }

    models.push(model)
  }

  return models
}

/**
 * Extract table name from model body
 */
function extractTableName(modelBody: string): string | null {
  const mapMatch = modelBody.match(/@@map\("([^"]+)"\)/)
  return mapMatch ? mapMatch[1] : null
}

/**
 * Parse a Prisma field line
 */
function parseField(line: string, modelName: string): PrismaField | null {
  // Basic field pattern: fieldName Type modifiers
  const fieldMatch = line.match(/^(\w+)\s+(\w+)(\[\])?([\?\!])?/)
  if (!fieldMatch) {
    return null
  }

  const fieldName = fieldMatch[1]
  const fieldType = fieldMatch[2]
  const isArray = !!fieldMatch[3]
  const isOptional = fieldMatch[4] === '?'

  const field: PrismaField = {
    name: fieldName,
    type: fieldType,
    isArray,
    isOptional,
    isRelation: false,
  }

  // Check if it's a relation field
  const relationMatch = line.match(/@relation\(/)
  if (relationMatch) {
    field.isRelation = true
    field.relationTo = fieldType
  }

  // Check for @id
  if (line.includes('@id')) {
    field.isId = true
  }

  // Check for @unique
  if (line.includes('@unique')) {
    field.isUnique = true
  }

  // Check for @default
  const defaultMatch = line.match(/@default\(([^)]+)\)/)
  if (defaultMatch) {
    field.defaultValue = defaultMatch[1]
  }

  // Extract inline comments
  const commentMatch = line.match(/\/\/\s*(.+)$/)
  if (commentMatch) {
    field.comment = commentMatch[1].trim()
  }

  return field
}

/**
 * Generate description for a table
 */
function generateTableDescription(model: PrismaModel): string {
  const parts: string[] = []

  // Basic description
  parts.push(`Table: ${model.tableName}`)
  parts.push(`Model: ${model.name}`)

  // Purpose/description
  const purpose = getTablePurpose(model.name, model.fields)
  parts.push(`Description: ${purpose}`)

  // Key fields summary
  const keyFields = model.fields
    .filter(f => !f.isRelation && (f.isId || f.isUnique || isKeyField(f.name)))
    .map(f => f.name)
  if (keyFields.length > 0) {
    parts.push(`Key fields: ${keyFields.join(', ')}`)
  }

  // Relations
  if (model.relations.length > 0) {
    const relDesc = model.relations.map(r => `${r}`).join(', ')
    parts.push(`Related tables: ${relDesc}`)
  }

  // Indexes
  if (model.indexes.length > 0) {
    parts.push(`Indexes: Optimized for ${getIndexPurpose(model.indexes)}`)
  }

  return parts.join('. ')
}

/**
 * Generate description for a column
 */
function generateColumnDescription(
  model: PrismaModel,
  field: PrismaField
): string {
  const parts: string[] = []

  // Column identifier
  parts.push(`Column: ${model.tableName}.${field.name}`)

  // Type information
  const typeDesc = getTypeDescription(field)
  parts.push(`Type: ${typeDesc}`)

  // Purpose
  const purpose = getFieldPurpose(field.name, field.type, model.name)
  parts.push(`Purpose: ${purpose}`)

  // Constraints
  const constraints: string[] = []
  if (field.isId) constraints.push('Primary key')
  if (field.isUnique) constraints.push('Unique')
  if (!field.isOptional) constraints.push('Required')
  if (field.defaultValue) constraints.push(`Default: ${field.defaultValue}`)
  if (constraints.length > 0) {
    parts.push(`Constraints: ${constraints.join(', ')}`)
  }

  // Inline comment if available
  if (field.comment) {
    parts.push(`Note: ${field.comment}`)
  }

  return parts.join('. ')
}

/**
 * Generate description for a relationship
 */
function generateRelationshipDescription(
  model: PrismaModel,
  field: PrismaField
): string {
  const parts: string[] = []

  parts.push(`Relationship: ${model.tableName}.${field.name}`)
  parts.push(`Type: ${model.name} → ${field.relationTo}`)

  // Determine relationship type
  const relType = field.isArray ? 'One-to-many' : 'Many-to-one'
  parts.push(`Cardinality: ${relType}`)

  // Purpose
  const purpose = getRelationshipPurpose(model.name, field.name, field.relationTo!)
  parts.push(`Purpose: ${purpose}`)

  return parts.join('. ')
}

/**
 * Generate description for an index
 */
function generateIndexDescription(
  model: PrismaModel,
  indexDef: string
): string {
  const parts: string[] = []

  // Extract field names from index
  const fieldsMatch = indexDef.match(/\[([^\]]+)\]/)
  const fields = fieldsMatch ? fieldsMatch[1].split(',').map(f => f.trim()) : []

  parts.push(`Index: ${model.tableName} on ${fields.join(', ')}`)

  // Purpose
  const purpose = getIndexQueryPurpose(fields, model.name)
  parts.push(`Purpose: ${purpose}`)

  // Extract comment if available
  const commentMatch = indexDef.match(/\/\/\s*(.+)$/)
  if (commentMatch) {
    parts.push(`Note: ${commentMatch[1].trim()}`)
  }

  return parts.join('. ')
}

/**
 * Determine table purpose based on model name and fields
 */
function getTablePurpose(modelName: string, fields: PrismaField[]): string {
  const purposes: Record<string, string> = {
    Profile:
      'User profile information including email and personal details',
    Category:
      'Product categories for organizing items in the catalog',
    Location:
      'Physical business locations with address and timezone information',
    Item: 'Product catalog containing all available items with pricing and category',
    Order:
      'Customer purchase orders with transaction details, amounts, and status',
    LineItem:
      'Individual items within each order with quantities and pricing details',
    Conversation: 'Chat conversation threads between users and AI assistant',
    ChatMessage:
      'Individual messages within conversations including user queries and AI responses',
  }

  return (
    purposes[modelName] ||
    `Stores ${modelName.toLowerCase()} data with ${fields.length} fields`
  )
}

/**
 * Determine field purpose based on field name and type
 */
function getFieldPurpose(
  fieldName: string,
  fieldType: string,
  modelName: string
): string {
  // Common patterns
  if (fieldName === 'id') return 'Unique identifier for this record'
  if (fieldName.endsWith('Id') && fieldName !== 'id')
    return `Foreign key reference to ${fieldName.replace('Id', '')} table`
  if (fieldName === 'createdAt') return 'Timestamp when record was created'
  if (fieldName === 'updatedAt')
    return 'Timestamp when record was last updated'
  if (fieldName === 'email') return 'Email address'
  if (fieldName === 'name') return 'Display name'
  if (fieldName.includes('Amount')) return 'Monetary amount in cents'
  if (fieldName.includes('quantity')) return 'Quantity or count'
  if (fieldName === 'date') return 'Transaction date and time'
  if (fieldName === 'state' || fieldName === 'status')
    return 'Current status or state'
  if (fieldName.includes('Price')) return 'Price value in cents'
  if (fieldName === 'currency') return 'Currency code (e.g., USD)'
  if (fieldName === 'category') return 'Category classification'
  if (fieldName.includes('square')) return 'Square API identifier'

  // Type-based defaults
  if (fieldType === 'String') return `Text field for ${fieldName}`
  if (fieldType === 'Int') return `Numeric value for ${fieldName}`
  if (fieldType === 'DateTime') return `Date/time value for ${fieldName}`
  if (fieldType === 'Boolean') return `Boolean flag for ${fieldName}`
  if (fieldType === 'Json') return `JSON data for ${fieldName}`

  return `Field storing ${fieldName} information`
}

/**
 * Get type description for a field
 */
function getTypeDescription(field: PrismaField): string {
  let desc = field.type
  if (field.isArray) desc += ' array'
  if (field.isOptional) desc += ' (optional)'
  return desc
}

/**
 * Determine relationship purpose
 */
function getRelationshipPurpose(
  fromModel: string,
  fieldName: string,
  toModel: string
): string {
  const purposes: Record<string, string> = {
    'Order-Location': 'Links each order to the location where it was placed',
    'LineItem-Order':
      'Associates line items with their parent order transaction',
    'LineItem-Item':
      'References the catalog item for pricing and product details',
    'Item-Category': 'Categorizes items for organization and filtering',
    'ChatMessage-Conversation':
      'Groups messages into conversation threads',
  }

  const key = `${fromModel}-${toModel}`
  return (
    purposes[key] ||
    `Establishes relationship between ${fromModel} and ${toModel}`
  )
}

/**
 * Determine if field name indicates a key field
 */
function isKeyField(fieldName: string): boolean {
  const keyFields = [
    'id',
    'email',
    'name',
    'date',
    'totalAmount',
    'quantity',
    'state',
  ]
  return keyFields.includes(fieldName)
}

/**
 * Get index purpose summary
 */
function getIndexPurpose(indexes: string[]): string {
  const purposes: string[] = []

  for (const idx of indexes) {
    if (idx.includes('date')) purposes.push('date-based queries')
    if (idx.includes('location')) purposes.push('location filtering')
    if (idx.includes('item')) purposes.push('item lookups')
    if (idx.includes('name')) purposes.push('name searches')
    if (idx.includes('category')) purposes.push('category filtering')
  }

  return purposes.length > 0
    ? purposes.join(', ')
    : 'efficient data retrieval'
}

/**
 * Get specific query purpose for an index
 */
function getIndexQueryPurpose(fields: string[], modelName: string): string {
  const fieldStr = fields.join('+')

  const purposes: Record<string, string> = {
    date: 'Fast filtering and sorting by date/time',
    'locationId+date': 'Location-specific queries with date range filtering',
    'date+locationId': 'Date range queries with location breakdown',
    'locationId+totalAmount': 'Location-based revenue aggregations',
    'date+totalAmount': 'Time-based revenue calculations',
    'orderId+itemId': 'Order line item lookups',
    'itemId+totalPriceAmount': 'Item revenue and sales analysis',
    name: 'Fast text search by name',
    category: 'Category-based filtering and grouping',
  }

  return (
    purposes[fieldStr] ||
    purposes[fields[0]] ||
    `Optimizes queries filtering by ${fields.join(' and ')}`
  )
}

/**
 * Generate all schema documentation
 */
export function generateSchemaDocumentation(): SchemaDoc[] {
  const schemaPath = join(process.cwd(), 'prisma', 'schema.prisma')
  const models = parsePrismaSchema(schemaPath)
  const docs: SchemaDoc[] = []

  for (const model of models) {
    // 1. Table documentation
    docs.push({
      objectName: model.tableName,
      objectType: 'table',
      description: generateTableDescription(model),
    })

    // 2. Column documentation
    for (const field of model.fields) {
      if (!field.isRelation) {
        docs.push({
          objectName: `${model.tableName}.${field.name}`,
          objectType: 'column',
          description: generateColumnDescription(model, field),
        })
      }
    }

    // 3. Relationship documentation
    for (const field of model.fields) {
      if (field.isRelation) {
        docs.push({
          objectName: `${model.tableName}.${field.name}`,
          objectType: 'relationship',
          description: generateRelationshipDescription(model, field),
        })
      }
    }

    // 4. Index documentation
    for (const indexDef of model.indexes) {
      docs.push({
        objectName: `${model.tableName}_index`,
        objectType: 'index',
        description: generateIndexDescription(model, indexDef),
      })
    }
  }

  // 5. Common query patterns documentation (for RAG retrieval)
  docs.push({
    objectName: 'query_pattern_date_calculations',
    objectType: 'index',
    description:
      'Common date calculation patterns for PostgreSQL queries in sales analytics. ' +
      'CRITICAL: For "last [day of week]" queries (e.g., "last Wednesday", "last Monday"), ' +
      'calculate the exact date of the most recent occurrence of that weekday. ' +
      'PostgreSQL day of week: EXTRACT(DOW FROM date) returns 0=Sunday, 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday, 6=Saturday. ' +
      'Formula for last occurrence of a weekday: CURRENT_DATE - ((EXTRACT(DOW FROM CURRENT_DATE)::int - target_dow + 7) % 7 + CASE WHEN EXTRACT(DOW FROM CURRENT_DATE) = target_dow THEN 7 ELSE 0 END) ' +
      'where target_dow is the target day number (0-6). ' +
      'Examples: ' +
      'Last Sunday: CURRENT_DATE - ((EXTRACT(DOW FROM CURRENT_DATE)::int - 0 + 7) % 7 + CASE WHEN EXTRACT(DOW FROM CURRENT_DATE) = 0 THEN 7 ELSE 0 END). ' +
      'Last Monday: CURRENT_DATE - ((EXTRACT(DOW FROM CURRENT_DATE)::int - 1 + 7) % 7 + CASE WHEN EXTRACT(DOW FROM CURRENT_DATE) = 1 THEN 7 ELSE 0 END). ' +
      'Last Tuesday: CURRENT_DATE - ((EXTRACT(DOW FROM CURRENT_DATE)::int - 2 + 7) % 7 + CASE WHEN EXTRACT(DOW FROM CURRENT_DATE) = 2 THEN 7 ELSE 0 END). ' +
      'Last Wednesday: CURRENT_DATE - ((EXTRACT(DOW FROM CURRENT_DATE)::int - 3 + 7) % 7 + CASE WHEN EXTRACT(DOW FROM CURRENT_DATE) = 3 THEN 7 ELSE 0 END). ' +
      'Last Thursday: CURRENT_DATE - ((EXTRACT(DOW FROM CURRENT_DATE)::int - 4 + 7) % 7 + CASE WHEN EXTRACT(DOW FROM CURRENT_DATE) = 4 THEN 7 ELSE 0 END). ' +
      'Last Friday: CURRENT_DATE - ((EXTRACT(DOW FROM CURRENT_DATE)::int - 5 + 7) % 7 + CASE WHEN EXTRACT(DOW FROM CURRENT_DATE) = 5 THEN 7 ELSE 0 END). ' +
      'Last Saturday: CURRENT_DATE - ((EXTRACT(DOW FROM CURRENT_DATE)::int - 6 + 7) % 7 + CASE WHEN EXTRACT(DOW FROM CURRENT_DATE) = 6 THEN 7 ELSE 0 END). ' +
      'NEVER use (CURRENT_DATE - INTERVAL \'1 day\') AND EXTRACT(DOW FROM date) = X as this only works if yesterday was that day. ' +
      'Always calculate the exact date using the formula above for accurate results.',
  })

  return docs
}

/**
 * Main execution
 */
async function main(): Promise<void> {
  console.log('🔍 Generating Schema Documentation\n')
  console.log('=' .repeat(80))

  const docs = generateSchemaDocumentation()

  console.log(`\n✅ Generated ${docs.length} schema documentation entries:\n`)

  // Group by type
  const byType = docs.reduce(
    (acc, doc) => {
      acc[doc.objectType] = (acc[doc.objectType] || 0) + 1
      return acc
    },
    {} as Record<string, number>
  )

  console.log('Summary:')
  for (const [type, count] of Object.entries(byType)) {
    console.log(`  - ${count} ${type}${count === 1 ? '' : 's'}`)
  }

  console.log('\n' + '='.repeat(80))
  console.log('\nSample Documentation Entries:\n')

  // Show first 3 of each type
  const types: SchemaObjectType[] = ['table', 'column', 'relationship', 'index']
  for (const type of types) {
    const samples = docs.filter(d => d.objectType === type).slice(0, 2)
    if (samples.length > 0) {
      console.log(`\n📌 ${type.toUpperCase()}:`)
      for (const sample of samples) {
        console.log(`\n${sample.objectName}:`)
        console.log(`  ${sample.description}`)
      }
    }
  }

  console.log('\n' + '='.repeat(80))
  console.log(
    '\n✨ Next: Run generate-embeddings script to create vector embeddings\n'
  )

  // Return docs for use by other scripts
  return
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error)
}
