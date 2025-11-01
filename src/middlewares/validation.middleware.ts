import { Request, Response, NextFunction } from "express";
import { ZodSchema } from "zod";
import { sendError, API_CODES } from "../utils/response.util";

export const validate = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      schema.parse(req.body);
      next();
    } catch (error: any) {
      const errors = error.errors?.map((err: any) => ({
        field: err.path.join("."),
        message: err.message,
      }));

      sendError(res, API_CODES.VALIDATION_ERROR, "Validation failed", 400, {
        errors,
      });
    }
  };
};
