import { Request, Response } from "express";
import * as passwordResetService from "../services/password-reset.service";
import logger from "../config/logger";

// Request password reset - send OTP
export const requestPasswordReset = async (req: Request, res: Response): Promise<void> => {
  try {
    const { phone } = req.body;

    if (!phone) {
      res.status(400).json({
        success: false,
        message: "Nomor telepon wajib diisi",
      });
      return;
    }

    const result = await passwordResetService.requestPasswordReset(phone);

    res.status(200).json(result);
  } catch (error: any) {
    logger.error("Request password reset controller error:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Gagal mengirim kode verifikasi",
    });
  }
};

// Verify OTP and reset password
export const verifyOTPAndResetPassword = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { userId, otp, newPassword } = req.body;

    if (!userId || !otp || !newPassword) {
      res.status(400).json({
        success: false,
        message: "User ID, OTP, dan password baru wajib diisi",
      });
      return;
    }

    if (newPassword.length < 8) {
      res.status(400).json({
        success: false,
        message: "Password minimal 8 karakter",
      });
      return;
    }

    const result = await passwordResetService.verifyOTPAndResetPassword(
      userId,
      otp,
      newPassword
    );

    res.status(200).json(result);
  } catch (error: any) {
    logger.error("Verify OTP and reset password controller error:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Gagal mereset password",
    });
  }
};

// Resend OTP
export const resendOTP = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.body;

    if (!userId) {
      res.status(400).json({
        success: false,
        message: "User ID wajib diisi",
      });
      return;
    }

    const result = await passwordResetService.resendOTP(userId);

    res.status(200).json(result);
  } catch (error: any) {
    logger.error("Resend OTP controller error:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Gagal mengirim ulang kode verifikasi",
    });
  }
};
