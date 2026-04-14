import { Response } from "express";
import { AuthRequest } from "../middlewares/auth.middleware";
import { sendSuccess, sendError, API_CODES } from "../utils/response.util";
import * as messageService from "../services/message.service";

/**
 * Admin sends a message to a user
 * POST /api/v1/messages
 */
export const sendMessage = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const senderId = req.user?.userId;
    if (!senderId) {
      sendError(res, API_CODES.UNAUTHORIZED, "Authentication required", 401);
      return;
    }

    const { receiver_id, title, message } = req.body;

    if (!receiver_id || !title || !message) {
      sendError(
        res,
        API_CODES.VALIDATION_ERROR,
        "receiver_id, title, and message are required",
        400
      );
      return;
    }

    const msg = await messageService.sendMessage({
      sender_id: senderId,
      receiver_id,
      title,
      message,
    });

    sendSuccess(res, "MESSAGE_SEND_SUCCESS", "Pesan berhasil dikirim", msg, 201);
  } catch (error: any) {
    if (error.message === "Receiver not found") {
      sendError(res, API_CODES.NOT_FOUND, "Pengguna tidak ditemukan", 404);
    } else {
      sendError(res, "MESSAGE_SEND_ERROR", error.message, 500);
    }
  }
};

/**
 * Get message history between admin and a specific user
 * GET /api/v1/messages/history/:userId
 */
export const getMessageHistory = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const senderId = req.user?.userId;
    if (!senderId) {
      sendError(res, API_CODES.UNAUTHORIZED, "Authentication required", 401);
      return;
    }

    const { userId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const result = await messageService.getMessageHistory(
      senderId,
      userId,
      Number(page),
      Number(limit)
    );

    sendSuccess(
      res,
      "MESSAGE_HISTORY_SUCCESS",
      "Riwayat pesan berhasil dimuat",
      result
    );
  } catch (error: any) {
    sendError(res, "MESSAGE_HISTORY_ERROR", error.message, 500);
  }
};

/**
 * User gets their notifications/messages
 * GET /api/v1/messages/my
 */
export const getMyMessages = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      sendError(res, API_CODES.UNAUTHORIZED, "Authentication required", 401);
      return;
    }

    const { page = 1, limit = 20 } = req.query;

    const result = await messageService.getMessagesByReceiver(
      userId,
      Number(page),
      Number(limit)
    );

    sendSuccess(
      res,
      "MESSAGES_FETCH_SUCCESS",
      "Notifikasi berhasil dimuat",
      result
    );
  } catch (error: any) {
    sendError(res, "MESSAGES_FETCH_ERROR", error.message, 500);
  }
};

/**
 * Get unread message count for the authenticated user
 * GET /api/v1/messages/unread-count
 */
export const getUnreadCount = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      sendError(res, API_CODES.UNAUTHORIZED, "Authentication required", 401);
      return;
    }

    const count = await messageService.getUnreadCount(userId);

    sendSuccess(res, "UNREAD_COUNT_SUCCESS", "Jumlah belum dibaca", { count });
  } catch (error: any) {
    sendError(res, "UNREAD_COUNT_ERROR", error.message, 500);
  }
};

/**
 * Mark a single message as read
 * PATCH /api/v1/messages/:id/read
 */
export const markAsRead = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      sendError(res, API_CODES.UNAUTHORIZED, "Authentication required", 401);
      return;
    }

    const { id } = req.params;
    const msg = await messageService.markAsRead(id, userId);

    sendSuccess(res, "MESSAGE_READ_SUCCESS", "Pesan ditandai sudah dibaca", msg);
  } catch (error: any) {
    if (error.message === "Message not found") {
      sendError(res, API_CODES.NOT_FOUND, "Pesan tidak ditemukan", 404);
    } else {
      sendError(res, "MESSAGE_READ_ERROR", error.message, 500);
    }
  }
};

/**
 * Mark all messages as read for the authenticated user
 * PATCH /api/v1/messages/read-all
 */
export const markAllAsRead = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      sendError(res, API_CODES.UNAUTHORIZED, "Authentication required", 401);
      return;
    }

    const count = await messageService.markAllAsRead(userId);

    sendSuccess(
      res,
      "MESSAGES_READ_ALL_SUCCESS",
      "Semua pesan ditandai sudah dibaca",
      { marked_count: count }
    );
  } catch (error: any) {
    sendError(res, "MESSAGES_READ_ALL_ERROR", error.message, 500);
  }
};

/**
 * Admin hard-deletes a message (removed for everyone)
 * DELETE /api/v1/messages/:id
 */
export const adminDeleteMessage = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const senderId = req.user?.userId;
    if (!senderId) {
      sendError(res, API_CODES.UNAUTHORIZED, "Authentication required", 401);
      return;
    }

    const { id } = req.params;
    await messageService.adminDeleteMessage(id, senderId);

    sendSuccess(res, "MESSAGE_DELETE_SUCCESS", "Pesan berhasil dihapus", null);
  } catch (error: any) {
    if (error.message === "Message not found") {
      sendError(res, API_CODES.NOT_FOUND, "Pesan tidak ditemukan", 404);
    } else {
      sendError(res, "MESSAGE_DELETE_ERROR", error.message, 500);
    }
  }
};

/**
 * User soft-deletes a message (hidden from their inbox only)
 * DELETE /api/v1/messages/my/:id
 */
export const userDeleteMessage = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      sendError(res, API_CODES.UNAUTHORIZED, "Authentication required", 401);
      return;
    }

    const { id } = req.params;
    await messageService.userDeleteMessage(id, userId);

    sendSuccess(res, "MESSAGE_DISMISS_SUCCESS", "Notifikasi berhasil dihapus", null);
  } catch (error: any) {
    if (error.message === "Message not found") {
      sendError(res, API_CODES.NOT_FOUND, "Pesan tidak ditemukan", 404);
    } else {
      sendError(res, "MESSAGE_DISMISS_ERROR", error.message, 500);
    }
  }
};
