import { Router } from "express";
import * as whatsappController from "../controllers/whatsapp.controller";
import { requireAuth } from "../middlewares/auth.middleware";

const router = Router();

// Admin only routes for monitoring WhatsApp status
router.get("/status", requireAuth, whatsappController.checkStatus);
router.get("/qr", requireAuth, whatsappController.getQRCode);

export default router;
