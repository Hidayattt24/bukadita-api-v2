import { Response } from "express";
import { AuthRequest } from "../middlewares/auth.middleware";
import { sendSuccess, sendError } from "../utils/response.util";
import * as progressMonitoringService from "../services/progress-monitoring.service";

/**
 * GET /api/admin/progress-monitoring/stats
 * Get progress monitoring statistics (Total, Active, Struggling, Inactive users)
 */
export const getProgressMonitoringStats = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const result = await progressMonitoringService.getProgressMonitoringStats();

    sendSuccess(
      res,
      "PROGRESS_MONITORING_STATS_SUCCESS",
      "Progress monitoring statistics fetched successfully",
      result
    );
  } catch (error: any) {
    console.error("Error in getProgressMonitoringStats:", error);
    sendError(res, "PROGRESS_MONITORING_STATS_ERROR", error.message, 500);
  }
};

/**
 * GET /api/admin/progress-monitoring/module-stats
 * Get module completion and stuck statistics
 */
export const getModuleCompletionStats = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const result = await progressMonitoringService.getModuleCompletionStats();

    sendSuccess(
      res,
      "MODULE_COMPLETION_STATS_SUCCESS",
      "Module completion statistics fetched successfully",
      result
    );
  } catch (error: any) {
    console.error("Error in getModuleCompletionStats:", error);
    sendError(res, "MODULE_COMPLETION_STATS_ERROR", error.message, 500);
  }
};

/**
 * GET /api/admin/progress-monitoring/users
 * Get user progress list with filtering and pagination
 */
export const getUserProgressList = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { search, status, page = "1", limit = "10" } = req.query;

    const result = await progressMonitoringService.getUserProgressList({
      search: search as string | undefined,
      status: status as "active" | "struggling" | "inactive" | "all" | undefined,
      page: parseInt(page as string),
      limit: parseInt(limit as string),
    });

    sendSuccess(
      res,
      "USER_PROGRESS_LIST_SUCCESS",
      "User progress list fetched successfully",
      result
    );
  } catch (error: any) {
    console.error("Error in getUserProgressList:", error);
    sendError(res, "USER_PROGRESS_LIST_ERROR", error.message, 500);
  }
};

/**
 * GET /api/admin/progress-monitoring/users/:userId
 * Get detailed progress for a specific user
 */
export const getUserDetailProgress = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { userId } = req.params;

    const result = await progressMonitoringService.getUserDetailProgress(userId);

    sendSuccess(
      res,
      "USER_DETAIL_PROGRESS_SUCCESS",
      "User detail progress fetched successfully",
      result
    );
  } catch (error: any) {
    console.error("Error in getUserDetailProgress:", error);
    
    if (error.message === "User not found") {
      sendError(res, "USER_NOT_FOUND", error.message, 404);
      return;
    }

    sendError(res, "USER_DETAIL_PROGRESS_ERROR", error.message, 500);
  }
};

/**
 * GET /api/admin/progress-monitoring/reading-progress
 * Get reading progress statistics per module
 */
export const getReadingProgressStats = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const result = await progressMonitoringService.getReadingProgressStats();

    sendSuccess(
      res,
      "READING_PROGRESS_STATS_SUCCESS",
      "Reading progress statistics fetched successfully",
      result
    );
  } catch (error: any) {
    console.error("Error in getReadingProgressStats:", error);
    sendError(res, "READING_PROGRESS_STATS_ERROR", error.message, 500);
  }
};

/**
 * GET /api/admin/progress-monitoring/stuck-users/:moduleId
 * Get list of users who are stuck in a specific module
 */
export const getStuckUsersByModule = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { moduleId } = req.params;

    const result = await progressMonitoringService.getStuckUsersByModule(moduleId);

    sendSuccess(
      res,
      "STUCK_USERS_SUCCESS",
      "Stuck users fetched successfully",
      result
    );
  } catch (error: any) {
    console.error("Error in getStuckUsersByModule:", error);
    
    if (error.message === "Module not found") {
      sendError(res, "MODULE_NOT_FOUND", error.message, 404);
      return;
    }

    sendError(res, "STUCK_USERS_ERROR", error.message, 500);
  }
};
