import { Response } from "express";
import { AuthRequest } from "../middlewares/auth.middleware";
import { sendSuccess, sendError, API_CODES } from "../utils/response.util";
import * as moduleService from "../services/module.service";

export const getAllModules = async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const published =
      req.query.published === "true"
        ? true
        : req.query.published === "false"
          ? false
          : undefined;

    const result = await moduleService.getAllModules({
      page,
      limit,
      published,
    });
    sendSuccess(
      res,
      API_CODES.MODULES_FETCH_SUCCESS,
      "Modules retrieved successfully",
      result
    );
  } catch (error: any) {
    sendError(res, "MODULES_FETCH_ERROR", error.message, 400);
  }
};

export const getModuleBySlug = async (req: AuthRequest, res: Response) => {
  try {
    const { slug } = req.params;
    const userId = req.user?.userId;

    const result = await moduleService.getModuleBySlug(slug, userId);
    sendSuccess(
      res,
      API_CODES.MODULES_FETCH_SUCCESS,
      "Module retrieved successfully",
      result
    );
  } catch (error: any) {
    sendError(res, API_CODES.MODULE_NOT_FOUND, error.message, 404);
  }
};

export const createModule = async (req: AuthRequest, res: Response) => {
  try {
    const created_by = req.user!.userId;
    const result = await moduleService.createModule({
      ...req.body,
      created_by,
    });
    sendSuccess(
      res,
      API_CODES.MODULE_CREATE_SUCCESS,
      "Module created successfully",
      result,
      201
    );
  } catch (error: any) {
    sendError(res, "MODULE_CREATE_ERROR", error.message, 400);
  }
};

export const updateModule = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const result = await moduleService.updateModule(id, req.body);
    sendSuccess(
      res,
      API_CODES.MODULE_UPDATE_SUCCESS,
      "Module updated successfully",
      result
    );
  } catch (error: any) {
    sendError(res, "MODULE_UPDATE_ERROR", error.message, 400);
  }
};

export const deleteModule = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    await moduleService.deleteModule(id);
    sendSuccess(
      res,
      API_CODES.MODULE_DELETE_SUCCESS,
      "Module deleted successfully"
    );
  } catch (error: any) {
    sendError(res, "MODULE_DELETE_ERROR", error.message, 400);
  }
};
