/**
 * Official ABDM Gateway HTTP Client
 * Implements NHA ABDM Gateway v0.5 protocol, session tokens, request signing headers,
 * request correlation, timeout protection, and privacy-conscious callback logging.
 */

import { env } from '../../config/env'
import { prisma } from '../../config/db'
import crypto from 'crypto'
import { AbdmSessionResponse } from './abdm.types'

export class AbdmError extends Error {
  code: string
  details?: unknown

  constructor(message: string, code: string = 'ABDM_GATEWAY_ERROR', details?: unknown) {
    super(message)
    this.name = 'AbdmError'
    this.code = code
    this.details = details
  }
}

export class AbdmClient {
  private baseUrl: string
  private clientId: string
  private clientSecret: string
  private cachedToken: string | null = null
  private tokenExpiresAt: number = 0

  constructor() {
    this.baseUrl = env.ABDM_GATEWAY_URL.replace(/\/+$/, '')
    this.clientId = env.ABDM_CLIENT_ID || ''
    this.clientSecret = env.ABDM_CLIENT_SECRET || ''
  }

  public isConfigured(): boolean {
    return Boolean(this.clientId && this.clientSecret)
  }

  /**
   * Obtain or refresh official ABDM Gateway Bearer session token
   * POST /v0.5/sessions
   */
  public async getSessionToken(): Promise<string> {
    if (!this.isConfigured()) {
      throw new AbdmError(
        'ABDM Gateway Client ID and Client Secret are not configured. Official NHA sandbox/production registration is required.',
        'ABDM_CREDENTIALS_MISSING'
      )
    }

    // Return cached token if valid for at least 5 more minutes
    const now = Date.now()
    if (this.cachedToken && this.tokenExpiresAt > now + 5 * 60 * 1000) {
      return this.cachedToken
    }

    // Check database for active unexpired session token
    const dbSession = await prisma.abdmGatewaySession.findFirst({
      where: {
        clientId: this.clientId,
        expiresAt: { gt: new Date(now + 5 * 60 * 1000) },
      },
      orderBy: { expiresAt: 'desc' },
    })

    if (dbSession) {
      this.cachedToken = dbSession.accessToken
      this.tokenExpiresAt = dbSession.expiresAt.getTime()
      return dbSession.accessToken
    }

    const requestId = crypto.randomUUID()
    const sessionUrl = `${this.baseUrl}/v0.5/sessions`

    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), env.ABDM_TIMEOUT_MS)

      const response = await fetch(sessionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'REQUEST-ID': requestId,
          TIMESTAMP: new Date().toISOString(),
        },
        body: JSON.stringify({
          clientId: this.clientId,
          clientSecret: this.clientSecret,
        }),
        signal: controller.signal,
      })

      clearTimeout(timeout)

      if (!response.ok) {
        const errorText = await response.text()
        let parsedError: unknown
        try {
          parsedError = JSON.parse(errorText)
        } catch {
          parsedError = errorText
        }

        await this.logCall(requestId, '/v0.5/sessions', 'OUTBOUND', response.status, null, parsedError)

        throw new AbdmError(
          `ABDM Gateway session authentication failed with status ${response.status}`,
          'ABDM_AUTH_FAILED',
          parsedError
        )
      }

      const data = (await response.json()) as AbdmSessionResponse
      this.cachedToken = data.accessToken
      this.tokenExpiresAt = now + (data.expiresIn || 1800) * 1000

      // Persist session to PostgreSQL
      await prisma.abdmGatewaySession.create({
        data: {
          clientId: this.clientId,
          accessToken: data.accessToken,
          tokenType: data.tokenType || 'Bearer',
          expiresAt: new Date(this.tokenExpiresAt),
        },
      })

      await this.logCall(requestId, '/v0.5/sessions', 'OUTBOUND', response.status, {
        action: 'SESSION_OBTAINED',
        expiresIn: data.expiresIn,
      })

      return data.accessToken
    } catch (err: any) {
      if (err instanceof AbdmError) throw err
      if (err.name === 'AbortError') {
        throw new AbdmError('ABDM Gateway session request timed out', 'ABDM_TIMEOUT')
      }
      throw new AbdmError(
        `Failed to reach ABDM Gateway at ${this.baseUrl}: ${err.message}`,
        'ABDM_GATEWAY_UNREACHABLE'
      )
    }
  }

  /**
   * Execute authenticated POST request to ABDM Gateway with standard NHA correlation headers
   */
  public async post<T = unknown>(endpoint: string, payload: unknown): Promise<{ status: number; data: T }> {
    const token = await this.getSessionToken()
    const requestId = crypto.randomUUID()
    const fullUrl = `${this.baseUrl}${endpoint}`

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'X-CM-ID': env.ABDM_ENV === 'production' ? 'prod' : 'sbx',
      'REQUEST-ID': requestId,
      TIMESTAMP: new Date().toISOString(),
    }

    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), env.ABDM_TIMEOUT_MS)

      const response = await fetch(fullUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal,
      })

      clearTimeout(timeout)

      const responseText = await response.text()
      let responseData: any = null
      try {
        responseData = responseText ? JSON.parse(responseText) : null
      } catch {
        responseData = responseText
      }

      await this.logCall(requestId, endpoint, 'OUTBOUND', response.status, payload, responseData)

      if (!response.ok) {
        throw new AbdmError(
          `ABDM Gateway call to ${endpoint} returned status ${response.status}`,
          'ABDM_GATEWAY_CALL_FAILED',
          responseData
        )
      }

      return {
        status: response.status,
        data: responseData as T,
      }
    } catch (err: any) {
      if (err instanceof AbdmError) throw err
      if (err.name === 'AbortError') {
        throw new AbdmError(`ABDM Gateway call to ${endpoint} timed out`, 'ABDM_TIMEOUT')
      }
      throw new AbdmError(`Network error communicating with ABDM Gateway: ${err.message}`, 'ABDM_NETWORK_ERROR')
    }
  }

  /**
   * Safe audit logging of ABDM interactions (sanitizing tokens, passwords, OTPs)
   */
  public async logCall(
    requestId: string,
    endpoint: string,
    direction: 'INBOUND' | 'OUTBOUND',
    statusCode?: number,
    payload?: unknown,
    error?: unknown
  ): Promise<void> {
    try {
      const sanitize = (obj: any): any => {
        if (!obj || typeof obj !== 'object') return obj
        const copy = { ...obj }
        for (const key of ['clientSecret', 'accessToken', 'authCode', 'otp', 'password']) {
          if (key in copy) copy[key] = '[REDACTED]'
        }
        return copy
      }

      await prisma.abdmCallbackLog.create({
        data: {
          requestId,
          endpoint,
          direction,
          statusCode: statusCode || null,
          payload: payload ? sanitize(payload) : undefined,
          error: error ? sanitize(error) : undefined,
        },
      })
    } catch {
      // Avoid failing the core flow if audit table write fails
    }
  }
}

export const abdmClient = new AbdmClient()
