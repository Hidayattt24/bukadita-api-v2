import prisma from "../config/database";
import logger from "../config/logger";

const senderSelect = {
  id: true, full_name: true, role: true, profil_url: true,
} as const;

const receiverSelect = {
  id: true, full_name: true, email: true, profil_url: true,
} as const;

export const sendMessage = async (data: {
  sender_id: string;
  receiver_id: string;
  title: string;
  message: string;
}) => {
  try {
    const receiver = await prisma.profile.findUnique({
      where: { id: data.receiver_id },
    });

    if (!receiver) {
      throw new Error("Receiver not found");
    }

    const msg = await prisma.adminMessage.create({
      data: {
        sender_id: data.sender_id,
        receiver_id: data.receiver_id,
        title: data.title,
        message: data.message,
      },
      include: {
        sender: { select: senderSelect },
        receiver: { select: receiverSelect },
      },
    });

    return msg;
  } catch (error) {
    logger.error("Error sending message:", error);
    throw error;
  }
};

export const getMessagesByReceiver = async (
  receiverId: string,
  page: number = 1,
  limit: number = 20
) => {
  try {
    const skip = (page - 1) * limit;
    const where = { receiver_id: receiverId, deleted_by_receiver: false };

    const [messages, total, unreadCount] = await Promise.all([
      prisma.adminMessage.findMany({
        where,
        include: { sender: { select: senderSelect } },
        orderBy: { created_at: "desc" },
        skip,
        take: limit,
      }),
      prisma.adminMessage.count({ where }),
      prisma.adminMessage.count({
        where: { ...where, is_read: false },
      }),
    ]);

    return {
      items: messages,
      unread_count: unreadCount,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  } catch (error) {
    logger.error("Error fetching messages for receiver:", error);
    throw new Error("Failed to fetch messages");
  }
};

export const getUnreadCount = async (receiverId: string) => {
  try {
    const count = await prisma.adminMessage.count({
      where: {
        receiver_id: receiverId,
        is_read: false,
        deleted_by_receiver: false,
      },
    });
    return count;
  } catch (error) {
    logger.error("Error fetching unread count:", error);
    throw new Error("Failed to fetch unread count");
  }
};

export const markAsRead = async (messageId: string, receiverId: string) => {
  try {
    const existing = await prisma.adminMessage.findFirst({
      where: { id: messageId, receiver_id: receiverId },
      include: { sender: { select: senderSelect } },
    });

    if (!existing) {
      throw new Error("Message not found");
    }

    if (existing.is_read) {
      return existing;
    }

    const msg = await prisma.adminMessage.update({
      where: { id: messageId },
      data: { is_read: true, read_at: new Date() },
      include: { sender: { select: senderSelect } },
    });

    return msg;
  } catch (error) {
    logger.error("Error marking message as read:", error);
    throw error;
  }
};

export const markAllAsRead = async (receiverId: string) => {
  try {
    const result = await prisma.adminMessage.updateMany({
      where: { receiver_id: receiverId, is_read: false, deleted_by_receiver: false },
      data: { is_read: true, read_at: new Date() },
    });

    return result.count;
  } catch (error) {
    logger.error("Error marking all messages as read:", error);
    throw new Error("Failed to mark all as read");
  }
};

export const getMessageHistory = async (
  adminId: string,
  adminRole: string,
  receiverId: string,
  page: number = 1,
  limit: number = 20
) => {
  try {
    const skip = (page - 1) * limit;
    // Shared history: all admin/superadmin messages to this user are visible
    const where = { receiver_id: receiverId };

    const [messages, total] = await Promise.all([
      prisma.adminMessage.findMany({
        where,
        include: {
          sender: { select: senderSelect },
          receiver: { select: receiverSelect },
        },
        orderBy: { created_at: "desc" },
        skip,
        take: limit,
      }),
      prisma.adminMessage.count({ where }),
    ]);

    return {
      items: messages.map((msg) => ({
        ...msg,
        // Only sender or superadmin can delete
        can_delete: adminRole === "superadmin" || msg.sender_id === adminId,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  } catch (error) {
    logger.error("Error fetching message history:", error);
    throw new Error("Failed to fetch message history");
  }
};

/**
 * Admin hard-deletes a message (gone for everyone)
 */
export const adminDeleteMessage = async (messageId: string, senderId: string) => {
  try {
    const sender = await prisma.profile.findUnique({
      where: { id: senderId },
      select: { role: true },
    });

    const existing = await prisma.adminMessage.findUnique({
      where: { id: messageId },
    });

    if (!existing) {
      throw new Error("Message not found");
    }

    const isSuperAdmin = sender?.role === "superadmin";
    const isMessageOwner = existing.sender_id === senderId;
    if (!isSuperAdmin && !isMessageOwner) {
      throw new Error("Forbidden");
    }

    await prisma.adminMessage.delete({ where: { id: messageId } });
    return true;
  } catch (error) {
    logger.error("Error admin deleting message:", error);
    throw error;
  }
};

/**
 * User soft-deletes a message (hidden from their inbox, still visible to admin)
 */
export const userDeleteMessage = async (messageId: string, receiverId: string) => {
  try {
    const existing = await prisma.adminMessage.findFirst({
      where: { id: messageId, receiver_id: receiverId },
    });

    if (!existing) {
      throw new Error("Message not found");
    }

    const msg = await prisma.adminMessage.update({
      where: { id: messageId },
      data: { deleted_by_receiver: true },
    });

    return msg;
  } catch (error) {
    logger.error("Error user deleting message:", error);
    throw error;
  }
};
