import { Request, Response } from "express";
import * as whatsappService from "../services/whatsapp.service";
import logger from "../config/logger";

// Check WhatsApp session status
export const checkStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const status = await whatsappService.checkSessionStatus();

    res.status(200).json({
      success: true,
      data: status,
    });
  } catch (error: any) {
    logger.error("Check WhatsApp status error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to check WhatsApp status",
    });
  }
};

// Get QR code for WhatsApp session
export const getQRCode = async (req: Request, res: Response): Promise<void> => {
  try {
    const qr = await whatsappService.getSessionQR();

    if (qr) {
      res.status(200).json({
        success: true,
        data: { qr },
      });
    } else {
      res.status(404).json({
        success: false,
        message: "QR code not available. Session may already be connected.",
      });
    }
  } catch (error: any) {
    logger.error("Get WhatsApp QR code error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to get QR code",
    });
  }
};
