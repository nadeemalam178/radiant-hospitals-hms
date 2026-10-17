import { describe, it, expect } from 'vitest'
import request from 'supertest'
import { app } from '../src/app'

describe('Auth & System Health API Tests', () => {
  it('GET /api/health should respond with service information', async () => {
    const res = await request(app).get('/api/health')
    expect([200, 503]).toContain(res.status)
    expect(res.body).toHaveProperty('status')
  })

  it('GET /api/v1/auth/status should return system setup status', async () => {
    const res = await request(app).get('/api/v1/auth/status')
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data).toHaveProperty('isSetupRequired')
  })

  it('POST /api/v1/auth/login should fail validation on empty payload', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({})

    expect(res.status).toBe(400)
    expect(res.body.success).toBe(false)
    expect(res.body.error).toBe('VALIDATION_ERROR')
  })

  it('POST /api/v1/auth/login should reject invalid email format', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'invalid-email-format',
        password: 'password123',
      })

    expect(res.status).toBe(400)
    expect(res.body.success).toBe(false)
    expect(res.body.error).toBe('VALIDATION_ERROR')
  })

  it('GET /api/v1/auth/me should reject request without token', async () => {
    const res = await request(app).get('/api/v1/auth/me')
    expect(res.status).toBe(401)
    expect(res.body.success).toBe(false)
    expect(res.body.error).toBe('UNAUTHORIZED')
  })
})
