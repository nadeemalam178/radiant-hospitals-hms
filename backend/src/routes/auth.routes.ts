import { Router } from 'express'
import { AuthController, setupSchema, loginSchema, refreshSchema } from '../controllers/auth.controller'
import { validate } from '../middleware/validate'
import { authLimiter } from '../middleware/rateLimiter'
import { requireAuth } from '../middleware/auth'

const router = Router()

// Public setup check
router.get('/status', AuthController.getSetupStatus)

// First-time hospital initialization (can only be run once)
router.post('/setup', validate(setupSchema), AuthController.setupFirstAdmin)

// Secure login with rate limiting against brute-force
router.post('/login', authLimiter, validate(loginSchema), AuthController.login)

// Token refresh
router.post('/refresh', validate(refreshSchema), AuthController.refreshToken)

// Logout
router.post('/logout', requireAuth, AuthController.logout)

// Current authenticated user info
router.get('/me', requireAuth, AuthController.getCurrentUser)

export const authRoutes = router
