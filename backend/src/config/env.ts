import dotenv from 'dotenv'
import path from 'path'
import { z } from 'zod'

// Load .env from root or backend directory
dotenv.config({ path: path.resolve(__dirname, '../../../.env') })
dotenv.config()

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(val => parseInt(val, 10)).default('4000'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  JWT_SECRET: z.string().default('super-secret-jwt-key-radiant-hms-change-in-prod'),
  JWT_REFRESH_SECRET: z.string().default('super-secret-refresh-key-radiant-hms-change-in-prod'),
  JWT_EXPIRES_IN: z.string().default('8h'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  CORS_ORIGIN: z.string().default('*'),

  // ABDM / ABHA (Ayushman Bharat Digital Mission) Configuration
  ABDM_ENV: z.enum(['sandbox', 'production']).default('sandbox'),
  ABDM_GATEWAY_URL: z.string().default('https://dev.abdm.gov.in/gateway'),
  ABDM_CLIENT_ID: z.string().optional().default(''),
  ABDM_CLIENT_SECRET: z.string().optional().default(''),
  ABDM_HIP_ID: z.string().default('IN_RHRI_BLR_01'),
  ABDM_FACILITY_ID: z.string().default('IN2910000452'),
  ABDM_MOCK_ENABLED: z
    .string()
    .optional()
    .default(process.env.NODE_ENV === 'test' ? 'true' : 'false')
    .transform(val => val.toLowerCase() === 'true'),
  ABDM_TIMEOUT_MS: z
    .string()
    .optional()
    .default('15000')
    .transform(val => parseInt(val, 10)),
}).superRefine((data, ctx) => {
  // Production security checks
  if (data.NODE_ENV === 'production') {
    if (data.ABDM_MOCK_ENABLED) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['ABDM_MOCK_ENABLED'],
        message: 'CRITICAL SECURITY VIOLATION: ABDM_MOCK_ENABLED cannot be true in production mode.',
      })
    }

    if (
      data.JWT_SECRET === 'super-secret-jwt-key-radiant-hms-change-in-prod' ||
      data.JWT_SECRET.length < 32
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['JWT_SECRET'],
        message: 'In production mode, JWT_SECRET must be a secure random secret of at least 32 characters.',
      })
    }

    if (
      data.JWT_REFRESH_SECRET === 'super-secret-refresh-key-radiant-hms-change-in-prod' ||
      data.JWT_REFRESH_SECRET.length < 32
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['JWT_REFRESH_SECRET'],
        message: 'In production mode, JWT_REFRESH_SECRET must be a secure random secret of at least 32 characters.',
      })
    }
  }
})

export const env = envSchema.parse(process.env)
