import { Response } from "express";
import { AuthRequest } from "../middlewares/auth.middleware";
import { sendSuccess, sendError, API_CODES } from "../utils/response.util";
import * as progressService from "../services/progress.service";

// Get user's modules progress
export const getUserModulesProgress = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      sendError(res, API_CODES.UNAUTHORIZED, "Authentication required", 401);
      return;
    }

    const result = await progressService.getUserModulesProgress(userId);

    sendSuccess(
      res,
      API_CODES.PROGRESS_FETCH_SUCCESS,
      "Modules progress fetched successfully",
      result
    );
  } catch (error: any) {
    sendError(res, "PROGRESS_FETCH_ERROR", error.message, 500);
  }
};

// Get specific module progress
export const getModuleProgress = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      sendError(res, API_CODES.UNAUTHORIZED, "Authentication required", 401);
      return;
    }

    const result = await progressService.getModuleProgress(userId, id);

    sendSuccess(
      res,
      API_CODES.PROGRESS_FETCH_SUCCESS,
      "Module progress fetched successfully",
      result
    );
  } catch (error: any) {
    sendError(res, "PROGRESS_FETCH_ERROR", error.message, 500);
  }
};

// Get sub-materi progress
export const getSubMateriProgress = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      sendError(res, API_CODES.UNAUTHORIZED, "Authentication required", 401);
      return;
    }

    const result = await progressService.getSubMateriProgress(userId, id);

    sendSuccess(
      res,
      API_CODES.PROGRESS_FETCH_SUCCESS,
      "Sub-materi progress fetched successfully",
      result
    );
  } catch (error: any) {
    sendError(res, "PROGRESS_FETCH_ERROR", error.message, 500);
  }
};

// Complete sub-materi
export const completeSubMateri = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;
    const { module_id } = req.body || {};

    if (!userId) {
      sendError(res, API_CODES.UNAUTHORIZED, "Authentication required", 401);
      return;
    }

    const result = await progressService.completeSubMateri(
      userId,
      id,
      module_id
    );

    sendSuccess(
      res,
      API_CODES.PROGRESS_UPDATE_SUCCESS,
      "Sub-materi marked as completed",
      result
    );
  } catch (error: any) {
    sendError(res, "PROGRESS_UPDATE_ERROR", error.message, 500);
  }
};

// Check material access
export const checkMaterialAccess = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      sendError(res, API_CODES.UNAUTHORIZED, "Authentication required", 401);
      return;
    }

    const result = await progressService.checkMaterialAccess(userId, id);

    sendSuccess(res, "ACCESS_CHECK_SUCCESS", "Access check completed", result);
  } catch (error: any) {
    sendError(res, "ACCESS_CHECK_ERROR", error.message, 500);
  }
};

// Complete poin
export const completePoin = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      sendError(res, API_CODES.UNAUTHORIZED, "Authentication required", 401);
      return;
    }

    const result = await progressService.completePoin(userId, id);

    sendSuccess(
      res,
      API_CODES.PROGRESS_UPDATE_SUCCESS,
      "Poin marked as completed",
      result
    );
  } catch (error: any) {
    sendError(res, "PROGRESS_UPDATE_ERROR", error.message, 500);
  }
};

// Get quiz progress
export const getQuizProgress = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      sendError(res, API_CODES.UNAUTHORIZED, "Authentication required", 401);
      return;
    }

    const result = await progressService.getQuizProgress(userId, id);

    sendSuccess(
      res,
      API_CODES.PROGRESS_FETCH_SUCCESS,
      "Quiz progress fetched successfully",
      result
    );
  } catch (error: any) {
    sendError(res, "PROGRESS_FETCH_ERROR", error.message, 500);
  }
};

// Get overall user statistics
export const getUserStats = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      sendError(res, API_CODES.UNAUTHORIZED, "Authentication required", 401);
      return;
    }

    const result = await progressService.getUserStats(userId);

    sendSuccess(
      res,
      "STATS_FETCH_SUCCESS",
      "User statistics fetched successfully",
      result
    );
  } catch (error: any) {
    sendError(res, "STATS_FETCH_ERROR", error.message, 500);
  }
};

// Admin: Get all users progress (for monitoring)
export const getAllUsersProgress = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { page = 1, limit = 20, search = "" } = req.query;

    const result = await progressService.getAllUsersProgress({
      page: Number(page),
      limit: Number(limit),
      search: String(search),
    });

    sendSuccess(
      res,
      "ALL_PROGRESS_FETCH_SUCCESS",
      "All users progress fetched successfully",
      result
    );
  } catch (error: any) {
    sendError(res, "ALL_PROGRESS_FETCH_ERROR", error.message, 500);
  }
};

// Admin: Get specific user progress
export const getSpecificUserProgress = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { userId } = req.params;

    const result = await progressService.getUserModulesProgress(userId);

    sendSuccess(
      res,
      "USER_PROGRESS_FETCH_SUCCESS",
      "User progress fetched successfully",
      result
    );
  } catch (error: any) {
    sendError(res, "USER_PROGRESS_FETCH_ERROR", error.message, 500);
  }
};
