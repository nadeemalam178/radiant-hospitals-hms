import { app } from './app'
import { env } from './config/env'
import { logger } from './config/logger'
import { prisma } from './config/db'
import os from 'os'

function getLocalIpAddress(): string {
  const interfaces = os.networkInterfaces()
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address
      }
    }
  }
  return 'localhost'
}

const server = app.listen(env.PORT, '0.0.0.0', () => {
  const localIp = getLocalIpAddress()
  logger.info(`🏥 Radiant Hospitals HMS Backend Server Active!`)
  logger.info(`📍 Local URL:     http://localhost:${env.PORT}`)
  logger.info(`🌐 Hospital LAN:   http://${localIp}:${env.PORT}`)
  logger.info(`📖 API Swagger:   http://localhost:${env.PORT}/api/docs`)
  logger.info(`🩺 Health Check:  http://localhost:${env.PORT}/api/health`)
})

// Graceful shutdown
async function gracefulShutdown(signal: string) {
  logger.info(`Received ${signal}. Shutting down hospital server gracefully...`)
  server.close(async () => {
    await prisma.$disconnect()
    logger.info('Database connection closed. Process exited safely.')
    process.exit(0)
  })

  // Force close if graceful shutdown hangs
  setTimeout(() => {
    logger.error('Forced shutdown due to timeout.')
    process.exit(1)
  }, 10000)
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'))
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
