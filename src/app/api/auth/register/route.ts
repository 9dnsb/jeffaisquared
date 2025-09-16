import { NextRequest } from 'next/server'
import { handleRegistration } from '@/lib/registration-handler'
import { PrismaClient } from '../../../../generated/prisma'

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
  return handleRegistration(request, prisma)
}