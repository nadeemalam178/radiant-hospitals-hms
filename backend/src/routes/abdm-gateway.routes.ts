/**
 * ABDM Gateway Inbound Webhook Routes
 * Endpoints invoked directly by NHA ABDM Gateway for Discovery and Consent notifications.
 * Reference: https://sandbox.abdm.gov.in/docs/
 */

import { Router } from 'express'
import { AbhaController } from '../controllers/abha.controller'

const router = Router()

// Gateway M2 Callback: Care Context Discovery
router.post('/v0.5/care-contexts/discover', AbhaController.gatewayCareContextDiscover)

// Gateway M3 Callback: Consent Notification
router.post('/v0.5/consents/hip/notify', AbhaController.gatewayConsentNotify)

export const abdmGatewayRoutes = router
