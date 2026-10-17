import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    // Run simple query to verify connection
    await prisma.$queryRaw`SELECT 1`
    return NextResponse.json({
      status: 'connected',
      message: 'PostgreSQL database connected successfully via Prisma',
      timestamp: new Date().toISOString(),
    })
  } catch (error: unknown) {
    const err = error as Error
    return NextResponse.json(
      {
        status: 'pending_configuration',
        message: 'Could not connect to database with current credentials in .env.',
        details: err.message,
        hint: 'Please update DATABASE_URL in your .env file with your PostgreSQL master password.',
      },
      { status: 200 }
    )
  }
}
