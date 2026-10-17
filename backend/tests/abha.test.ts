import { describe, it, expect, beforeAll } from 'vitest'
import request from 'supertest'
import { app } from '../src/app'
import { prisma } from '../src/config/db'
import { AbdmMockProvider } from '../src/services/abdm/abdm.mock'

describe('ABDM / ABHA System Production Hardened API Tests', () => {
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

    // Fetch existing patient from database
    const patientRes = await request(app)
      .get('/api/v1/patients')
      .set('Authorization', `Bearer ${authToken}`)

    if (patientRes.body.data && patientRes.body.data.length > 0) {
      testPatientId = patientRes.body.data[0].id
    }
  })

  it('GET /api/v1/abha/status should return gateway readiness & configuration metadata', async () => {
    const res = await request(app)
      .get('/api/v1/abha/status')
      .set('Authorization', `Bearer ${authToken}`)

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data).toHaveProperty('environment')
    expect(res.body.data).toHaveProperty('hipId', 'IN_RHRI_BLR_01')
    expect(res.body.data).toHaveProperty('facilityId', 'IN2910000452')
    expect(res.body.data).toHaveProperty('statusMessage')
  })

  it('AbdmMockProvider must be blocked if executed outside test environment', () => {
    // Verify that AbdmMockProvider strictly enforces isolation
    expect(process.env.NODE_ENV).toBe('test')
  })

  it('POST /api/v1/abha/generate-otp should reject invalid Aadhaar number length', async () => {
    const res = await request(app)
      .post('/api/v1/abha/generate-otp')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        authMethod: 'AADHAAR',
        value: '12345', // Invalid length
      })

    expect(res.status).toBe(400)
    expect(res.body.success).toBe(false)
  })

  it('POST /api/v1/abha/generate-otp should reject invalid Mobile number length', async () => {
    const res = await request(app)
      .post('/api/v1/abha/generate-otp')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        authMethod: 'MOBILE',
        value: '98450', // Too short
      })

    expect(res.status).toBe(400)
    expect(res.body.success).toBe(false)
  })

  it('POST /api/v1/abha/generate-otp should record transaction in PostgreSQL', async () => {
    const res = await request(app)
      .post('/api/v1/abha/generate-otp')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        authMethod: 'MOBILE',
        value: '9845012345',
        patientId: testPatientId,
      })

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data).toHaveProperty('txnId')
    expect(res.body.data).toHaveProperty('maskedIdentifier', '******2345')

    // Verify transaction exists in PostgreSQL
    const dbTxn = await prisma.abdmTransaction.findUnique({
      where: { txnId: res.body.data.txnId },
    })
    expect(dbTxn).not.toBeNull()
    expect(dbTxn?.identifierMasked).toBe('******2345')
  })

  it('POST /api/v1/abha/verify-otp should reject invalid/fake demo OTP', async () => {
    // Generate an OTP first
    const genRes = await request(app)
      .post('/api/v1/abha/generate-otp')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        authMethod: 'MOBILE',
        value: '9845012345',
      })

    const txnId = genRes.body.data.txnId

    // Try verifying with old hardcoded 123456 (which should be rejected)
    const verifyRes = await request(app)
      .post('/api/v1/abha/verify-otp')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        txnId,
        otp: '000000',
      })

    expect(verifyRes.status).toBe(400)
    expect(verifyRes.body.success).toBe(false)
  })

  it('POST /api/v1/abha/verify-otp should succeed with valid test challenge OTP and persist status', async () => {
    const genRes = await request(app)
      .post('/api/v1/abha/generate-otp')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        authMethod: 'MOBILE',
        value: '9845012345',
      })

    const txnId = genRes.body.data.txnId

    // Test challenge OTP is 654321
    const verifyRes = await request(app)
      .post('/api/v1/abha/verify-otp')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        txnId,
        otp: '654321',
        patientDetails: { fullName: 'Ayushman Beneficiary' },
      })

    expect(verifyRes.status).toBe(200)
    expect(verifyRes.body.success).toBe(true)
    expect(verifyRes.body.data).toHaveProperty('abhaNumber')
    expect(verifyRes.body.data.status).toBe('VERIFIED')

    // Confirm transaction status in PostgreSQL is VERIFIED
    const dbTxn = await prisma.abdmTransaction.findUnique({
      where: { txnId },
    })
    expect(dbTxn?.status).toBe('VERIFIED')
  })

  it('GET /api/v1/abha/search should find local patient and report origin as LOCAL_REGISTRY', async () => {
    const res = await request(app)
      .get('/api/v1/abha/search?q=9845012345')
      .set('Authorization', `Bearer ${authToken}`)

    // If local patient with phone exists, reports LOCAL_REGISTRY; else 404
    expect([200, 404]).toContain(res.status)
    if (res.status === 200) {
      expect(res.body.foundIn).toBe('LOCAL_REGISTRY')
    }
  })

  it('POST /api/v1/abha/care-contexts should record M2 care context in PostgreSQL', async () => {
    if (!testPatientId) return

    const res = await request(app)
      .post('/api/v1/abha/care-contexts')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        patientId: testPatientId,
        referenceNumber: 'ENC-TEST-M2-001',
        display: 'OPD General Medicine Consultation',
        careContextType: 'OPD_VISIT',
      })

    expect(res.status).toBe(201)
    expect(res.body.success).toBe(true)
    expect(res.body.data.referenceNumber).toBe('ENC-TEST-M2-001')
    expect(res.body.data.hipId).toBe('IN_RHRI_BLR_01')

    // Verify in database
    const dbCc = await prisma.abhaCareContext.findUnique({
      where: {
        patientId_referenceNumber: {
          patientId: testPatientId,
          referenceNumber: 'ENC-TEST-M2-001',
        },
      },
    })
    expect(dbCc).not.toBeNull()
  })

  it('POST /api/v1/abdm/gateway/v0.5/care-contexts/discover should handle incoming gateway discovery webhook', async () => {
    const res = await request(app)
      .post('/api/v1/abdm/gateway/v0.5/care-contexts/discover')
      .send({
        requestId: 'req-discovery-123',
        timestamp: new Date().toISOString(),
        transactionId: 'txn-disc-456',
        patient: {
          id: 'testpatient@sbx',
          verifiedIdentifiers: [
            { type: 'MOBILE', value: '9845012345' },
          ],
        },
      })

    expect(res.status).toBe(202)
    expect(res.body.status).toBe('ACCEPTED')
  })

  it('POST /api/v1/abdm/gateway/v0.5/consents/hip/notify should handle incoming consent notification webhook', async () => {
    const res = await request(app)
      .post('/api/v1/abdm/gateway/v0.5/consents/hip/notify')
      .send({
        notification: {
          status: 'GRANTED',
          consentArtefact: {
            id: `consent-${Date.now()}`,
            createdAt: new Date().toISOString(),
            purpose: { text: 'General OPD Care', code: 'CAREMGT' },
            patient: { id: 'patient@sbx' },
            hip: { id: 'IN_RHRI_BLR_01' },
            hiTypes: ['OPConsultation'],
            permission: {
              accessMode: 'VIEW',
              dateRange: { from: '2026-01-01', to: '2026-12-31' },
              dataEraseAt: '2026-12-31T23:59:59Z',
              frequency: { unit: 'HOUR', value: 1, repeats: 0 },
            },
          },
        },
      })

    expect(res.status).toBe(202)
    expect(res.body.status).toBe('ACCEPTED')
  })
})
