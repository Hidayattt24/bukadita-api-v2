import prisma from "../config/database";
import supabase from "../config/supabase";
import bcrypt from "bcrypt";
import crypto from "crypto";
import logger from "../config/logger";
import { normalizePhone } from "../utils/phone.util";
import * as whatsappService from "./whatsapp.service";

// Generate 6-digit OTP
const generateOTP = (): string => {
  return crypto.randomInt(100000, 999999).toString();
};

// Store OTP in database with expiry
const storeOTP = async (userId: string, phone: string, otp: string) => {
  try {
    // Delete any existing OTPs for this user first
    await supabase
      .from("password_reset_otps")
      .delete()
      .eq("user_id", userId);

    // Set expiry to 10 minutes from now
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 10 * 60 * 1000); // 10 minutes from now

    logger.info("Storing OTP with timestamps", {
      userId,
      phone,
      now: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      nowTimestamp: now.getTime(),
      expiresAtTimestamp: expiresAt.getTime(),
    });

    // Insert new OTP
    const { data, error } = await supabase
      .from("password_reset_otps")
      .insert({
        user_id: userId,
        phone,
        otp_hash: await bcrypt.hash(otp, 10),
        expires_at: expiresAt.toISOString(),
        created_at: now.toISOString(),
        is_used: false,
      })
      .select()
      .single();

    if (error) {
      logger.error("Failed to store OTP:", error);
      throw new Error("Failed to store OTP");
    }

    logger.info("OTP stored successfully", { userId, phone, storedData: data });
  } catch (err) {
    logger.error("Store OTP error:", err);
    throw err;
  }
};

// Request password reset - send OTP via WhatsApp
export const requestPasswordReset = async (phone: string) => {
  try {
    // Normalize phone number
    const normalizedPhone = normalizePhone(phone);
    logger.info("Password reset requested for phone:", normalizedPhone);

    // Check if user exists with this phone number
    const profile = await prisma.profile.findFirst({
      where: { phone: normalizedPhone },
    });

    if (!profile) {
      logger.warn("No user found with phone:", normalizedPhone);
      throw new Error("Nomor telepon tidak terdaftar");
    }

    // Generate OTP
    const otp = generateOTP();
    logger.info("OTP generated for user:", { userId: profile.id, phone: normalizedPhone });
    
    // DEVELOPMENT ONLY: Log OTP to console
    if (process.env.NODE_ENV !== "production") {
      console.log("\n=================================");
      console.log("🔐 OTP FOR TESTING:");
      console.log(`Phone: ${normalizedPhone}`);
      console.log(`OTP: ${otp}`);
      console.log(`User ID: ${profile.id}`);
      console.log("=================================\n");
    }

    // Store OTP in database
    await storeOTP(profile.id, normalizedPhone, otp);

    // Send OTP via WhatsApp
    try {
      await whatsappService.sendPasswordResetOTP(
        normalizedPhone,
        otp,
        profile.id
      );
      logger.info("WhatsApp OTP sent successfully", {
        userId: profile.id,
        phone: normalizedPhone,
      });
    } catch (whatsappError: any) {
      logger.error("Failed to send WhatsApp OTP:", whatsappError);
      // Don't throw error, OTP is still stored and can be used
      // User can still see OTP in console for testing
      logger.warn("OTP stored but WhatsApp send failed. Check console for OTP.");
    }

    return {
      success: true,
      message: "Kode verifikasi telah dikirim ke WhatsApp Anda",
      userId: profile.id,
    };
  } catch (err) {
    logger.error("Request password reset error:", err);
    throw err;
  }
};

// Verify OTP and reset password
export const verifyOTPAndResetPassword = async (
  userId: string,
  otp: string,
  newPassword: string
) => {
  try {
    const now = new Date();
    logger.info("Verifying OTP for user:", {
      userId,
      currentTime: now.toISOString(),
      currentTimestamp: now.getTime(),
    });

    // Get OTP record from database
    const { data: otpRecord, error } = await supabase
      .from("password_reset_otps")
      .select("*")
      .eq("user_id", userId)
      .eq("is_used", false)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (error || !otpRecord) {
      logger.warn("No valid OTP found for user:", {
        userId,
        error: error?.message,
      });
      throw new Error("Kode verifikasi tidak valid atau sudah kadaluarsa");
    }

    // Parse expiry time and check if expired
    const expiresAt = new Date(otpRecord.expires_at);
    const nowTimestamp = now.getTime();
    const expiresAtTimestamp = expiresAt.getTime();
    
    logger.info("OTP record found:", {
      userId,
      createdAt: otpRecord.created_at,
      expiresAt: otpRecord.expires_at,
      expiresAtTimestamp,
      currentTimestamp: nowTimestamp,
      isExpired: nowTimestamp > expiresAtTimestamp,
      timeUntilExpiry: expiresAtTimestamp - nowTimestamp,
    });

    // Check if OTP is expired (current time is AFTER expiry time)
    if (nowTimestamp > expiresAtTimestamp) {
      logger.warn("OTP expired for user:", {
        userId,
        expiresAt: expiresAt.toISOString(),
        now: now.toISOString(),
        expiresAtTimestamp,
        nowTimestamp,
        diff: nowTimestamp - expiresAtTimestamp,
      });
      throw new Error("Kode verifikasi sudah kadaluarsa");
    }

    // Verify OTP
    const isValidOTP = await bcrypt.compare(otp, otpRecord.otp_hash);
    if (!isValidOTP) {
      logger.warn("Invalid OTP for user:", userId);
      throw new Error("Kode verifikasi tidak valid");
    }

    // Get user profile
    const profile = await prisma.profile.findUnique({
      where: { id: userId },
    });

    if (!profile || !profile.email) {
      logger.error("Profile not found or no email for user:", userId);
      throw new Error("User tidak ditemukan");
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 12);

    // Update password in Supabase Auth
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      userId,
      { password: newPassword }
    );

    if (updateError) {
      logger.error("Failed to update password in Supabase:", updateError);
      throw new Error("Gagal mengupdate password");
    }

    // Update password hash in user_credentials table
    const { error: credError } = await supabase
      .from("user_credentials")
      .upsert({
        id: userId,
        email: profile.email,
        phone: profile.phone || null,
        password_hash: passwordHash,
        updated_at: new Date().toISOString(),
      });

    if (credError) {
      logger.warn("Could not update password hash:", credError.message);
    }

    // Mark OTP as used
    await supabase
      .from("password_reset_otps")
      .update({ is_used: true })
      .eq("user_id", userId)
      .eq("otp_hash", otpRecord.otp_hash);

    logger.info("Password reset successful for user:", userId);

    return {
      success: true,
      message: "Password berhasil direset",
    };
  } catch (err) {
    logger.error("Verify OTP and reset password error:", err);
    throw err;
  }
};

// Resend OTP via WhatsApp
export const resendOTP = async (userId: string) => {
  try {
    logger.info("Resending OTP for user:", userId);

    // Get user profile
    const profile = await prisma.profile.findUnique({
      where: { id: userId },
    });

    if (!profile || !profile.phone) {
      logger.error("Profile not found or no phone for user:", userId);
      throw new Error("User tidak ditemukan");
    }

    // Generate new OTP
    const otp = generateOTP();
    
    // DEVELOPMENT ONLY: Log OTP to console
    if (process.env.NODE_ENV !== "production") {
      console.log("\n=================================");
      console.log("🔐 RESEND OTP FOR TESTING:");
      console.log(`Phone: ${profile.phone}`);
      console.log(`OTP: ${otp}`);
      console.log(`User ID: ${userId}`);
      console.log("=================================\n");
    }

    // Store OTP in database
    await storeOTP(userId, profile.phone, otp);

    // Send OTP via WhatsApp
    try {
      await whatsappService.sendPasswordResetOTP(
        profile.phone,
        otp,
        userId
      );
      logger.info("WhatsApp OTP resent successfully", {
        userId,
        phone: profile.phone,
      });
    } catch (whatsappError: any) {
      logger.error("Failed to resend WhatsApp OTP:", whatsappError);
      logger.warn("OTP stored but WhatsApp send failed. Check console for OTP.");
    }

    return {
      success: true,
      message: "Kode verifikasi telah dikirim ulang ke WhatsApp Anda",
    };
  } catch (err) {
    logger.error("Resend OTP error:", err);
    throw err;
  }
};
