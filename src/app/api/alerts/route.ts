import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/root-lib/prisma'
import { authenticateUser, authenticateAndVerifyResource, handleRouteError } from '../../../lib/auth-api-utils'

/**
 * GET /api/alerts - List user's alerts
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Authenticate user
    const authResult = await authenticateUser()
    if (authResult.error) return authResult.error

    const userId = authResult.userId

    const alerts = await prisma.alertRule.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        notifications: {
          take: 5,
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    return NextResponse.json({ success: true, alerts })
  } catch (err) {
    return handleRouteError(err, '[GET /api/alerts]')
  }
}

/**
 * POST /api/alerts - Create alert manually
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Authenticate user
    const authResult = await authenticateUser()
    if (authResult.error) return authResult.error

    const userId = authResult.userId
    const data = (await request.json()) as {
      name: string
      description?: string
      conditionType: string
      conditionData: Record<string, unknown>
      frequency: string
      isActive?: boolean
    }

    const alert = await prisma.alertRule.create({
      data: {
        userId,
        name: data.name,
        description: data.description,
        conditionType: data.conditionType,
        conditionData: JSON.parse(JSON.stringify(data.conditionData)),
        frequency: data.frequency,
        isActive: data.isActive ?? true,
      },
    })

    return NextResponse.json({ success: true, alert }, { status: 201 })
  } catch (err) {
    return handleRouteError(err, '[POST /api/alerts]')
  }
}

/**
 * PATCH /api/alerts?id=xxx - Update alert
 */
export async function PATCH(request: NextRequest): Promise<NextResponse> {
  try {
    // Authenticate and verify ownership
    const result = await authenticateAndVerifyResource(request, 'alert', 'Alert')
    if (result.error) return result.error

    const { resourceId: id } = result

    const data = (await request.json()) as Partial<{
      name: string
      description: string
      conditionType: string
      conditionData: Record<string, unknown>
      frequency: string
      isActive: boolean
    }>

    const updateData: {
      name?: string
      description?: string
      conditionType?: string
      conditionData?: unknown
      frequency?: string
      isActive?: boolean
    } = {}

    if (data.name !== undefined) updateData.name = data.name
    if (data.description !== undefined) updateData.description = data.description
    if (data.conditionType !== undefined)
      updateData.conditionType = data.conditionType
    if (data.conditionData !== undefined)
      updateData.conditionData = JSON.parse(JSON.stringify(data.conditionData))
    if (data.frequency !== undefined) updateData.frequency = data.frequency
    if (data.isActive !== undefined) updateData.isActive = data.isActive

    const alert = await prisma.alertRule.update({
      where: { id },
      data: updateData as never,
    })

    return NextResponse.json({ success: true, alert })
  } catch (err) {
    return handleRouteError(err, '[PATCH /api/alerts]')
  }
}

/**
 * DELETE /api/alerts?id=xxx - Delete alert
 */
export async function DELETE(request: NextRequest): Promise<NextResponse> {
  try {
    // Authenticate and verify ownership
    const result = await authenticateAndVerifyResource(request, 'alert', 'Alert')
    if (result.error) return result.error

    const { resourceId: id } = result

    await prisma.alertRule.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    return handleRouteError(err, '[DELETE /api/alerts]')
  }
}
