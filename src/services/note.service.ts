import prisma from "../config/database";
import logger from "../config/logger";

/**
 * Get all notes for a user with pagination
 */
export const getUserNotes = async (
  userId: string,
  page: number = 1,
  limit: number = 10,
  category?: string,
  search?: string
) => {
  try {
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {
      user_id: userId,
    };

    if (category && category !== "all") {
      where.category = category;
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { content: { contains: search, mode: "insensitive" } },
      ];
    }

    const [notes, total] = await Promise.all([
      prisma.userNote.findMany({
        where,
        orderBy: [{ is_pinned: "desc" }, { created_at: "desc" }],
        skip,
        take: limit,
      }),
      prisma.userNote.count({ where }),
    ]);

    return {
      items: notes,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  } catch (error) {
    logger.error("Error fetching user notes:", error);
    throw new Error("Failed to fetch notes");
  }
};

/**
 * Get single note by ID
 */
export const getNoteById = async (noteId: string, userId: string) => {
  try {
    const note = await prisma.userNote.findFirst({
      where: {
        id: noteId,
        user_id: userId, // Ensure user owns this note
      },
    });

    return note;
  } catch (error) {
    logger.error("Error fetching note:", error);
    throw new Error("Failed to fetch note");
  }
};

/**
 * Create new note
 */
export const createNote = async (data: {
  user_id: string;
  title: string;
  content: string;
  category?: string;
  is_pinned?: boolean;
}) => {
  try {
    const note = await prisma.userNote.create({
      data: {
        user_id: data.user_id,
        title: data.title,
        content: data.content,
        category: data.category || "Umum",
        is_pinned: data.is_pinned || false,
      },
    });

    return note;
  } catch (error) {
    logger.error("Error creating note:", error);
    throw new Error("Failed to create note");
  }
};

/**
 * Update note
 */
export const updateNote = async (
  noteId: string,
  userId: string,
  data: {
    title?: string;
    content?: string;
    category?: string;
    is_pinned?: boolean;
  }
) => {
  try {
    // Check if note exists and belongs to user
    const existingNote = await prisma.userNote.findFirst({
      where: {
        id: noteId,
        user_id: userId,
      },
    });

    if (!existingNote) {
      throw new Error("Note not found or access denied");
    }

    const note = await prisma.userNote.update({
      where: { id: noteId },
      data: {
        ...data,
        updated_at: new Date(),
      },
    });

    return note;
  } catch (error) {
    logger.error("Error updating note:", error);
    throw error;
  }
};

/**
 * Delete note
 */
export const deleteNote = async (noteId: string, userId: string) => {
  try {
    // Check if note exists and belongs to user
    const existingNote = await prisma.userNote.findFirst({
      where: {
        id: noteId,
        user_id: userId,
      },
    });

    if (!existingNote) {
      throw new Error("Note not found or access denied");
    }

    await prisma.userNote.delete({
      where: { id: noteId },
    });

    return true;
  } catch (error) {
    logger.error("Error deleting note:", error);
    throw error;
  }
};

/**
 * Toggle pin status
 */
export const togglePinNote = async (noteId: string, userId: string) => {
  try {
    const existingNote = await prisma.userNote.findFirst({
      where: {
        id: noteId,
        user_id: userId,
      },
    });

    if (!existingNote) {
      throw new Error("Note not found or access denied");
    }

    const note = await prisma.userNote.update({
      where: { id: noteId },
      data: {
        is_pinned: !existingNote.is_pinned,
        updated_at: new Date(),
      },
    });

    return note;
  } catch (error) {
    logger.error("Error toggling pin note:", error);
    throw error;
  }
};

/**
 * Get note categories for a user
 */
export const getUserNoteCategories = async (userId: string) => {
  try {
    const categories = await prisma.userNote.findMany({
      where: { user_id: userId },
      select: { category: true },
      distinct: ["category"],
    });

    return categories.map((c) => c.category).filter(Boolean);
  } catch (error) {
    logger.error("Error fetching note categories:", error);
    throw new Error("Failed to fetch categories");
  }
};
