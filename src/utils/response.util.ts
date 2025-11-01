import { Response } from "express";

export interface ApiResponse<T = any> {
  error: boolean;
  code: string;
  message: string;
  data?: T;
}

export const sendSuccess = <T>(
  res: Response,
  code: string,
  message: string,
  data?: T,
  statusCode: number = 200
): Response => {
  const response: ApiResponse<T> = {
    error: false,
    code,
    message,
    data,
  };
  return res.status(statusCode).json(response);
};

export const sendError = (
  res: Response,
  code: string,
  message: string,
  statusCode: number = 400,
  data?: any
): Response => {
  const response: ApiResponse = {
    error: true,
    code,
    message,
    data,
  };
  return res.status(statusCode).json(response);
};

export const API_CODES = {
  // Auth
  AUTH_REGISTER_SUCCESS: "AUTH_REGISTER_SUCCESS",
  AUTH_LOGIN_SUCCESS: "AUTH_LOGIN_SUCCESS",
  AUTH_LOGOUT_SUCCESS: "AUTH_LOGOUT_SUCCESS",
  AUTH_REFRESH_SUCCESS: "AUTH_REFRESH_SUCCESS",
  AUTH_PROFILE_CREATE_SUCCESS: "AUTH_PROFILE_CREATE_SUCCESS",
  AUTH_INVALID_CREDENTIALS: "AUTH_INVALID_CREDENTIALS",
  AUTH_TOKEN_EXPIRED: "AUTH_TOKEN_EXPIRED",

  // Modules
  MODULES_FETCH_SUCCESS: "MODULES_FETCH_SUCCESS",
  MODULE_CREATE_SUCCESS: "MODULE_CREATE_SUCCESS",
  MODULE_UPDATE_SUCCESS: "MODULE_UPDATE_SUCCESS",
  MODULE_DELETE_SUCCESS: "MODULE_DELETE_SUCCESS",
  MODULE_NOT_FOUND: "MODULE_NOT_FOUND",

  // Quiz
  QUIZ_FETCH_SUCCESS: "QUIZ_FETCH_SUCCESS",
  QUIZ_START_SUCCESS: "QUIZ_START_SUCCESS",
  QUIZ_SUBMIT_SUCCESS: "QUIZ_SUBMIT_SUCCESS",

  // Progress
  PROGRESS_FETCH_SUCCESS: "PROGRESS_FETCH_SUCCESS",
  PROGRESS_UPDATE_SUCCESS: "PROGRESS_UPDATE_SUCCESS",

  // General
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  INTERNAL_ERROR: "INTERNAL_ERROR",
  NOT_FOUND: "NOT_FOUND",
};
