import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { prisma } from '../config/db'
import { hashPassword, comparePassword } from '../utils/passwords'
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/tokens'
import { logAuditEvent } from '../utils/auditLogger'
import { RoleName } from '@prisma/client'

// Zod Schemas for Validation
export const setupSchema = z.object({
  body: z.object({
    hospitalName: z.string().min(3, 'Hospital name must be at least 3 characters'),
    hospitalCode: z.string().min(2, 'Hospital code must be at least 2 characters'),
    address: z.string().min(5, 'Address is required'),
    phone: z.string().min(6, 'Phone is required'),
    email: z.string().email('Valid hospital email is required'),
    adminFullName: z.string().min(2, 'Admin name is required'),
    adminEmail: z.string().email('Valid admin email is required'),
    adminPassword: z.string().min(8, 'Password must be at least 8 characters'),
  }),
})

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Valid email is required'),
    password: z.string().min(1, 'Password is required'),
  }),
})

export const refreshSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(1, 'Refresh token is required'),
  }),
})

export class AuthController {
  // First-run setup: creates hospital settings & initial admin
  static async setupFirstAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userCount = await prisma.user.count()
      if (userCount > 0) {
        res.status(403).json({
          success: false,
          error: 'SETUP_ALREADY_COMPLETED',
          message: 'The hospital management system has already been initialized.',
        })
        return
      }

      const {
        hospitalName,
        hospitalCode,
        address,
        phone,
        email: hospitalEmail,
        adminFullName,
        adminEmail,
        adminPassword,
      } = req.body

      // Ensure system roles exist
      const systemRoles: { name: RoleName; displayName: string; description: string }[] = [
        { name: 'SYSTEM_ADMIN', displayName: 'System Administrator', description: 'Full system management access' },
        { name: 'HOSPITAL_ADMIN', displayName: 'Hospital Administrator', description: 'Hospital operations & staff management' },
        { name: 'DOCTOR', displayName: 'Doctor / Clinician', description: 'Clinical OPD/IPD consultations and prescriptions' },
        { name: 'NURSE', displayName: 'Nurse', description: 'Vitals, bed management, and inpatient care' },
        { name: 'RECEPTIONIST', displayName: 'Receptionist', description: 'Patient registration and appointments' },
        { name: 'BILLING_OPERATOR', displayName: 'Billing Operator', description: 'Invoice creation and payment collection' },
        { name: 'LAB_STAFF', displayName: 'Laboratory Staff', description: 'Lab tests, sample entry, and results' },
        { name: 'PHARMACIST', displayName: 'Pharmacist', description: 'Prescription dispensing and medicine catalog' },
        { name: 'INVENTORY_MANAGER', displayName: 'Inventory Manager', description: 'Stock movements, batches, and supplies' },
        { name: 'AUDITOR', displayName: 'Read-only Auditor', description: 'Read-only access to audit logs and reports' },
      ]

      for (const r of systemRoles) {
        await prisma.role.upsert({
          where: { name: r.name },
          update: {},
          create: r,
        })
      }

      // Execute setup within transaction
      const result = await prisma.$transaction(async tx => {
        // Create hospital settings
        const settings = await tx.hospitalSettings.create({
          data: {
            name: hospitalName,
            code: hospitalCode.toUpperCase(),
            address,
            phone,
            email: hospitalEmail,
          },
        })

        // Create Master Administrator
        const passwordHash = await hashPassword(adminPassword)
        const user = await tx.user.create({
          data: {
            email: adminEmail.toLowerCase().trim(),
            passwordHash,
            fullName: adminFullName,
            phone,
            status: 'ACTIVE',
          },
        })

        // Assign SYSTEM_ADMIN and HOSPITAL_ADMIN roles
        const adminRole = await tx.role.findUniqueOrThrow({ where: { name: 'SYSTEM_ADMIN' } })
        await tx.userRole.create({
          data: {
            userId: user.id,
            roleId: adminRole.id,
          },
        })

        return { settings, user }
      })

      // Generate tokens
      const tokenPayload = {
        userId: result.user.id,
        email: result.user.email,
        roles: ['SYSTEM_ADMIN'],
      }
      const accessToken = generateAccessToken(tokenPayload)
      const refreshToken = generateRefreshToken(tokenPayload)

      // Store refresh token
      const decodedRefresh = verifyRefreshToken(refreshToken)
      await prisma.refreshToken.create({
        data: {
          token: refreshToken,
          userId: result.user.id,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      })

      await logAuditEvent({
        action: 'SYSTEM_INITIALIZED',
        actorId: result.user.id,
        actorEmail: result.user.email,
        entityName: 'HospitalSettings',
        entityId: result.settings.id,
        details: { hospitalName, hospitalCode },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      })

      res.status(201).json({
        success: true,
        message: 'System successfully initialized. Master Administrator created.',
        data: {
          hospital: result.settings,
          user: {
            id: result.user.id,
            fullName: result.user.fullName,
            email: result.user.email,
            roles: ['SYSTEM_ADMIN'],
          },
          tokens: {
            accessToken,
            refreshToken,
          },
        },
      })
    } catch (error) {
      next(error)
    }
  }

  // Login
  static async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password } = req.body
      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase().trim() },
        include: {
          userRoles: {
            include: { role: true },
          },
        },
      })

      if (!user) {
        await logAuditEvent({
          action: 'LOGIN_FAILED',
          actorEmail: email,
          entityName: 'User',
          details: { reason: 'User not found' },
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
        })
        res.status(401).json({
          success: false,
          error: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password.',
        })
        return
      }

      // Check lockout
      if (user.lockoutUntil && user.lockoutUntil > new Date()) {
        res.status(403).json({
          success: false,
          error: 'ACCOUNT_LOCKED',
          message: `Account is temporarily locked. Try again after ${user.lockoutUntil.toLocaleTimeString()}.`,
        })
        return
      }

      // Check active
      if (user.status !== 'ACTIVE') {
        res.status(403).json({
          success: false,
          error: 'ACCOUNT_DEACTIVATED',
          message: 'Your account is deactivated. Contact hospital administrator.',
        })
        return
      }

      // Check password
      const isValid = await comparePassword(password, user.passwordHash)
      if (!isValid) {
        const newAttempts = user.failedAttempts + 1
        const lockoutUntil = newAttempts >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : null

        await prisma.user.update({
          where: { id: user.id },
          data: {
            failedAttempts: newAttempts,
            lockoutUntil,
          },
        })

        await logAuditEvent({
          action: 'LOGIN_FAILED',
          actorId: user.id,
          actorEmail: user.email,
          entityName: 'User',
          details: { failedAttempts: newAttempts, locked: newAttempts >= 5 },
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
        })

        res.status(401).json({
          success: false,
          error: 'INVALID_CREDENTIALS',
          message: newAttempts >= 5
            ? 'Account locked due to 5 consecutive failed attempts. Try again in 15 minutes.'
            : `Invalid email or password. Attempt ${newAttempts}/5 before lockout.`,
        })
        return
      }

      // Reset failed attempts & update last login
      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedAttempts: 0,
          lockoutUntil: null,
          lastLoginAt: new Date(),
        },
      })

      const roles = user.userRoles.map(ur => ur.role.name)
      const tokenPayload = {
        userId: user.id,
        email: user.email,
        roles,
      }

      const accessToken = generateAccessToken(tokenPayload)
      const refreshToken = generateRefreshToken(tokenPayload)

      // Save refresh token
      await prisma.refreshToken.create({
        data: {
          token: refreshToken,
          userId: user.id,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      })

      await logAuditEvent({
        action: 'LOGIN_SUCCESS',
        actorId: user.id,
        actorEmail: user.email,
        entityName: 'User',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      })

      res.status(200).json({
        success: true,
        message: 'Login successful.',
        data: {
          user: {
            id: user.id,
            fullName: user.fullName,
            email: user.email,
            phone: user.phone,
            roles,
          },
          tokens: {
            accessToken,
            refreshToken,
          },
        },
      })
    } catch (error) {
      next(error)
    }
  }

  // Refresh Token
  static async refreshToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { refreshToken } = req.body
      const decoded = verifyRefreshToken(refreshToken)

      const storedToken = await prisma.refreshToken.findUnique({
        where: { token: refreshToken },
        include: {
          user: {
            include: {
              userRoles: { include: { role: true } },
            },
          },
        },
      })

      if (!storedToken || storedToken.isRevoked || storedToken.expiresAt < new Date()) {
        res.status(401).json({
          success: false,
          error: 'INVALID_REFRESH_TOKEN',
          message: 'Refresh token is expired, revoked, or invalid.',
        })
        return
      }

      const roles = storedToken.user.userRoles.map(ur => ur.role.name)
      const newAccessToken = generateAccessToken({
        userId: storedToken.user.id,
        email: storedToken.user.email,
        roles,
      })

      res.status(200).json({
        success: true,
        data: {
          accessToken: newAccessToken,
        },
      })
    } catch (error) {
      res.status(401).json({
        success: false,
        error: 'INVALID_REFRESH_TOKEN',
        message: 'Could not verify refresh token.',
      })
    }
  }

  // Logout
  static async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { refreshToken } = req.body
      if (refreshToken) {
        await prisma.refreshToken.updateMany({
          where: { token: refreshToken },
          data: { isRevoked: true },
        })
      }

      if (req.user) {
        await logAuditEvent({
          action: 'LOGOUT_SUCCESS',
          actorId: req.user.userId,
          actorEmail: req.user.email,
          entityName: 'User',
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
        })
      }

      res.status(200).json({
        success: true,
        message: 'Successfully logged out.',
      })
    } catch (error) {
      next(error)
    }
  }

  // Get Current User Profile
  static async getCurrentUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' })
        return
      }

      const user = await prisma.user.findUnique({
        where: { id: req.user.userId },
        select: {
          id: true,
          email: true,
          fullName: true,
          phone: true,
          status: true,
          lastLoginAt: true,
          userRoles: {
            include: {
              role: {
                include: {
                  permissions: {
                    include: { permission: true },
                  },
                },
              },
            },
          },
          staffProfile: {
            include: {
              department: true,
              doctorProfile: true,
            },
          },
        },
      })

      if (!user) {
        res.status(404).json({ success: false, message: 'User not found' })
        return
      }

      const hospital = await prisma.hospitalSettings.findFirst()

      // Aggregate permissions
      const roles = user.userRoles.map(ur => ur.role.name)
      const permissions = Array.from(
        new Set(
          user.userRoles.flatMap(ur =>
            ur.role.permissions.map(rp => rp.permission.code)
          )
        )
      )

      res.status(200).json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            fullName: user.fullName,
            phone: user.phone,
            roles,
            permissions,
            staffProfile: user.staffProfile,
          },
          hospital,
        },
      })
    } catch (error) {
      next(error)
    }
  }

  // Check setup status (public endpoint so frontend knows if first-run setup is required)
  static async getSetupStatus(req: Request, res: Response, _next: NextFunction): Promise<void> {
    try {
      const userCount = await prisma.user.count()
      const hospital = await prisma.hospitalSettings.findFirst({
        select: { name: true, code: true, currency: true, timezone: true },
      })

      res.status(200).json({
        success: true,
        data: {
          isSetupRequired: userCount === 0,
          hospital,
          dbConnected: true,
        },
      })
    } catch (error: unknown) {
      const err = error as Error
      res.status(200).json({
        success: true,
        data: {
          isSetupRequired: true,
          hospital: null,
          dbConnected: false,
          dbError: err.message,
        },
      })
    }
  }
}
