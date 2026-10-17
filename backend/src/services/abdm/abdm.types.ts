/**
 * ABDM (Ayushman Bharat Digital Mission) Type Definitions & DTOs
 * Based on official NHA ABDM Gateway Specifications (v0.5 & ABHA v3)
 * Reference: https://sandbox.abdm.gov.in/docs/
 */

export type AbdmEnvironment = 'sandbox' | 'production'

export type AbdmAuthMode = 'MOBILE_OTP' | 'AADHAAR_OTP' | 'DEMOGRAPHICS' | 'DIRECT'

export interface AbdmGatewayStatus {
  configured: boolean
  environment: AbdmEnvironment
  gatewayUrl: string
  hipId: string
  facilityId: string
  clientIdConfigured: boolean
  mockModeActive: boolean
  statusMessage: string
}

export interface AbdmSessionResponse {
  accessToken: string
  expiresIn: number
  tokenType: string
}

export interface AbdmVerifiedProfile {
  abhaNumber: string
  abhaAddress: string
  fullName: string
  gender: 'MALE' | 'FEMALE' | 'OTHER'
  dateOfBirth: string
  phone?: string
  aadhaarMasked?: string
  address?: string
  district?: string
  state?: string
  pincode?: string
  status: 'VERIFIED'
  kycVerified: boolean
  verifiedAt: string
  qrCodePayload?: string
}

export interface AbdmAuthInitRequest {
  requestId: string
  timestamp: string
  query: {
    id: string // ABHA number, ABHA address, or Aadhaar/Mobile
    purpose: 'KYC_AND_LINK' | 'KYC' | 'LINK'
    authMode: AbdmAuthMode
    requester: {
      type: 'HIP'
      id: string
    }
  }
}

export interface AbdmAuthConfirmRequest {
  requestId: string
  timestamp: string
  transactionId: string
  credential: {
    authCode: string // OTP code entered by user
  }
}

export interface AbdmCareContextItem {
  referenceNumber: string
  display: string
  careContextType?: string
}

export interface AbdmPatientRepresentation {
  referenceNumber: string
  display: string
  careContexts: AbdmCareContextItem[]
  matchedBy?: string[]
}

export interface AbdmDiscoveryCallbackPayload {
  requestId: string
  timestamp: string
  transactionId: string
  patient: {
    id: string // patient's ABHA Address (e.g. user@abdm)
    verifiedIdentifiers: Array<{
      type: 'MR' | 'MOBILE' | 'NDHM_HEALTH_NUMBER' | 'HEALTH_ID'
      value: string
    }>
    unverifiedIdentifiers?: Array<{
      type: string
      value: string
    }>
    name?: string
    gender?: string
    yearOfBirth?: number
  }
}

export interface AbdmConsentArtefact {
  id: string
  createdAt: string
  purpose: {
    text: string
    code: string
  }
  patient: {
    id: string
  }
  hip: {
    id: string
  }
  hiTypes: string[]
  permission: {
    accessMode: 'VIEW' | 'STORE' | 'QUERY' | 'STREAM'
    dateRange: {
      from: string
      to: string
    }
    dataEraseAt: string
    frequency: {
      unit: 'HOUR' | 'DAY' | 'WEEK' | 'MONTH' | 'YEAR'
      value: number
      repeats: number
    }
  }
}
