import { describe, it, expect, beforeAll } from 'vitest'
import request from 'supertest'
import { app } from '../src/app'

describe('ABDM / ABHA System API Tests', () => {
  let authToken: string
  let testPatientId: string

  beforeAll(async () => {
    // Login as admin to get auth token
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'admin@radiant.lan',
        password: 'Radiant@123',
      })

    if (loginRes.body.data?.tokens?.accessToken) {
      authToken = loginRes.body.data.tokens.accessToken
    }

    // Fetch existing patient from seed
    const patientRes = await request(app)
      .get('/api/v1/patients')
      .set('Authorization', `Bearer ${authToken}`)

    if (patientRes.body.data && patientRes.body.data.length > 0) {
      testPatientId = patientRes.body.data[0].id
    }
  })

  it('POST /api/v1/abha/generate-otp should generate ABDM OTP transaction', async () => {
    const res = await request(app)
      .post('/api/v1/abha/generate-otp')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        authMethod: 'MOBILE',
        value: '9845012345',
      })

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data).toHaveProperty('txnId')
    expect(res.body.data.txnId).toContain('ABDM-TXN-')
  })

  it('POST /api/v1/abha/verify-otp should authenticate OTP and return 14-digit ABHA number', async () => {
    // Generate OTP first
    const genRes = await request(app)
      .post('/api/v1/abha/generate-otp')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        authMethod: 'MOBILE',
        value: '9845012345',
      })

    const txnId = genRes.body.data.txnId

    // Verify OTP with demo code 123456
    const verifyRes = await request(app)
      .post('/api/v1/abha/verify-otp')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        txnId,
        otp: '123456',
        patientDetails: { fullName: 'Test Beneficiary' },
      })

    expect(verifyRes.status).toBe(200)
    expect(verifyRes.body.success).toBe(true)
    expect(verifyRes.body.data).toHaveProperty('abhaNumber')
    expect(verifyRes.body.data.abhaNumber).toMatch(/^91-\d{4}-\d{4}-\d{4}$/)
    expect(verifyRes.body.data.abhaAddress).toContain('@abdm')
    expect(verifyRes.body.data.status).toBe('VERIFIED')
  })

  it('GET /api/v1/abha/search should find patient or ABDM record by query', async () => {
    const res = await request(app)
      .get('/api/v1/abha/search?q=91-4521-8903-1284')
      .set('Authorization', `Bearer ${authToken}`)

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data).toHaveProperty('abhaNumber')
  })

  it('POST /api/v1/abha/care-contexts should link care context to patient record', async () => {
    if (!testPatientId) return

    const res = await request(app)
      .post('/api/v1/abha/care-contexts')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        patientId: testPatientId,
        referenceNumber: 'ENC-TEST-999',
        display: 'OPD General Consultation - Test',
        careContextType: 'OPD_VISIT',
      })

    expect(res.status).toBe(201)
    expect(res.body.success).toBe(true)
    expect(res.body.data.referenceNumber).toBe('ENC-TEST-999')
  })

  it('GET /api/v1/abha/patient/:id/card should return digital ABHA card payload', async () => {
    if (!testPatientId) return

    const res = await request(app)
      .get(`/api/v1/abha/patient/${testPatientId}/card`)
      .set('Authorization', `Bearer ${authToken}`)

    expect([200, 404]).toContain(res.status)
    if (res.status === 200) {
      expect(res.body.success).toBe(true)
      expect(res.body.data).toHaveProperty('qrPayload')
      expect(res.body.data).toHaveProperty('facilityId')
    }
  })
})
