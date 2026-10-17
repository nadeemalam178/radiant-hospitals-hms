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
})

export const env = envSchema.parse(process.env)
