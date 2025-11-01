import { Request, Response, NextFunction } from "express";
import { sendError, API_CODES } from "../utils/response.util";
import logger from "../config/logger";

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  logger.error("Error:", {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
  });

  sendError(
    res,
    API_CODES.INTERNAL_ERROR,
    process.env.NODE_ENV === "production"
      ? "Internal server error"
      : err.message,
    500
  );
};
