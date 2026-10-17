import { Request, Response, NextFunction } from 'express'
import { verifyAccessToken, TokenPayload } from '../utils/tokens'
import { prisma } from '../config/db'
import { RoleName } from '@prisma/client'

// Extend Express Request
declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload & {
        fullName: string
      }
    }
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      error: 'UNAUTHORIZED',
      message: 'Access token is required',
    })
    return
  }

  const token = authHeader.split(' ')[1]

  try {
    const payload = verifyAccessToken(token)

    // Verify user is active in database and not locked
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, status: true, lockoutUntil: true, fullName: true },
    })

    if (!user || user.status !== 'ACTIVE') {
      res.status(401).json({
        success: false,
        error: 'ACCOUNT_INACTIVE',
        message: 'Account is deactivated or does not exist',
      })
      return
    }

    if (user.lockoutUntil && user.lockoutUntil > new Date()) {
      res.status(403).json({
        success: false,
        error: 'ACCOUNT_LOCKED',
        message: `Account is temporarily locked until ${user.lockoutUntil.toLocaleTimeString()}`,
      })
      return
    }

    req.user = {
      ...payload,
      fullName: user.fullName,
    }
    next()
  } catch (error) {
    res.status(401).json({
      success: false,
      error: 'INVALID_TOKEN',
      message: 'Access token is invalid or expired',
    })
  }
}

export function requireRole(...allowedRoles: (RoleName | string)[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'UNAUTHORIZED',
        message: 'Authentication required',
      })
      return
    }

    // SYSTEM_ADMIN has access to all endpoints
    if (req.user.roles.includes('SYSTEM_ADMIN') || req.user.roles.includes('HOSPITAL_ADMIN')) {
      next()
      return
    }

    const hasRole = req.user.roles.some(role => allowedRoles.includes(role))
    if (!hasRole) {
      res.status(403).json({
        success: false,
        error: 'FORBIDDEN',
        message: 'You do not have permission to access this resource',
      })
      return
    }

    next()
  }
}
