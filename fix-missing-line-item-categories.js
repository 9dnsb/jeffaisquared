require('dotenv').config({ path: '.env.production' }) // Change to .env.development for dev
const { PrismaClient } = require('./src/generated/prisma')

const prisma = new PrismaClient()

async function fixMissingLineItemCategories() {
  try {
    console.log('🔧 FIXING MISSING LINE ITEM CATEGORIES')
    console.log(
      `🗄️ Database: ${
        process.env.DATABASE_URL?.includes('dev') ? 'DEVELOPMENT' : 'PRODUCTION'
      }`
    )
    console.log('')

    // Step 1: Count line items without category
    console.log('📊 Analyzing line items without categories...')
    const lineItemsWithoutCategory = await prisma.lineItem.count({
      where: {
        category: null,
      },
    })

    console.log(
      `❌ Found ${lineItemsWithoutCategory.toLocaleString()} line items without categories`
    )

    if (lineItemsWithoutCategory === 0) {
      console.log('✅ No line items need category fixing!')
      return
    }

    // Step 2: Analyze what data we have to work with
    console.log('🔍 Analyzing available data sources for categories...')

    // Check if we have any line items with categories to see the pattern
    const sampleWithCategories = await prisma.lineItem.findMany({
      where: {
        category: { not: null },
      },
      select: {
        category: true,
        name: true,
      },
      take: 10,
    })

    console.log(`📊 Sample line items WITH categories:`)
    sampleWithCategories.forEach((item, index) => {
      console.log(
        `   ${index + 1}. "${item.name}" -> category: "${item.category}"`
      )
    })

    // Skip analysis section to avoid Prisma syntax issues

    // Step 3: Strategy determination
    console.log('\n📋 Determining fix strategy...')

    // Strategy 1: Use squareCatalogId from related Item
    console.log('🔄 Strategy 1: Using squareCatalogId from related Items...')

    const lineItemsWithItemRelation = await prisma.lineItem.findMany({
      where: {
        category: null,
        itemId: { not: null }, // Has Item relationship
      },
      include: {
        item: {
          select: {
            squareCatalogId: true,
            name: true,
          },
        },
      },
      take: 1000, // Process in batches
    })

    console.log(
      `📦 Found ${lineItemsWithItemRelation.length} line items that can get category from their Item`
    )

    let updatedFromItems = 0
    const BATCH_SIZE = 100

    for (let i = 0; i < lineItemsWithItemRelation.length; i += BATCH_SIZE) {
      const batch = lineItemsWithItemRelation.slice(i, i + BATCH_SIZE)

      console.log(
        `   📋 Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(
          lineItemsWithItemRelation.length / BATCH_SIZE
        )} (${batch.length} line items)`
      )

      for (const lineItem of batch) {
        if (lineItem.item?.squareCatalogId) {
          try {
            await prisma.lineItem.update({
              where: { id: lineItem.id },
              data: { category: lineItem.item.squareCatalogId },
            })
            updatedFromItems++

            if (updatedFromItems % 50 === 0) {
              console.log(
                `   ✅ Updated ${updatedFromItems} line items with Item.squareCatalogId`
              )
            }
          } catch (error) {
            console.warn(
              `   ⚠️ Could not update line item ${lineItem.id}:`,
              error.message
            )
          }
        }
      }
    }

    console.log(
      `✅ Updated ${updatedFromItems} line items using Item.squareCatalogId`
    )

    // Strategy 2: Check for line items with same name that DO have categories
    console.log(
      '\n🔄 Strategy 2: Using categories from line items with same name...'
    )

    // Find line items without category that have "siblings" with categories
    const lineItemsNeedingCategory = await prisma.lineItem.groupBy({
      by: ['name'],
      where: {
        category: null,
      },
      _count: {
        id: true,
      },
    })

    console.log(
      `📦 Found ${lineItemsNeedingCategory.length} unique item names without categories`
    )

    let updatedFromSiblings = 0

    for (let i = 0; i < lineItemsNeedingCategory.length; i += BATCH_SIZE) {
      const batch = lineItemsNeedingCategory.slice(i, i + BATCH_SIZE)

      console.log(
        `   📋 Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(
          lineItemsNeedingCategory.length / BATCH_SIZE
        )} (${batch.length} item names)`
      )

      for (const group of batch) {
        const itemName = group.name

        // Find a line item with the same name that HAS a category
        const siblingWithCategory = await prisma.lineItem.findFirst({
          where: {
            name: itemName,
            category: { not: null },
          },
          select: {
            category: true,
          },
        })

        if (siblingWithCategory?.category) {
          // Update all line items with this name that don't have category
          const updateResult = await prisma.lineItem.updateMany({
            where: {
              name: itemName,
              category: null,
            },
            data: {
              category: siblingWithCategory.category,
            },
          })

          updatedFromSiblings += updateResult.count
          console.log(
            `   ✅ Updated ${updateResult.count} line items for "${itemName}" with category "${siblingWithCategory.category}"`
          )
        }
      }
    }

    console.log(
      `✅ Updated ${updatedFromSiblings} line items using sibling categories`
    )

    // Step 4: Verification
    console.log('\n📊 Verification...')
    const remainingWithoutCategory = await prisma.lineItem.count({
      where: {
        category: null,
      },
    })

    const totalUpdated = updatedFromItems + updatedFromSiblings

    console.log(
      `✅ Successfully updated ${totalUpdated.toLocaleString()} line items with categories`
    )
    console.log(
      `📊 Line items still without categories: ${remainingWithoutCategory.toLocaleString()}`
    )

    if (remainingWithoutCategory === 0) {
      console.log('🎉 All line items now have categories!')
    } else {
      console.log(
        '⚠️ Some line items still need manual attention or may not have Square catalog data'
      )

      // Show some examples of what's left
      const examplesWithoutCategory = await prisma.lineItem.findMany({
        where: {
          category: null,
        },
        select: {
          name: true,
          item: {
            select: {
              name: true,
              squareCatalogId: true,
            },
          },
        },
        take: 10,
      })

      console.log('\n📋 Examples of line items still without categories:')
      examplesWithoutCategory.forEach((item, index) => {
        console.log(
          `   ${index + 1}. "${item.name}" (Item.squareCatalogId: ${
            item.item?.squareCatalogId || 'null'
          })`
        )
      })
    }

    // Step 5: Summary statistics
    console.log('\n📈 Summary:')
    console.log(
      `   🔗 Updated from Item.squareCatalogId: ${updatedFromItems.toLocaleString()}`
    )
    console.log(
      `   👥 Updated from sibling line items: ${updatedFromSiblings.toLocaleString()}`
    )
    console.log(`   📊 Total updated: ${totalUpdated.toLocaleString()}`)
    console.log(
      `   ❌ Still missing: ${remainingWithoutCategory.toLocaleString()}`
    )
  } catch (error) {
    console.error('❌ Error fixing line item categories:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Export for testing, but also allow direct execution
module.exports = { fixMissingLineItemCategories }

// Run if called directly
if (require.main === module) {
  fixMissingLineItemCategories()
    .then(() => {
      console.log('\n✅ Category fix complete!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('\n❌ Category fix failed:', error)
      process.exit(1)
    })
}
