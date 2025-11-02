import { Response } from "express";
import { AuthRequest } from "../middlewares/auth.middleware";
import { UserService } from "../services/user.service";
import logger from "../config/logger";

export class UserController {
  /**
   * GET /api/v1/users/me
   * Get current user profile
   */
  static async getProfile(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        return res.status(401).json({
          error: true,
          code: "UNAUTHORIZED",
          message: "User not authenticated",
        });
      }

      const profile = await UserService.getUserProfile(userId);

      return res.status(200).json({
        error: false,
        code: "PROFILE_RETRIEVED",
        message: "Profile retrieved successfully",
        data: profile,
      });
    } catch (error: any) {
      logger.error("Get profile error:", error);

      if (error.message === "Profile not found") {
        return res.status(404).json({
          error: true,
          code: "PROFILE_NOT_FOUND",
          message: "Profile not found",
        });
      }

      return res.status(500).json({
        error: true,
        code: "INTERNAL_ERROR",
        message: "Failed to retrieve profile",
      });
    }
  }

  /**
   * PUT /api/v1/users/me
   * Update current user profile
   */
  static async updateProfile(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        return res.status(401).json({
          error: true,
          code: "UNAUTHORIZED",
          message: "User not authenticated",
        });
      }

      const { full_name, phone, address, date_of_birth } = req.body;

      // Validate at least one field is provided
      if (!full_name && !phone && !address && !date_of_birth) {
        return res.status(400).json({
          error: true,
          code: "VALIDATION_ERROR",
          message: "At least one field must be provided",
        });
      }

      const profile = await UserService.updateProfile(userId, {
        full_name,
        phone,
        address,
        date_of_birth,
      });

      return res.status(200).json({
        error: false,
        code: "PROFILE_UPDATED",
        message: "Profile updated successfully",
        data: profile,
      });
    } catch (error: any) {
      logger.error("Update profile error:", error);

      if (error.message === "Profile not found") {
        return res.status(404).json({
          error: true,
          code: "PROFILE_NOT_FOUND",
          message: "Profile not found",
        });
      }

      if (error.message.includes("Phone number already used")) {
        return res.status(409).json({
          error: true,
          code: "PHONE_ALREADY_EXISTS",
          message: error.message,
        });
      }

      if (error.message === "Invalid date format") {
        return res.status(400).json({
          error: true,
          code: "INVALID_DATE",
          message: "Invalid date format",
        });
      }

      return res.status(500).json({
        error: true,
        code: "INTERNAL_ERROR",
        message: "Failed to update profile",
      });
    }
  }

  /**
   * POST /api/v1/users/me/profile-photo
   * Upload profile photo
   */
  static async uploadProfilePhoto(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        return res.status(401).json({
          error: true,
          code: "UNAUTHORIZED",
          message: "User not authenticated",
        });
      }

      const file = req.file;

      if (!file) {
        return res.status(400).json({
          error: true,
          code: "FILE_MISSING",
          message: "No file uploaded",
        });
      }

      const result = await UserService.uploadProfilePhoto(userId, file);

      // Get updated profile
      const profile = await UserService.getUserProfile(userId);

      return res.status(200).json({
        error: false,
        code: "PHOTO_UPLOADED",
        message: "Profile photo uploaded successfully",
        data: {
          profile,
          photo_url: result.photo_url,
          filename: result.filename,
        },
      });
    } catch (error: any) {
      logger.error("Upload profile photo error:", error);

      if (error.message === "Profile not found") {
        return res.status(404).json({
          error: true,
          code: "PROFILE_NOT_FOUND",
          message: "Profile not found",
        });
      }

      return res.status(500).json({
        error: true,
        code: "INTERNAL_ERROR",
        message: "Failed to upload profile photo",
      });
    }
  }

  /**
   * DELETE /api/v1/users/me/profile-photo
   * Delete profile photo
   */
  static async deleteProfilePhoto(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        return res.status(401).json({
          error: true,
          code: "UNAUTHORIZED",
          message: "User not authenticated",
        });
      }

      const profile = await UserService.deleteProfilePhoto(userId);

      return res.status(200).json({
        error: false,
        code: "PHOTO_DELETED",
        message: "Profile photo deleted successfully",
        data: { profile },
      });
    } catch (error: any) {
      logger.error("Delete profile photo error:", error);

      if (error.message === "Profile not found") {
        return res.status(404).json({
          error: true,
          code: "PROFILE_NOT_FOUND",
          message: "Profile not found",
        });
      }

      if (error.message === "No profile photo to delete") {
        return res.status(404).json({
          error: true,
          code: "NO_PHOTO",
          message: "No profile photo to delete",
        });
      }

      return res.status(500).json({
        error: true,
        code: "INTERNAL_ERROR",
        message: "Failed to delete profile photo",
      });
    }
  }

  /**
   * POST /api/v1/users/me/change-password
   * Change user password
   */
  static async changePassword(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        return res.status(401).json({
          error: true,
          code: "UNAUTHORIZED",
          message: "User not authenticated",
        });
      }

      const { currentPassword, newPassword } = req.body;

      // Validate input
      if (!currentPassword || !newPassword) {
        return res.status(400).json({
          error: true,
          code: "VALIDATION_ERROR",
          message: "Current password and new password are required",
        });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({
          error: true,
          code: "VALIDATION_ERROR",
          message: "New password must be at least 6 characters",
        });
      }

      await UserService.changePassword(userId, currentPassword, newPassword);

      return res.status(200).json({
        error: false,
        code: "PASSWORD_CHANGED",
        message: "Password changed successfully",
      });
    } catch (error: any) {
      logger.error("Change password error:", error);

      if (error.message === "User credentials not found") {
        return res.status(404).json({
          error: true,
          code: "CREDENTIALS_NOT_FOUND",
          message: "User credentials not found",
        });
      }

      if (error.message === "Current password is incorrect") {
        return res.status(400).json({
          error: true,
          code: "INVALID_CURRENT_PASSWORD",
          message: "Current password is incorrect",
        });
      }

      return res.status(500).json({
        error: true,
        code: "INTERNAL_ERROR",
        message: "Failed to change password",
      });
    }
  }
}
