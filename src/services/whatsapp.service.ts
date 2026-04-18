import axios from "axios";
import logger from "../config/logger";

const WHATSAPP_API_URL = process.env.WHATSAPP_API_URL || "https://whatsapp.venusverse.me";
const WHATSAPP_API_KEY = process.env.WHATSAPP_API_KEY || "";
const WHATSAPP_SESSION_ID = process.env.WHATSAPP_SESSION_ID || "default";

// Frontend URL for reset password link
const getFrontendUrl = () => {
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
    if (!WHATSAPP_API_KEY) {
      throw new Error("WhatsApp API key not configured");
    }

    let formattedPhone = phone.replace(/\+/g, "");

    if (formattedPhone.startsWith("0")) {
      formattedPhone = "62" + formattedPhone.substring(1);
    }

    if (!formattedPhone.startsWith("62")) {
      formattedPhone = "62" + formattedPhone;
    }

    logger.info("Sending WhatsApp message", {
      phone: formattedPhone,
      sessionId: WHATSAPP_SESSION_ID,
    });

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
        timeout: 30000,
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
    const resetLink = `${frontendUrl}/konfirmasi-password?token=${userId}`;

    // ⚠️ Jangan beri indentasi pada baris template literal ini
    const message = `Halo! Saya *Tim BukaDita Official* 👋
Simpan nomor ini agar link bisa dibuka dengan cepat ya 😊

🔐 *Reset Password BukaDita*

Kode OTP Anda: *${otp}*
⏳ Berlaku 10 menit

👉 ${resetLink}

────────────────
🛡️ *Keamanan Akun*
- Jangan bagikan kode & link ini
- BukaDita tidak pernah meminta kode Anda

Bukan Anda yang request? Abaikan saja, akun Anda tetap aman.
────────────────
_Pesan otomatis · Jangan dibalas_`;

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