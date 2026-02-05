import { Response } from "express";
import { AuthRequest } from "../middlewares/auth.middleware";
import { sendSuccess, sendError, API_CODES } from "../utils/response.util";
import * as adminService from "../services/admin.service";

// Get all users progress
export const getAllUsersProgress = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { module_id, search, page = 1, limit = 10 } = req.query;

    const result = await adminService.getAllUsersProgress({
      moduleId: module_id as string | undefined,
      search: search as string | undefined,
      page: Number(page),
      limit: Number(limit),
    });

    sendSuccess(
      res,
      "ADMIN_PROGRESS_FETCH_SUCCESS",
      "Users progress fetched successfully",
      result
    );
  } catch (error: any) {
    sendError(res, "ADMIN_PROGRESS_FETCH_ERROR", error.message, 500);
  }
};

// Get specific user progress
export const getUserProgress = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { userId } = req.params;
    const { module_id } = req.query;

    const result = await adminService.getUserProgress(
      userId,
      module_id as string | undefined
    );

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

// Get all quiz attempts
export const getQuizAttempts = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { quiz_id, user_id, module_id, page = 1, limit = 10 } = req.query;

    const result = await adminService.getQuizAttempts({
      quizId: quiz_id as string | undefined,
      userId: user_id as string | undefined,
      moduleId: module_id as string | undefined,
      page: Number(page),
      limit: Number(limit),
    });

    sendSuccess(
      res,
      "QUIZ_ATTEMPTS_FETCH_SUCCESS",
      "Quiz attempts fetched successfully",
      result
    );
  } catch (error: any) {
    sendError(res, "QUIZ_ATTEMPTS_FETCH_ERROR", error.message, 500);
  }
};

// Get quiz attempt detail
export const getQuizAttemptDetail = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { attemptId } = req.params;

    const result = await adminService.getQuizAttemptDetail(attemptId);

    if (!result) {
      sendError(res, API_CODES.NOT_FOUND, "Quiz attempt not found", 404);
      return;
    }

    sendSuccess(
      res,
      "QUIZ_ATTEMPT_DETAIL_SUCCESS",
      "Quiz attempt detail fetched successfully",
      result
    );
  } catch (error: any) {
    sendError(res, "QUIZ_ATTEMPT_DETAIL_ERROR", error.message, 500);
  }
};

// Get progress statistics
export const getProgressStats = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const result = await adminService.getProgressStats();

    sendSuccess(
      res,
      "STATS_FETCH_SUCCESS",
      "Progress statistics fetched successfully",
      result
    );
  } catch (error: any) {
    sendError(res, "STATS_FETCH_ERROR", error.message, 500);
  }
};

// Get all users list
export const getAllUsers = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { role, search, page = 1, limit = 10 } = req.query;

    const result = await adminService.getAllUsers({
      role: role as string | undefined,
      search: search as string | undefined,
      page: Number(page),
      limit: Number(limit),
    });

    // Add visibility rules based on caller's role
    const callerRole = req.user?.role || 'pengguna';
    const allowedRoles: string[] = ['pengguna'];

    // Superadmin can manage both pengguna and admin
    if (callerRole === 'superadmin') {
      allowedRoles.push('admin');
    }

    const responseWithVisibility = {
      ...result,
      visibility: {
        caller_role: callerRole,
        allowed_roles: allowedRoles,
        excluded_self: true
      }
    };

    sendSuccess(
      res,
      "USERS_FETCH_SUCCESS",
      "Users fetched successfully",
      responseWithVisibility
    );
  } catch (error: any) {
    sendError(res, "USERS_FETCH_ERROR", error.message, 500);
  }
};

// Update user role
export const updateUserRole = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    if (!["pengguna", "admin", "superadmin"].includes(role)) {
      sendError(
        res,
        API_CODES.VALIDATION_ERROR,
        "Invalid role. Must be pengguna, admin, or superadmin",
        400
      );
      return;
    }

    const result = await adminService.updateUserRole(userId, role);

    sendSuccess(
      res,
      "USER_ROLE_UPDATE_SUCCESS",
      "User role updated successfully",
      result
    );
  } catch (error: any) {
    sendError(res, "USER_ROLE_UPDATE_ERROR", error.message, 400);
  }
};

// Get activity logs
export const getActivityLogs = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { user_id, action, resource_type, page = 1, limit = 20 } = req.query;

    const result = await adminService.getActivityLogs({
      userId: user_id as string | undefined,
      action: action as string | undefined,
      resourceType: resource_type as string | undefined,
      page: Number(page),
      limit: Number(limit),
    });

    sendSuccess(
      res,
      "ACTIVITY_LOGS_FETCH_SUCCESS",
      "Activity logs fetched successfully",
      result
    );
  } catch (error: any) {
    sendError(res, "ACTIVITY_LOGS_FETCH_ERROR", error.message, 500);
  }
};

// Reset user progress
export const resetUserProgress = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { userId } = req.params;
    const { module_id } = req.body;

    if (!module_id) {
      sendError(res, API_CODES.VALIDATION_ERROR, "module_id is required", 400);
      return;
    }

    const result = await adminService.resetUserProgress(userId, module_id);

    sendSuccess(
      res,
      "PROGRESS_RESET_SUCCESS",
      "User progress reset successfully",
      result
    );
  } catch (error: any) {
    sendError(res, "PROGRESS_RESET_ERROR", error.message, 400);
  }
};

// Create new user (Superadmin can create Admin)
export const createUser = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    console.log("📝 [CREATE USER] Request received");
    console.log("👤 [CREATE USER] User:", req.user?.email, req.user?.role);
    console.log("📦 [CREATE USER] Body:", req.body);

    const { email, password, full_name, phone, role } = req.body;

    // Validate required fields - email OR phone must be provided
    if ((!email && !phone) || !password || !full_name) {
      console.log("❌ [CREATE USER] Missing required fields");
      sendError(
        res,
        API_CODES.VALIDATION_ERROR,
        "email or phone, password, and full_name are required",
        400
      );
      return;
    }

    // Validate role
    if (role && !["pengguna", "admin"].includes(role)) {
      console.log("❌ [CREATE USER] Invalid role:", role);
      sendError(
        res,
        API_CODES.VALIDATION_ERROR,
        "Invalid role. Must be pengguna or admin",
        400
      );
      return;
    }

    console.log("✅ [CREATE USER] Validation passed, calling service...");
    const result = await adminService.createUser({
      email,
      password,
      full_name,
      phone,
      role: role || "pengguna",
    });
    console.log("✅ [CREATE USER] User created successfully:", result.id);

    sendSuccess(
      res,
      "USER_CREATE_SUCCESS",
      "User created successfully",
      result,
      201
    );
  } catch (error: any) {
    console.log("❌ [CREATE USER] Error:", error);
    sendError(res, "USER_CREATE_ERROR", error.message, 400);
  }
};

// Update user profile
export const updateUser = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { userId } = req.params;
    const updateData = req.body;

    // Don't allow role update through this endpoint
    delete updateData.role;

    const result = await adminService.updateUser(userId, updateData);

    if (!result) {
      sendError(res, API_CODES.NOT_FOUND, "User not found", 404);
      return;
    }

    sendSuccess(
      res,
      "USER_UPDATE_SUCCESS",
      "User updated successfully",
      result
    );
  } catch (error: any) {
    sendError(res, "USER_UPDATE_ERROR", error.message, 400);
  }
};

// Delete user
export const deleteUser = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user?.userId;

    // Prevent self-deletion
    if (userId === currentUserId) {
      sendError(
        res,
        API_CODES.VALIDATION_ERROR,
        "You cannot delete your own account",
        400
      );
      return;
    }

    const result = await adminService.deleteUser(userId);

    if (!result) {
      sendError(res, API_CODES.NOT_FOUND, "User not found", 404);
      return;
    }

    sendSuccess(res, "USER_DELETE_SUCCESS", "User deleted successfully", {
      id: userId,
    });
  } catch (error: any) {
    sendError(res, "USER_DELETE_ERROR", error.message, 400);
  }
};

// Get quiz performance detailed
export const getQuizPerformanceDetailed = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { module_id } = req.query;

    const result = await adminService.getQuizPerformanceDetailed(
      module_id as string | undefined
    );

    sendSuccess(
      res,
      "QUIZ_PERFORMANCE_DETAILED_SUCCESS",
      "Quiz performance details fetched successfully",
      result
    );
  } catch (error: any) {
    sendError(res, "QUIZ_PERFORMANCE_DETAILED_ERROR", error.message, 500);
  }
};

// Get recent activities classified (deduplicated by user)
export const getRecentActivitiesClassified = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { limit = 20 } = req.query;

    const result = await adminService.getRecentActivitiesClassified(
      Number(limit)
    );

    sendSuccess(
      res,
      "RECENT_ACTIVITIES_CLASSIFIED_SUCCESS",
      "Recent activities fetched successfully",
      result
    );
  } catch (error: any) {
    sendError(res, "RECENT_ACTIVITIES_CLASSIFIED_ERROR", error.message, 500);
  }
};
