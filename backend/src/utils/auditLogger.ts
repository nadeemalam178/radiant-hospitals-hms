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

const SENSITIVE_PATTERNS = ['password', 'hash', 'token', 'secret', 'otp', 'authcode', 'credential']

function sanitizeDetails(details?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!details) return undefined
  const sanitized: Record<string, unknown> = {}
  for (const [key, val] of Object.entries(details)) {
    const isSensitive = SENSITIVE_PATTERNS.some(s => key.toLowerCase().includes(s))
    if (isSensitive) {
      sanitized[key] = '[REDACTED]'
    } else if (key.toLowerCase() === 'aadhaar' && typeof val === 'string' && val.length === 12) {
      sanitized[key] = `XXXX-XXXX-${val.slice(-4)}`
    } else if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
      sanitized[key] = sanitizeDetails(val as Record<string, unknown>)
    } else {
      sanitized[key] = val
    }
  }
  return sanitized
}

export async function logAuditEvent(params: LogAuditEventParams): Promise<void> {
  try {
    const ua = Array.isArray(params.userAgent) ? params.userAgent.join(' ') : params.userAgent
    const cleanDetails = sanitizeDetails(params.details)

    await prisma.auditLog.create({
      data: {
        action: params.action,
        actorId: params.actorId,
        actorEmail: params.actorEmail,
        entityName: params.entityName,
        entityId: params.entityId,
        details: cleanDetails as Prisma.InputJsonValue | undefined,
        ipAddress: params.ipAddress,
        userAgent: ua,
      },
    })
  } catch (error) {
    logger.error('Failed to write audit log event', { error, params })
  }
}
