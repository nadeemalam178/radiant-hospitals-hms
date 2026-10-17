import { describe, it, expect, beforeAll } from 'vitest'
import request from 'supertest'
import { app } from '../src/app'

describe('Core Hospital Clinical & Financial Workflow Tests', () => {
  let authToken: string
  let createdPatientId: string

  beforeAll(async () => {
    // Authenticate as System Admin
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'admin@radiant.lan',
        password: 'Radiant@123',
      })

    if (loginRes.body.data?.tokens?.accessToken) {
      authToken = loginRes.body.data.tokens.accessToken
    }
  })

  it('POST /api/v1/patients should register a new patient with unique MRN', async () => {
    const uniquePhone = `98${Math.floor(10000000 + Math.random() * 90000000)}`
    const res = await request(app)
      .post('/api/v1/patients')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        fullName: 'Test Workflow Patient',
        gender: 'MALE',
        dateOfBirth: '1985-04-12',
        bloodGroup: 'B_POSITIVE',
        phone: uniquePhone,
        address: 'MG Road, Bengaluru',
      })

    expect(res.status).toBe(201)
    expect(res.body.success).toBe(true)
    expect(res.body.data).toHaveProperty('id')
    expect(res.body.data).toHaveProperty('mrn')
    expect(res.body.data.mrn).toMatch(/^RAD-/)
    createdPatientId = res.body.data.id
  })

  it('GET /api/v1/patients/:id should retrieve registered patient details', async () => {
    if (!createdPatientId) return

    const res = await request(app)
      .get(`/api/v1/patients/${createdPatientId}`)
      .set('Authorization', `Bearer ${authToken}`)

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data.id).toBe(createdPatientId)
    expect(res.body.data.fullName).toBe('Test Workflow Patient')
  })

  it('GET /api/v1/billing/invoices should return invoice listing for hospital billing staff', async () => {
    const res = await request(app)
      .get('/api/v1/billing/invoices')
      .set('Authorization', `Bearer ${authToken}`)

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(Array.isArray(res.body.data)).toBe(true)
  })

  it('GET /api/v1/pharmacy/medicines should return formulary catalog', async () => {
    const res = await request(app)
      .get('/api/v1/pharmacy/medicines')
      .set('Authorization', `Bearer ${authToken}`)

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(Array.isArray(res.body.data)).toBe(true)
  })

  it('GET /api/v1/lab/catalog should return lab diagnostic test catalog', async () => {
    const res = await request(app)
      .get('/api/v1/lab/catalog')
      .set('Authorization', `Bearer ${authToken}`)

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(Array.isArray(res.body.data)).toBe(true)
  })

  it('GET /api/v1/ipd/wards should return inpatient ward configurations and bed summary', async () => {
    const res = await request(app)
      .get('/api/v1/ipd/wards')
      .set('Authorization', `Bearer ${authToken}`)

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data).toHaveProperty('wards')
    expect(Array.isArray(res.body.data.wards)).toBe(true)
    expect(res.body.data).toHaveProperty('summary')
  })
})
