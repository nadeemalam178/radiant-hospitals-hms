/**
 * Test Mock Provider for ABDM Gateway
 * STRICTLY ISOLATED: Only active when NODE_ENV === 'test' and ABDM_MOCK_ENABLED is true.
 * NEVER allowed in production or staging environments.
 */

import { env } from '../../config/env'
import { AbdmVerifiedProfile } from './abdm.types'

export class AbdmMockProvider {
  private static verifyEnvironment() {
    if (env.NODE_ENV === 'production') {
      throw new Error('SECURITY VIOLATION: AbdmMockProvider attempted to execute in PRODUCTION mode!')
    }
    if (!env.ABDM_MOCK_ENABLED || env.NODE_ENV !== 'test') {
      throw new Error('AbdmMockProvider is restricted to local automated test suites (NODE_ENV=test).')
    }
  }

  static generateOtp(authMethod: string, identifier: string): { txnId: string; maskedIdentifier: string; testOtpChallenge?: string } {
    this.verifyEnvironment()
    const masked = identifier.slice(-4)
    const txnId = `ABDM-TEST-TXN-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`
    
    return {
      txnId,
      maskedIdentifier: `******${masked}`,
      testOtpChallenge: '654321', // Explicit test challenge, NOT production default
    }
  }

  static verifyOtp(txnId: string, otp: string, fullName?: string): AbdmVerifiedProfile {
    this.verifyEnvironment()
    
    // In test harness, test OTP challenge is 654321
    if (otp !== '654321') {
      throw new Error('INVALID_TEST_OTP: Test challenge OTP is 654321')
    }

    const testSeed = '991204581290'
    const abhaNumber = `91-${testSeed.slice(0, 4)}-${testSeed.slice(4, 8)}-${testSeed.slice(8, 12)}`
    const abhaAddress = `${(fullName || 'test.beneficiary').toLowerCase().replace(/[^a-z0-9]/g, '')}@sbx`

    return {
      abhaNumber,
      abhaAddress,
      fullName: fullName || 'Test Automated Beneficiary',
      gender: 'MALE',
      dateOfBirth: '1992-05-10',
      phone: '9845000000',
      aadhaarMasked: 'XXXX-XXXX-4321',
      address: 'Test Ward, Radiant Hospital Campus',
      district: 'Bengaluru Urban',
      state: 'Karnataka',
      pincode: '560103',
      status: 'VERIFIED',
      kycVerified: true,
      verifiedAt: new Date().toISOString(),
      qrCodePayload: `ABDM|${abhaNumber}|${abhaAddress}|VERIFIED|RHRI_TEST`,
    }
  }
}
