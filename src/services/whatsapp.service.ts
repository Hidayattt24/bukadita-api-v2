import axios from "axios";
import logger from "../config/logger";

const WHATSAPP_API_URL = process.env.WHATSAPP_API_URL || "https://whatsapp.venusverse.me";
const WHATSAPP_API_KEY = process.env.WHATSAPP_API_KEY || "";
const WHATSAPP_SESSION_ID = process.env.WHATSAPP_SESSION_ID || "default";

// Frontend URL for reset password link
const getFrontendUrl = () => {
  // Always use production URL for clickable links
  return "https://www.bukadita.id";
};

/**
 * Send WhatsApp message via VenusConnect API
 */
export const sendWhatsAppMessage = async (
  phone: string,
  message: string
): Promise<{ success: boolean; messageId?: string }> => {
  try {
    // Validate API key
    if (!WHATSAPP_API_KEY) {
      throw new Error("WhatsApp API key not configured");
    }

    // Format phone number (remove + if exists, ensure starts with country code)
    let formattedPhone = phone.replace(/\+/g, "");
    
    // If phone starts with 0, replace with 62 (Indonesia)
    if (formattedPhone.startsWith("0")) {
      formattedPhone = "62" + formattedPhone.substring(1);
    }
    
    // If phone doesn't start with country code, add 62
    if (!formattedPhone.startsWith("62")) {
      formattedPhone = "62" + formattedPhone;
    }

    logger.info("Sending WhatsApp message", {
      phone: formattedPhone,
      sessionId: WHATSAPP_SESSION_ID,
    });

    // Send message via VenusConnect API
    const response = await axios.post(
      `${WHATSAPP_API_URL}/api/session/${WHATSAPP_SESSION_ID}/send`,
      {
        to: formattedPhone,
        message: message,
      },
      {
        headers: {
          "x-api-key": WHATSAPP_API_KEY,
          "Content-Type": "application/json",
        },
        timeout: 30000, // 30 seconds timeout
      }
    );

    if (response.data.success) {
      logger.info("WhatsApp message sent successfully", {
        phone: formattedPhone,
        messageId: response.data.data?.messageId,
      });

      return {
        success: true,
        messageId: response.data.data?.messageId,
      };
    } else {
      throw new Error(response.data.error || "Failed to send WhatsApp message");
    }
  } catch (error: any) {
    logger.error("WhatsApp send error:", {
      error: error.message,
      phone,
      response: error.response?.data,
    });

    // Return error details
    throw new Error(
      error.response?.data?.error ||
        error.message ||
        "Failed to send WhatsApp message"
    );
  }
};

/**
 * Send OTP via WhatsApp for password reset
 */
export const sendPasswordResetOTP = async (
  phone: string,
  otp: string,
  userId: string
): Promise<{ success: boolean }> => {
  try {
    const frontendUrl = getFrontendUrl();
    
    // Create secure reset link with userId as token
    const resetLink = `${frontendUrl}/konfirmasi-password?token=${userId}`;

    // Create message with OTP and secure link
    const message = `🔐 *BukaDita - Reset Password*

Halo! Kami menerima permintaan untuk mereset password akun Anda.

*Kode Verifikasi:* ${otp}
⏱️ Berlaku selama 10 menit

Silakan klik link berikut untuk melanjutkan:
${resetLink}

━━━━━━━━━━━━━━━━━━━━
⚠️ *PENTING - Keamanan Akun*

✓ Link ini khusus untuk nomor HP Anda
✓ Jangan bagikan kode atau link ini
✓ Tim BukaDita tidak akan pernah meminta kode Anda

Jika Anda tidak meminta reset password, abaikan pesan ini dan akun Anda tetap aman.

━━━━━━━━━━━━━━━━━━━━
_Pesan otomatis dari BukaDita_
_Jangan balas pesan ini_`;

    await sendWhatsAppMessage(phone, message);

    return { success: true };
  } catch (error: any) {
    logger.error("Failed to send password reset OTP via WhatsApp:", error);
    throw error;
  }
};

/**
 * Check WhatsApp session status
 */
export const checkSessionStatus = async (): Promise<{
  connected: boolean;
  status: string;
}> => {
  try {
    const response = await axios.get(
      `${WHATSAPP_API_URL}/api/session/${WHATSAPP_SESSION_ID}/status`,
      {
        headers: {
          "x-api-key": WHATSAPP_API_KEY,
        },
      }
    );

    return {
      connected: response.data.data?.connected || false,
      status: response.data.data?.status || "unknown",
    };
  } catch (error: any) {
    logger.error("Failed to check WhatsApp session status:", error);
    return {
      connected: false,
      status: "error",
    };
  }
};

/**
 * Get QR code for WhatsApp session (if not connected)
 */
export const getSessionQR = async (): Promise<string | null> => {
  try {
    const response = await axios.get(
      `${WHATSAPP_API_URL}/api/session/${WHATSAPP_SESSION_ID}/qr`,
      {
        headers: {
          "x-api-key": WHATSAPP_API_KEY,
        },
      }
    );

    return response.data.data?.qr || null;
  } catch (error: any) {
    logger.error("Failed to get WhatsApp QR code:", error);
    return null;
  }
};
