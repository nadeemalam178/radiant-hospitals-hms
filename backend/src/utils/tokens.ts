import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { env } from '../config/env'

export interface TokenPayload {
  userId: string
  email: string
  roles: string[]
  jti?: string
}

export function generateAccessToken(payload: TokenPayload): string {
  return jwt.sign(
    { userId: payload.userId, email: payload.email, roles: payload.roles, jti: crypto.randomUUID() },
    env.JWT_SECRET,
    {
      expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
    }
  )
}

export function generateRefreshToken(payload: TokenPayload): string {
  return jwt.sign(
    { userId: payload.userId, email: payload.email, roles: payload.roles, jti: crypto.randomUUID() },
    env.JWT_REFRESH_SECRET,
    {
      expiresIn: env.JWT_REFRESH_EXPIRES_IN as jwt.SignOptions['expiresIn'],
    }
  )
}

export function verifyAccessToken(token: string): TokenPayload {
  return jwt.verify(token, env.JWT_SECRET) as TokenPayload
}

export function verifyRefreshToken(token: string): TokenPayload {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as TokenPayload
}
