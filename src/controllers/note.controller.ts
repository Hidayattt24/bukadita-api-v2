import { Response } from "express";
import { AuthRequest } from "../middlewares/auth.middleware";
import { sendSuccess, sendError, API_CODES } from "../utils/response.util";
import * as noteService from "../services/note.service";

/**
 * Get all notes for authenticated user
 * GET /api/v1/notes
 */
export const getUserNotes = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      sendError(res, API_CODES.UNAUTHORIZED, "Authentication required", 401);
      return;
    }

    const { page = 1, limit = 10, category, search } = req.query;

    const result = await noteService.getUserNotes(
      userId,
      Number(page),
      Number(limit),
      category as string,
      search as string
    );

    sendSuccess(
      res,
      "NOTES_FETCH_SUCCESS",
      "Notes fetched successfully",
      result
    );
  } catch (error: any) {
    sendError(res, "NOTES_FETCH_ERROR", error.message, 500);
  }
};

/**
 * Get single note by ID
 * GET /api/v1/notes/:id
 */
export const getNoteById = async (
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
    const note = await noteService.getNoteById(id, userId);

    if (!note) {
      sendError(res, API_CODES.NOT_FOUND, "Note not found", 404);
      return;
    }

    sendSuccess(res, "NOTE_FETCH_SUCCESS", "Note fetched successfully", note);
  } catch (error: any) {
    sendError(res, "NOTE_FETCH_ERROR", error.message, 500);
  }
};

/**
 * Create new note
 * POST /api/v1/notes
 */
export const createNote = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      sendError(res, API_CODES.UNAUTHORIZED, "Authentication required", 401);
      return;
    }

    const { title, content, category, is_pinned } = req.body;

    if (!title || !content) {
      sendError(
        res,
        API_CODES.VALIDATION_ERROR,
        "Title and content are required",
        400
      );
      return;
    }

    const note = await noteService.createNote({
      user_id: userId,
      title,
      content,
      category,
      is_pinned,
    });

    sendSuccess(res, "NOTE_CREATE_SUCCESS", "Note created successfully", note, 201);
  } catch (error: any) {
    sendError(res, "NOTE_CREATE_ERROR", error.message, 500);
  }
};

/**
 * Update note
 * PUT /api/v1/notes/:id
 */
export const updateNote = async (
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
    const { title, content, category, is_pinned } = req.body;

    const note = await noteService.updateNote(id, userId, {
      title,
      content,
      category,
      is_pinned,
    });

    sendSuccess(res, "NOTE_UPDATE_SUCCESS", "Note updated successfully", note);
  } catch (error: any) {
    if (error.message.includes("not found")) {
      sendError(res, API_CODES.NOT_FOUND, error.message, 404);
    } else {
      sendError(res, "NOTE_UPDATE_ERROR", error.message, 500);
    }
  }
};

/**
 * Delete note
 * DELETE /api/v1/notes/:id
 */
export const deleteNote = async (
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
    await noteService.deleteNote(id, userId);

    sendSuccess(res, "NOTE_DELETE_SUCCESS", "Note deleted successfully", null);
  } catch (error: any) {
    if (error.message.includes("not found")) {
      sendError(res, API_CODES.NOT_FOUND, error.message, 404);
    } else {
      sendError(res, "NOTE_DELETE_ERROR", error.message, 500);
    }
  }
};

/**
 * Toggle pin status
 * PATCH /api/v1/notes/:id/pin
 */
export const togglePinNote = async (
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
    const note = await noteService.togglePinNote(id, userId);

    sendSuccess(
      res,
      "NOTE_PIN_TOGGLE_SUCCESS",
      "Note pin status toggled successfully",
      note
    );
  } catch (error: any) {
    if (error.message.includes("not found")) {
      sendError(res, API_CODES.NOT_FOUND, error.message, 404);
    } else {
      sendError(res, "NOTE_PIN_TOGGLE_ERROR", error.message, 500);
    }
  }
};

/**
 * Get user note categories
 * GET /api/v1/notes/categories
 */
export const getUserNoteCategories = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      sendError(res, API_CODES.UNAUTHORIZED, "Authentication required", 401);
      return;
    }

    const categories = await noteService.getUserNoteCategories(userId);

    sendSuccess(
      res,
      "CATEGORIES_FETCH_SUCCESS",
      "Categories fetched successfully",
      categories
    );
  } catch (error: any) {
    sendError(res, "CATEGORIES_FETCH_ERROR", error.message, 500);
  }
};
