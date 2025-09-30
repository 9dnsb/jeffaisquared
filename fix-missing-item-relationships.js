require('dotenv').config({ path: '.env.production' }) // Change to .env.production for prod
const { PrismaClient } = require('./src/generated/prisma')

const prisma = new PrismaClient()

// Intelligent item categorization (same logic as seed and webhook)
function categorizeItem(itemName, squareCategory = null) {
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

async function fixMissingItemRelationships() {
  try {
    console.log('🔧 FIXING MISSING ITEM RELATIONSHIPS')
    console.log(
      `🗄️ Database: ${
        process.env.DATABASE_URL?.includes('dev') ? 'DEVELOPMENT' : 'PRODUCTION'
      }`
    )
    console.log('')

    // Step 1: Count line items without itemId
    console.log('📊 Analyzing line items without Item relationships...')
    const lineItemsWithoutItems = await prisma.lineItem.count({
      where: {
        itemId: null,
      },
    })

    console.log(
      `❌ Found ${lineItemsWithoutItems.toLocaleString()} line items without Item relationships`
    )

    if (lineItemsWithoutItems === 0) {
      console.log('✅ No line items need fixing!')
      return
    }

    // Step 2: Get unique item names from line items without itemId
    console.log('🔍 Finding unique items that need to be created/linked...')
    const uniqueLineItems = await prisma.lineItem.groupBy({
      by: ['name', 'category'],
      where: {
        itemId: null,
      },
      _count: {
        id: true,
      },
    })

    console.log(
      `📦 Found ${uniqueLineItems.length} unique item names without relationships`
    )

    // Step 3: Process in batches to find/create Items
    console.log('🔍 Looking up existing Items...')
    const BATCH_SIZE = 100
    const itemMap = new Map() // name -> Item

    for (let i = 0; i < uniqueLineItems.length; i += BATCH_SIZE) {
      const batch = uniqueLineItems.slice(i, i + BATCH_SIZE)

      console.log(
        `   📋 Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(
          uniqueLineItems.length / BATCH_SIZE
        )} (${batch.length} items)`
      )

      for (const lineItemGroup of batch) {
        const itemName = lineItemGroup.name
        const category = lineItemGroup.category

        // Try to find existing Item (same logic as our other scripts)
        const searchSquareItemId =
          category || `GENERATED_${itemName.replace(/\s+/g, '_').toUpperCase()}`

        let item = await prisma.item.findUnique({
          where: {
            squareItemId: searchSquareItemId,
          },
        })

        // If not found by squareItemId, try finding by squareCatalogId
        if (!item && category) {
          item = await prisma.item.findUnique({
            where: {
              squareCatalogId: category,
            },
          })
        }

        // If still not found, create the Item
        if (!item) {
          console.log(`   📦 Creating Item for: ${itemName}`)
          const itemData = {
            squareItemId: searchSquareItemId,
            squareCatalogId: category,
            squareCategoryId: null,
            name: itemName,
            category: categorizeItem(itemName),
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
            console.warn(
              `   ⚠️ Could not create item ${itemName}:`,
              error.message
            )
            continue
          }
        }

        if (item) {
          itemMap.set(itemName, item)
          console.log(
            `   ✅ ${itemName} -> Item ID ${item.id} (${lineItemGroup._count.id} line items will be updated)`
          )
        }
      }
    }

    console.log(`\n📊 Successfully mapped ${itemMap.size} items`)

    // Step 4: Update line items in batches
    console.log('🔄 Updating line items with Item relationships...')
    let totalUpdated = 0

    for (const [itemName, item] of itemMap.entries()) {
      console.log(`   🔗 Linking line items for: ${itemName}`)

      const updateResult = await prisma.lineItem.updateMany({
        where: {
          name: itemName,
          itemId: null,
        },
        data: {
          itemId: item.id,
        },
      })

      totalUpdated += updateResult.count
      console.log(
        `   ✅ Updated ${updateResult.count} line items for ${itemName}`
      )
    }

    // Step 5: Verify results
    console.log('\n📊 Verification...')
    const remainingWithoutItems = await prisma.lineItem.count({
      where: {
        itemId: null,
      },
    })

    console.log(
      `✅ Successfully updated ${totalUpdated.toLocaleString()} line items`
    )
    console.log(
      `📊 Line items still without Item relationships: ${remainingWithoutItems.toLocaleString()}`
    )

    if (remainingWithoutItems === 0) {
      console.log('🎉 All line items now have Item relationships!')
    } else {
      console.log('⚠️ Some line items still need manual attention')
    }
  } catch (error) {
    console.error('❌ Error fixing item relationships:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Export for testing, but also allow direct execution
module.exports = { fixMissingItemRelationships }

// Run if called directly
if (require.main === module) {
  fixMissingItemRelationships()
    .then(() => {
      console.log('\n✅ Fix complete!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('\n❌ Fix failed:', error)
      process.exit(1)
    })
}
