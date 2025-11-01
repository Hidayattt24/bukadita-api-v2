import { Response } from "express";
import { AuthRequest } from "../middlewares/auth.middleware";
import { sendSuccess, sendError, API_CODES } from "../utils/response.util";
import * as authService from "../services/auth.service";

export const register = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const result = await authService.register(req.body);
    sendSuccess(
      res,
      API_CODES.AUTH_REGISTER_SUCCESS,
      "Registration successful",
      result,
      201
    );
  } catch (error: any) {
    sendError(res, "AUTH_REGISTER_ERROR", error.message, 400);
  }
};

export const login = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await authService.login(req.body);
    sendSuccess(res, API_CODES.AUTH_LOGIN_SUCCESS, "Login successful", result);
  } catch (error: any) {
    sendError(res, API_CODES.AUTH_INVALID_CREDENTIALS, error.message, 401);
  }
};

export const refresh = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    // Implement refresh token logic here
    sendSuccess(
      res,
      API_CODES.AUTH_REFRESH_SUCCESS,
      "Token refreshed successfully",
      {}
    );
  } catch (error: any) {
    sendError(res, API_CODES.AUTH_TOKEN_EXPIRED, error.message, 401);
  }
};

export const logout = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    // Implement logout logic here (e.g., blacklist token)
    sendSuccess(res, API_CODES.AUTH_LOGOUT_SUCCESS, "Logout successful", {});
  } catch (error: any) {
    sendError(res, "AUTH_LOGOUT_ERROR", error.message, 400);
  }
};

export const upsertProfile = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const result = await authService.upsertProfile(userId, req.body);
    sendSuccess(
      res,
      API_CODES.AUTH_PROFILE_CREATE_SUCCESS,
      "Profile updated successfully",
      result
    );
  } catch (error: any) {
    sendError(res, "PROFILE_UPDATE_ERROR", error.message, 400);
  }
};

export const createMissingProfile = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const result = await authService.createMissingProfile(userId, req.body);
    sendSuccess(
      res,
      API_CODES.AUTH_PROFILE_CREATE_SUCCESS,
      "Profile created successfully",
      result,
      201
    );
  } catch (error: any) {
    sendError(res, "PROFILE_CREATE_ERROR", error.message, 400);
  }
};
