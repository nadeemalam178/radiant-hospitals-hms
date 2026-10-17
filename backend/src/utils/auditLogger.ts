import { prisma } from '../config/db'
import { logger } from '../config/logger'
import { Prisma } from '@prisma/client'

export interface LogAuditEventParams {
  action: string
  actorId?: string
  actorEmail?: string
  entityName: string
  entityId?: string
  details?: Record<string, unknown>
  ipAddress?: string
  userAgent?: string | string[]
}

export async function logAuditEvent(params: LogAuditEventParams): Promise<void> {
  try {
    const ua = Array.isArray(params.userAgent) ? params.userAgent.join(' ') : params.userAgent
    await prisma.auditLog.create({
      data: {
        action: params.action,
        actorId: params.actorId,
        actorEmail: params.actorEmail,
        entityName: params.entityName,
        entityId: params.entityId,
        details: params.details as Prisma.InputJsonValue | undefined,
        ipAddress: params.ipAddress,
        userAgent: ua,
      },
    })
  } catch (error) {
    logger.error('Failed to write audit log event', { error, params })
  }
}
