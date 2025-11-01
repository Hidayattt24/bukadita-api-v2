import { Router } from "express";
import * as materialController from "../controllers/material.controller";
import { validate } from "../middlewares/validation.middleware";
import { 
  createMaterialSchema, 
  updateMaterialSchema,
  createPoinDetailSchema 
} from "../utils/validation.util";
import { requireAuth } from "../middlewares/auth.middleware";
import { requireAdmin } from "../middlewares/role.middleware";

const router = Router();

// Public routes
router.get("/public", materialController.getPublicMaterials);
router.get("/:id/public", materialController.getMaterialDetail);
router.get("/:id/quiz", materialController.getMaterialQuiz);

// Protected routes (authenticated users)
router.get("/:id/points", requireAuth, materialController.getPoinDetails);

// Admin routes - Material management
router.post(
  "/",
  requireAuth,
  requireAdmin,
  validate(createMaterialSchema),
  materialController.createMaterial
);

router.put(
  "/:id",
  requireAuth,
  requireAdmin,
  validate(updateMaterialSchema),
  materialController.updateMaterial
);

router.delete(
  "/:id",
  requireAuth,
  requireAdmin,
  materialController.deleteMaterial
);

// Admin routes - Poin detail management
router.post(
  "/points",
  requireAuth,
  requireAdmin,
  validate(createPoinDetailSchema),
  materialController.createPoinDetail
);

router.put(
  "/points/:id",
  requireAuth,
  requireAdmin,
  materialController.updatePoinDetail
);

router.delete(
  "/points/:id",
  requireAuth,
  requireAdmin,
  materialController.deletePoinDetail
);

export default router;
