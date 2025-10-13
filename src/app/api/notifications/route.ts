import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/root-lib/prisma'
import { authenticateUser, authenticateAndVerifyResource, handleRouteError } from '../../../lib/auth-api-utils'

/**
 * GET /api/notifications - List user's notifications
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Authenticate user
    const authResult = await authenticateUser()
    if (authResult.error) return authResult.error

    const userId = authResult.userId
    const { searchParams } = request.nextUrl
    const status = searchParams.get('status') || 'all'
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    const where: {
      userId: string
      status?: string
    } = {
      userId,
    }

    if (status !== 'all') {
      where.status = status
    }

    // Uses composite index: userId + status + createdAt
    const notifications = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      include: {
        alertRule: {
          select: {
            name: true,
            conditionType: true,
            frequency: true,
          },
        },
      },
    })

    const total = await prisma.notification.count({ where })

    return NextResponse.json({
      success: true,
      notifications,
      total,
      limit,
      offset,
    })
  } catch (err) {
    return handleRouteError(err, '[GET /api/notifications]')
  }
}

/**
 * PATCH /api/notifications?id=xxx - Update notification status
 */
export async function PATCH(request: NextRequest): Promise<NextResponse> {
  try {
    // Authenticate and verify ownership
    const result = await authenticateAndVerifyResource(request, 'notification', 'Notification')
    if (result.error) return result.error

    const { resourceId: id } = result

    const data = (await request.json()) as { status: string }

    const notification = await prisma.notification.update({
      where: { id },
      data: {
        status: data.status,
        updatedAt: new Date(),
      },
    })

    return NextResponse.json({ success: true, notification })
  } catch (err) {
    return handleRouteError(err, '[PATCH /api/notifications]')
  }
}

/**
 * DELETE /api/notifications?id=xxx - Delete notification
 */
export async function DELETE(request: NextRequest): Promise<NextResponse> {
  try {
    // Authenticate and verify ownership
    const result = await authenticateAndVerifyResource(request, 'notification', 'Notification')
    if (result.error) return result.error

    const { resourceId: id } = result

    await prisma.notification.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    return handleRouteError(err, '[DELETE /api/notifications]')
  }
}
