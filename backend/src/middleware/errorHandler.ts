import { Request, Response, NextFunction } from 'express'
import { logger } from '../config/logger'
import { Prisma } from '@prisma/client'

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  logger.error('Unhandled error occurred', {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
  })

  // Prisma unique constraint violation
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      const target = (err.meta?.target as string[])?.join(', ') || 'field'
      res.status(409).json({
        success: false,
        error: 'DUPLICATE_ENTRY',
        message: `A record with this ${target} already exists.`,
      })
      return
    }

    if (err.code === 'P2025') {
      res.status(404).json({
        success: false,
        error: 'NOT_FOUND',
        message: 'The requested resource was not found.',
      })
      return
    }
  }

  // Safe production error response (hide internal stack traces)
  const isDev = process.env.NODE_ENV === 'development'
  res.status(500).json({
    success: false,
    error: 'INTERNAL_SERVER_ERROR',
    message: isDev ? err.message : 'An internal error occurred. Please contact hospital system administrator.',
    ...(isDev && { stack: err.stack }),
  })
}
