/**
 * Location keyword mapping service
 * Maps natural language location references to database IDs
 */

import { logger } from '../utils/logger'
import { PrismaClient } from '../../generated/prisma'
import type { LocationMapping } from './types'

export class LocationMapper {
  private locationCache: Map<string, LocationMapping> = new Map()
  private keywordCache: Map<string, string> = new Map()
  private isInitialized = false

  async initialize(prisma: PrismaClient): Promise<void> {
    if (this.isInitialized) return

    try {
      const locations = await prisma.location.findMany({
        select: {
          squareLocationId: true,
          name: true,
        },
      })

      // Define keyword mappings based on test data
      const mappings: LocationMapping[] = [
        {
          id: 'LZEVY2P88KZA8',
          name: 'HQ',
          keywords: [
            'hq',
            'headquarters',
            'main',
            'main location',
            'primary',
            'head office',
          ],
        },
        {
          id: 'LAH170A0KK47P',
          name: 'Yonge',
          keywords: ['yonge', 'yonge street', 'yonge location', 'yonge st'],
        },
        {
          id: 'LPSSMJYZX8X7P',
          name: 'Bloor',
          keywords: ['bloor', 'bloor street', 'bloor location', 'bloor st'],
        },
        {
          id: 'LYJ3TVBQ23F5V',
          name: 'Kingston',
          keywords: ['kingston', 'kingston location'],
        },
        {
          id: 'LT8YK4FBNGH17',
          name: 'The Well',
          keywords: ['well', 'the well', 'well location'],
        },
        {
          id: 'LDPNNFWBTFB26',
          name: 'Broadway',
          keywords: ['broadway', 'broadway location'],
        },
      ]

      // Update with actual location data
      for (const location of locations) {
        const mapping = mappings.find((m) => m.id === location.squareLocationId)
        if (mapping) {
          mapping.name = location.name || mapping.name
          this.locationCache.set(location.squareLocationId, mapping)

          // Build keyword cache
          for (const keyword of mapping.keywords) {
            this.keywordCache.set(keyword.toLowerCase(), location.squareLocationId)
          }
        }
      }

      this.isInitialized = true
      logger.success('Location mapper initialized', undefined, {
        locationCount: this.locationCache.size,
        keywordCount: this.keywordCache.size,
      })
    } catch (err) {
      const error =
        err instanceof Error
          ? err
          : new Error('Failed to initialize location mapper')
      logger.error('Location mapper initialization failed', error)
      throw error
    }
  }

  /**
   * Resolve location keywords to location IDs
   */
  resolveLocations(userInput: string): string[] {
    const input = userInput.toLowerCase()
    const resolvedIds: string[] = []

    // Check for direct keyword matches
    for (const [keyword, locationId] of this.keywordCache.entries()) {
      if (input.includes(keyword)) {
        if (!resolvedIds.includes(locationId)) {
          resolvedIds.push(locationId)
        }
      }
    }

    logger.data('Location resolution completed', undefined, {
      input: userInput.slice(0, 100),
      resolvedCount: resolvedIds.length,
      resolvedIds: resolvedIds.join(', '),
    })

    return resolvedIds
  }

  /**
   * Get location name by ID
   */
  getLocationName(locationId: string): string {
    const mapping = this.locationCache.get(locationId)
    return mapping?.name || locationId
  }

  /**
   * Get all location IDs
   */
  getAllLocationIds(): string[] {
    return Array.from(this.locationCache.keys())
  }

  /**
   * Check if specific locations are mentioned in the query
   */
  hasLocationFilter(userInput: string): boolean {
    const input = userInput.toLowerCase()

    // Check for specific location keywords
    for (const keyword of this.keywordCache.keys()) {
      if (input.includes(keyword)) {
        return true
      }
    }

    return false
  }
}

export const locationMapper = new LocationMapper()
