import { Response } from "express";
import { AuthRequest } from "../middlewares/auth.middleware";
import { sendSuccess, sendError, API_CODES } from "../utils/response.util";
import * as materialService from "../services/material.service";

// Admin: Get all materials by module (including unpublished)
export const getAllMaterials = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { module_id, page = 1, limit = 10 } = req.query;

    if (!module_id) {
      sendError(res, API_CODES.VALIDATION_ERROR, "module_id is required", 400);
      return;
    }

    const result = await materialService.getAllMaterials(
      module_id as string,
      Number(page),
      Number(limit)
    );

    sendSuccess(
      res,
      "MATERIALS_FETCH_SUCCESS",
      "Materials fetched successfully",
      result
    );
  } catch (error: any) {
    sendError(res, "MATERIALS_FETCH_ERROR", error.message, 500);
  }
};

// Get public materials by module
export const getPublicMaterials = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { module_id, page = 1, limit = 10 } = req.query;

    if (!module_id) {
      sendError(res, API_CODES.VALIDATION_ERROR, "module_id is required", 400);
      return;
    }

    const result = await materialService.getPublicMaterials(
      module_id as string,
      Number(page),
      Number(limit)
    );

    sendSuccess(
      res,
      "MATERIALS_FETCH_SUCCESS",
      "Materials fetched successfully",
      result
    );
  } catch (error: any) {
    sendError(res, "MATERIALS_FETCH_ERROR", error.message, 500);
  }
};

// Get material detail (public)
export const getMaterialDetail = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await materialService.getMaterialDetail(id);

    if (!result) {
      sendError(res, API_CODES.NOT_FOUND, "Material not found", 404);
      return;
    }

    sendSuccess(
      res,
      "MATERIAL_FETCH_SUCCESS",
      "Material detail fetched successfully",
      result
    );
  } catch (error: any) {
    sendError(res, "MATERIAL_FETCH_ERROR", error.message, 500);
  }
};

// Get poin details for a material (protected)
export const getPoinDetails = async (
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

    const result = await materialService.getPoinDetails(id, userId);

    sendSuccess(
      res,
      "POIN_DETAILS_FETCH_SUCCESS",
      "Poin details fetched successfully",
      result
    );
  } catch (error: any) {
    sendError(res, "POIN_DETAILS_FETCH_ERROR", error.message, 500);
  }
};

// Get quiz for a material
export const getMaterialQuiz = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await materialService.getMaterialQuiz(id);

    sendSuccess(
      res,
      "MATERIAL_QUIZ_FETCH_SUCCESS",
      "Material quiz fetched successfully",
      result
    );
  } catch (error: any) {
    sendError(res, "MATERIAL_QUIZ_FETCH_ERROR", error.message, 500);
  }
};

// Admin: Create new material
export const createMaterial = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      sendError(res, API_CODES.UNAUTHORIZED, "Authentication required", 401);
      return;
    }

    const result = await materialService.createMaterial(req.body, userId);

    sendSuccess(
      res,
      "MATERIAL_CREATE_SUCCESS",
      "Material created successfully",
      result,
      201
    );
  } catch (error: any) {
    sendError(res, "MATERIAL_CREATE_ERROR", error.message, 400);
  }
};

// Admin: Update material
export const updateMaterial = async (
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

    const result = await materialService.updateMaterial(id, req.body, userId);

    if (!result) {
      sendError(res, API_CODES.NOT_FOUND, "Material not found", 404);
      return;
    }

    sendSuccess(
      res,
      "MATERIAL_UPDATE_SUCCESS",
      "Material updated successfully",
      result
    );
  } catch (error: any) {
    sendError(res, "MATERIAL_UPDATE_ERROR", error.message, 400);
  }
};

// Admin: Delete material
export const deleteMaterial = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await materialService.deleteMaterial(id);

    if (!result) {
      sendError(res, API_CODES.NOT_FOUND, "Material not found", 404);
      return;
    }

    sendSuccess(
      res,
      "MATERIAL_DELETE_SUCCESS",
      "Material deleted successfully",
      { id }
    );
  } catch (error: any) {
    sendError(res, "MATERIAL_DELETE_ERROR", error.message, 400);
  }
};

// Admin: Create poin detail
export const createPoinDetail = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const result = await materialService.createPoinDetail(req.body);

    sendSuccess(
      res,
      "POIN_CREATE_SUCCESS",
      "Poin detail created successfully",
      result,
      201
    );
  } catch (error: any) {
    sendError(res, "POIN_CREATE_ERROR", error.message, 400);
  }
};

// Admin: Update poin detail
export const updatePoinDetail = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await materialService.updatePoinDetail(id, req.body);

    if (!result) {
      sendError(res, API_CODES.NOT_FOUND, "Poin detail not found", 404);
      return;
    }

    sendSuccess(
      res,
      "POIN_UPDATE_SUCCESS",
      "Poin detail updated successfully",
      result
    );
  } catch (error: any) {
    sendError(res, "POIN_UPDATE_ERROR", error.message, 400);
  }
};

// Admin: Delete poin detail
export const deletePoinDetail = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await materialService.deletePoinDetail(id);

    if (!result) {
      sendError(res, API_CODES.NOT_FOUND, "Poin detail not found", 404);
      return;
    }

    sendSuccess(
      res,
      "POIN_DELETE_SUCCESS",
      "Poin detail deleted successfully",
      { id }
    );
  } catch (error: any) {
    sendError(res, "POIN_DELETE_ERROR", error.message, 400);
  }
};
