import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import path from 'path'
import fs from 'fs'
import swaggerUi from 'swagger-ui-express'
import { env } from './config/env'
import { swaggerSpec } from './docs/swagger'
import { errorHandler } from './middleware/errorHandler'
import { apiLimiter } from './middleware/rateLimiter'
import { authRoutes } from './routes/auth.routes'
import { patientRoutes } from './routes/patient.routes'
import { appointmentRoutes } from './routes/appointment.routes'
import { opdRoutes } from './routes/opd.routes'
import { ipdRoutes } from './routes/ipd.routes'
import { billingRoutes } from './routes/billing.routes'
import { labRoutes } from './routes/lab.routes'
import { pharmacyRoutes } from './routes/pharmacy.routes'
import { reportRoutes } from './routes/report.routes'
import { abhaRoutes } from './routes/abha.routes'
import { prisma } from './config/db'

export const app = express()

// Security Headers
app.use(
  helmet({
    contentSecurityPolicy: false, // Allows local inline scripts for frontend SPA
    crossOriginEmbedderPolicy: false,
  })
)

// CORS Configuration for LAN access
app.use(
  cors({
    origin: env.CORS_ORIGIN === '*' ? true : env.CORS_ORIGIN.split(','),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
)

// Body Parser with size limits
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// General Rate Limiter
app.use('/api/', apiLimiter)

// Swagger Documentation
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec))

// Local Health Check Endpoint
app.get('/api/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`
    const hospital = await prisma.hospitalSettings.findFirst({
      select: { name: true, code: true },
    })

    res.status(200).json({
      status: 'UP',
      service: 'Radiant Hospitals HMS API',
      database: 'CONNECTED',
      hospital: hospital ?? 'PENDING_INITIALIZATION',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    res.status(503).json({
      status: 'DEGRADED',
      database: 'DISCONNECTED',
      error: 'Unable to communicate with local PostgreSQL instance',
    })
  }
})

// Mount API v1 Routes
app.use('/api/v1/auth', authRoutes)
app.use('/api/v1/patients', patientRoutes)
app.use('/api/v1/appointments', appointmentRoutes)
app.use('/api/v1/opd', opdRoutes)
app.use('/api/v1/ipd', ipdRoutes)
app.use('/api/v1/billing', billingRoutes)
app.use('/api/v1/lab', labRoutes)
app.use('/api/v1/pharmacy', pharmacyRoutes)
app.use('/api/v1/reports', reportRoutes)
app.use('/api/v1/abha', abhaRoutes)

// Serve Production Frontend SPA directly from Express on LAN
const frontendDistPath = path.resolve(__dirname, '../../frontend/dist')
if (fs.existsSync(frontendDistPath)) {
  app.use(express.static(frontendDistPath))
  app.get('*', (_req, res) => {
    res.sendFile(path.join(frontendDistPath, 'index.html'))
  })
}

// Global Error Handler
app.use(errorHandler)
