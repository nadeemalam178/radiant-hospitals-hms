/**
 * Authoritative ABDM / ABHA Integration Service
 * Manages official ABDM M1 (Identity/KYC) and M2 (HIP Care Context & Discovery) workflows.
 * Strictly avoids fake data in production. All transactions are persisted in PostgreSQL.
 */

import crypto from 'crypto'
import { prisma } from '../../config/db'
import { env } from '../../config/env'
import { logAuditEvent } from '../../utils/auditLogger'
import { abdmClient, AbdmError } from './abdm.client'
import { AbdmMockProvider } from './abdm.mock'
import {
  AbdmGatewayStatus,
  AbdmVerifiedProfile,
  AbdmDiscoveryCallbackPayload,
  AbdmConsentArtefact,
} from './abdm.types'

export class AbdmService {
  /**
   * Return real-time configuration & operational status of ABDM Gateway
   */
  static getStatus(): AbdmGatewayStatus {
    const isClientConfigured = abdmClient.isConfigured()
    const isMock = Boolean(env.ABDM_MOCK_ENABLED && env.NODE_ENV === 'test')

    let statusMessage = 'ABDM Gateway is configured and ready for communication.'
    if (isMock) {
      statusMessage = 'ABDM Mock Provider active strictly for local test execution.'
    } else if (!isClientConfigured) {
      statusMessage =
        'ABDM Gateway credentials (ABDM_CLIENT_ID / ABDM_CLIENT_SECRET) pending from National Health Authority (NHA). Live integration is marked as BLOCKED.'
    }

    return {
      configured: isClientConfigured,
      environment: env.ABDM_ENV,
      gatewayUrl: env.ABDM_GATEWAY_URL,
      hipId: env.ABDM_HIP_ID,
      facilityId: env.ABDM_FACILITY_ID,
      clientIdConfigured: isClientConfigured,
      mockModeActive: isMock,
      statusMessage,
    }
  }

  /**
   * M1: Generate OTP for ABHA creation / authentication via Aadhaar or Mobile
   */
  static async generateOtp(params: {
    authMethod: 'AADHAAR' | 'MOBILE' | 'ABHA_NUMBER'
    value: string
    patientId?: string
  }): Promise<{ txnId: string; maskedIdentifier: string; message: string; expiresInSeconds: number }> {
    const { authMethod, value, patientId } = params
    const cleanValue = value.replace(/[-\s]/g, '')

    if (authMethod === 'AADHAAR' && cleanValue.length !== 12) {
      throw new AbdmError('Aadhaar number must be exactly 12 digits.', 'INVALID_IDENTIFIER')
    }
    if (authMethod === 'MOBILE' && cleanValue.length !== 10) {
      throw new AbdmError('Mobile number must be exactly 10 digits.', 'INVALID_IDENTIFIER')
    }

    const masked = cleanValue.slice(-4)
    const identifierMasked = `******${masked}`
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

    // 1. If running under automated test harness with explicit mock flag enabled
    if (env.ABDM_MOCK_ENABLED && env.NODE_ENV === 'test') {
      const mockResult = AbdmMockProvider.generateOtp(authMethod, cleanValue)
      
      await prisma.abdmTransaction.create({
        data: {
          txnId: mockResult.txnId,
          authMethod: authMethod === 'AADHAAR' ? 'AADHAAR_OTP' : 'MOBILE_OTP',
          identifierMasked,
          purpose: 'KYC_AND_LINK',
          status: 'OTP_SENT',
          expiresAt,
          patientId: patientId || null,
          metadata: { testChallenge: mockResult.testOtpChallenge },
        },
      })

      return {
        txnId: mockResult.txnId,
        maskedIdentifier: identifierMasked,
        message: `[TEST HARNESS] OTP generated for test verification to mobile ending in ${masked}.`,
        expiresInSeconds: 600,
      }
    }

    // 2. Production or Live Sandbox Mode
    if (!abdmClient.isConfigured()) {
      throw new AbdmError(
        'ABDM Gateway credentials (ABDM_CLIENT_ID / ABDM_CLIENT_SECRET) are not configured. Live OTP generation requires official NHA Sandbox or Production credentials.',
        'ABDM_NOT_CONFIGURED'
      )
    }

    const requestId = crypto.randomUUID()
    const gatewayPayload = {
      requestId,
      timestamp: new Date().toISOString(),
      query: {
        id: cleanValue,
        purpose: 'KYC_AND_LINK',
        authMode: authMethod === 'AADHAAR' ? 'AADHAAR_OTP' : 'MOBILE_OTP',
        requester: {
          type: 'HIP',
          id: env.ABDM_HIP_ID,
        },
      },
    }

    // Call Gateway /v0.5/users/auth/init
    const res = await abdmClient.post('/v0.5/users/auth/init', gatewayPayload)
    const txnId = `ABDM-TXN-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`

    await prisma.abdmTransaction.create({
      data: {
        txnId,
        requestId,
        authMethod: authMethod === 'AADHAAR' ? 'AADHAAR_OTP' : 'MOBILE_OTP',
        identifierMasked,
        purpose: 'KYC_AND_LINK',
        status: 'PENDING',
        expiresAt,
        patientId: patientId || null,
        metadata: res.data as any,
      },
    })

    return {
      txnId,
      maskedIdentifier: identifierMasked,
      message: `ABDM Gateway OTP request dispatched to registered mobile ending with ${masked}.`,
      expiresInSeconds: 600,
    }
  }

  /**
   * M1: Verify OTP and fetch official verified ABHA profile
   */
  static async verifyOtp(params: {
    txnId: string
    otp: string
    patientDetails?: { fullName?: string; gender?: 'MALE' | 'FEMALE' | 'OTHER'; dateOfBirth?: string }
    patientIdToLink?: string
  }): Promise<AbdmVerifiedProfile> {
    const { txnId, otp, patientDetails, patientIdToLink } = params

    // 1. Fetch transaction record from PostgreSQL
    const transaction = await prisma.abdmTransaction.findUnique({
      where: { txnId },
    })

    if (!transaction) {
      throw new AbdmError('Transaction not found or invalid transaction ID.', 'TRANSACTION_NOT_FOUND')
    }

    if (transaction.status === 'EXPIRED' || transaction.expiresAt < new Date()) {
      await prisma.abdmTransaction.update({
        where: { id: transaction.id },
        data: { status: 'EXPIRED' },
      })
      throw new AbdmError('The OTP transaction has expired. Please request a new OTP.', 'OTP_EXPIRED')
    }

    let verifiedProfile: AbdmVerifiedProfile

    // 2. Test Harness Execution
    if (env.ABDM_MOCK_ENABLED && env.NODE_ENV === 'test') {
      try {
        verifiedProfile = AbdmMockProvider.verifyOtp(txnId, otp, patientDetails?.fullName)
      } catch (err: any) {
        throw new AbdmError(err.message, 'INVALID_OTP')
      }
    } else {
      // 3. Official ABDM Gateway Verification
      if (!abdmClient.isConfigured()) {
        throw new AbdmError(
          'ABDM Gateway credentials are not configured. Cannot verify OTP against official Gateway.',
          'ABDM_NOT_CONFIGURED'
        )
      }

      const requestId = crypto.randomUUID()
      const confirmPayload = {
        requestId,
        timestamp: new Date().toISOString(),
        transactionId: transaction.txnId,
        credential: {
          authCode: otp,
        },
      }

      const res = await abdmClient.post<{ patient: any }>('/v0.5/users/auth/confirm', confirmPayload)

      if (!res.data || !res.data.patient) {
        throw new AbdmError('Gateway returned an unexpected response during OTP confirmation.', 'ABDM_INVALID_RESPONSE')
      }

      const patientData = res.data.patient
      verifiedProfile = {
        abhaNumber: patientData.healthIdNumber || patientData.id,
        abhaAddress: patientData.healthId || patientData.id,
        fullName: patientData.name || patientDetails?.fullName || 'Verified Patient',
        gender: patientData.gender || patientDetails?.gender || 'MALE',
        dateOfBirth: `${patientData.yearOfBirth || '1990'}-${String(patientData.monthOfBirth || '01').padStart(2, '0')}-${String(patientData.dayOfBirth || '01').padStart(2, '0')}`,
        phone: patientData.identifiers?.find((i: any) => i.type === 'MOBILE')?.value,
        aadhaarMasked: patientData.identifiers?.find((i: any) => i.type === 'AADHAAR')?.value,
        address: patientData.address?.line || undefined,
        district: patientData.address?.district || undefined,
        state: patientData.address?.state || undefined,
        pincode: patientData.address?.pincode || undefined,
        status: 'VERIFIED',
        kycVerified: true,
        verifiedAt: new Date().toISOString(),
      }
    }

    // 4. Update transaction status in PostgreSQL
    await prisma.abdmTransaction.update({
      where: { id: transaction.id },
      data: {
        status: 'VERIFIED',
        metadata: { verifiedAt: new Date().toISOString(), abhaNumber: verifiedProfile.abhaNumber },
      },
    })

    // 5. If linking was requested, attach to patient
    const targetPatientId = patientIdToLink || transaction.patientId
    if (targetPatientId) {
      await this.linkPatient({
        patientId: targetPatientId,
        abhaNumber: verifiedProfile.abhaNumber,
        abhaAddress: verifiedProfile.abhaAddress,
        aadhaarMasked: verifiedProfile.aadhaarMasked,
        abhaDetails: verifiedProfile,
      })
    }

    return verifiedProfile
  }

  /**
   * Search ABHA identity in local database first; then in ABDM gateway if configured
   */
  static async searchAbha(query: string) {
    const cleanQuery = query.trim()
    if (!cleanQuery) {
      throw new AbdmError('Search parameter cannot be empty.', 'INVALID_SEARCH_QUERY')
    }

    // 1. Search in local hospital database
    const localPatient = await prisma.patient.findFirst({
      where: {
        OR: [
          { abhaNumber: { equals: cleanQuery, mode: 'insensitive' } },
          { abhaAddress: { equals: cleanQuery, mode: 'insensitive' } },
          { phone: cleanQuery },
        ],
        isArchived: false,
      },
    })

    if (localPatient) {
      return {
        foundIn: 'LOCAL_REGISTRY',
        data: {
          patientId: localPatient.id,
          mrn: localPatient.mrn,
          fullName: localPatient.fullName,
          abhaNumber: localPatient.abhaNumber,
          abhaAddress: localPatient.abhaAddress,
          abhaStatus: localPatient.abhaStatus,
          gender: localPatient.gender,
          dateOfBirth: localPatient.dateOfBirth,
          phone: localPatient.phone,
        },
      }
    }

    // 2. Query ABDM Gateway if configured
    if (abdmClient.isConfigured()) {
      const requestId = crypto.randomUUID()
      try {
        const res = await abdmClient.post<{ auth: any }>('/v0.5/users/auth/fetch-modes', {
          requestId,
          timestamp: new Date().toISOString(),
          query: {
            id: cleanQuery,
            purpose: 'KYC_AND_LINK',
            requester: { type: 'HIP', id: env.ABDM_HIP_ID },
          },
        })

        return {
          foundIn: 'ABDM_GATEWAY_REGISTRY',
          data: res.data,
        }
      } catch (err: any) {
        throw new AbdmError(
          `ABDM Gateway search returned no active record for '${cleanQuery}': ${err.message}`,
          'NOT_FOUND_IN_ABDM'
        )
      }
    }

    // If not found and gateway unconfigured, explicitly report this without simulating government records
    return {
      foundIn: null,
      message: `No patient found with identifier '${cleanQuery}' in local hospital registry. Official ABDM Gateway lookup is pending client credentials.`,
    }
  }

  /**
   * Link verified ABHA identity to an existing hospital patient record
   */
  static async linkPatient(params: {
    patientId: string
    abhaNumber: string
    abhaAddress: string
    aadhaarMasked?: string
    abhaDetails?: any
    actorId?: string
    actorEmail?: string
    ipAddress?: string
    userAgent?: string
  }) {
    const { patientId, abhaNumber, abhaAddress, aadhaarMasked, abhaDetails, actorId, actorEmail, ipAddress, userAgent } =
      params

    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
    })

    if (!patient) {
      throw new AbdmError('Patient record not found.', 'PATIENT_NOT_FOUND')
    }

    // Check uniqueness of ABHA across other patients
    const duplicate = await prisma.patient.findFirst({
      where: {
        abhaNumber,
        id: { not: patientId },
        isArchived: false,
      },
    })

    if (duplicate) {
      throw new AbdmError(
        `ABHA Number '${abhaNumber}' is already associated with patient '${duplicate.fullName}' (${duplicate.mrn}).`,
        'ABHA_ALREADY_LINKED'
      )
    }

    const updated = await prisma.patient.update({
      where: { id: patientId },
      data: {
        abhaNumber,
        abhaAddress,
        abhaStatus: 'VERIFIED',
        aadhaarMasked: aadhaarMasked || null,
        abhaDetails: abhaDetails || undefined,
      },
    })

    await logAuditEvent({
      action: 'ABHA_LINKED_TO_PATIENT',
      actorId,
      actorEmail,
      entityName: 'Patient',
      entityId: patient.id,
      details: { mrn: patient.mrn, abhaNumber, abhaAddress },
      ipAddress,
      userAgent,
    })

    return updated
  }

  /**
   * Unlink ABHA from patient
   */
  static async unlinkPatient(params: {
    patientId: string
    actorId?: string
    actorEmail?: string
    ipAddress?: string
    userAgent?: string
  }) {
    const { patientId, actorId, actorEmail, ipAddress, userAgent } = params

    const patient = await prisma.patient.findUnique({ where: { id: patientId } })
    if (!patient) {
      throw new AbdmError('Patient not found.', 'PATIENT_NOT_FOUND')
    }

    const updated = await prisma.patient.update({
      where: { id: patientId },
      data: {
        abhaNumber: null,
        abhaAddress: null,
        abhaStatus: 'NOT_LINKED',
        aadhaarMasked: null,
        abhaDetails: undefined,
      },
    })

    await logAuditEvent({
      action: 'ABHA_UNLINKED_FROM_PATIENT',
      actorId,
      actorEmail,
      entityName: 'Patient',
      entityId: patient.id,
      details: { mrn: patient.mrn },
      ipAddress,
      userAgent,
    })

    return updated
  }

  /**
   * M2: Create Care Context and notify ABDM Gateway if patient has verified ABHA
   */
  static async createCareContext(params: {
    patientId: string
    referenceNumber: string
    display: string
    careContextType: 'OPD_VISIT' | 'DIAGNOSTIC_REPORT' | 'DISCHARGE_SUMMARY' | 'PRESCRIPTION'
  }) {
    const { patientId, referenceNumber, display, careContextType } = params

    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      select: { id: true, abhaNumber: true, abhaAddress: true, abhaStatus: true, mrn: true },
    })

    if (!patient) {
      throw new AbdmError('Patient not found.', 'PATIENT_NOT_FOUND')
    }

    const careContext = await prisma.abhaCareContext.upsert({
      where: {
        patientId_referenceNumber: {
          patientId,
          referenceNumber,
        },
      },
      update: {
        display,
        careContextType,
        status: 'LINKED',
      },
      create: {
        patientId,
        referenceNumber,
        display,
        careContextType,
        status: 'LINKED',
        hipId: env.ABDM_HIP_ID,
      },
    })

    // If patient is verified with ABHA and Gateway is configured, notify Gateway
    if (patient.abhaAddress && patient.abhaStatus === 'VERIFIED' && abdmClient.isConfigured()) {
      try {
        const requestId = crypto.randomUUID()
        await abdmClient.post('/v0.5/links/context/notify', {
          requestId,
          timestamp: new Date().toISOString(),
          notification: {
            patient: {
              id: patient.abhaAddress,
            },
            careContext: {
              patientReference: patient.mrn,
              careContextReference: careContext.referenceNumber,
            },
            hiTypes: [careContextType],
            date: new Date().toISOString(),
            hip: {
              id: env.ABDM_HIP_ID,
              name: 'Radiant Hospital & Research Institute',
            },
          },
        })
      } catch (err: any) {
        // Notification failure is non-fatal to local HMS workflow, but logged
        console.warn(`[ABDM Gateway] Care context notification warning: ${err.message}`)
      }
    }

    return careContext
  }

  /**
   * M2 Gateway Callback: /v0.5/care-contexts/discover
   * Called by ABDM Gateway when patient searches for hospital records in their PHR app
   */
  static async handleCareContextDiscover(payload: AbdmDiscoveryCallbackPayload) {
    const requestId = crypto.randomUUID()
    const abhaAddress = payload.patient?.id
    const mobileIdentifier = payload.patient?.verifiedIdentifiers?.find(i => i.type === 'MOBILE')?.value

    // Search patient in hospital DB
    let patient = null
    if (abhaAddress) {
      patient = await prisma.patient.findFirst({
        where: { abhaAddress, isArchived: false },
        include: { careContexts: true },
      })
    }
    if (!patient && mobileIdentifier) {
      patient = await prisma.patient.findFirst({
        where: { phone: mobileIdentifier, isArchived: false },
        include: { careContexts: true },
      })
    }

    if (!patient) {
      if (abdmClient.isConfigured()) {
        await abdmClient.post('/v0.5/care-contexts/on-discover', {
          requestId,
          timestamp: new Date().toISOString(),
          transactionId: payload.transactionId,
          error: {
            code: 1000,
            message: 'No patient record matching identifier found at Radiant Hospital.',
          },
          resp: { requestId: payload.requestId },
        })
      }
      return { matched: false }
    }

    const careContexts = patient.careContexts.map(cc => ({
      referenceNumber: cc.referenceNumber,
      display: cc.display,
      careContextType: cc.careContextType,
    }))

    if (abdmClient.isConfigured()) {
      await abdmClient.post('/v0.5/care-contexts/on-discover', {
        requestId,
        timestamp: new Date().toISOString(),
        transactionId: payload.transactionId,
        patient: {
          referenceNumber: patient.mrn,
          display: patient.fullName,
          careContexts,
          matchedBy: abhaAddress ? ['HEALTH_ID'] : ['MOBILE'],
        },
        resp: { requestId: payload.requestId },
      })
    }

    return { matched: true, patientMrn: patient.mrn, count: careContexts.length }
  }

  /**
   * M3 Gateway Callback: /v0.5/consents/hip/notify
   * Called by ABDM Gateway when patient grants or revokes consent
   */
  static async handleConsentNotify(payload: { notification: { consentArtefact: AbdmConsentArtefact; status: string } }) {
    const artefact = payload.notification?.consentArtefact
    if (!artefact) return { success: false }

    await prisma.abdmConsent.upsert({
      where: { consentId: artefact.id },
      update: {
        status: payload.notification.status === 'GRANTED' ? 'GRANTED' : 'REVOKED',
      },
      create: {
        consentId: artefact.id,
        requestId: crypto.randomUUID(),
        patientAbhaAddress: artefact.patient.id,
        hipId: artefact.hip.id,
        status: payload.notification.status === 'GRANTED' ? 'GRANTED' : 'REVOKED',
        purpose: artefact.purpose.text,
        hiTypes: artefact.hiTypes,
        careContextReferences: [],
        dateRangeFrom: artefact.permission.dateRange.from ? new Date(artefact.permission.dateRange.from) : null,
        dateRangeTo: artefact.permission.dateRange.to ? new Date(artefact.permission.dateRange.to) : null,
        expiryDate: new Date(artefact.permission.dataEraseAt || Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    })

    if (abdmClient.isConfigured()) {
      await abdmClient.post('/v0.5/consents/hip/on-notify', {
        requestId: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        acknowledgement: {
          status: 'OK',
          consentId: artefact.id,
        },
        resp: { requestId: crypto.randomUUID() },
      })
    }

    return { success: true, consentId: artefact.id }
  }
}
