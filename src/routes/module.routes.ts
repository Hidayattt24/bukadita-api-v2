import { Router } from "express";
import * as moduleController from "../controllers/module.controller";
import { validate } from "../middlewares/validation.middleware";
import { createModuleSchema } from "../utils/validation.util";
import { requireAuth } from "../middlewares/auth.middleware";
import { requireAdmin } from "../middlewares/role.middleware";

const router = Router();

// Public routes
router.get("/", moduleController.getAllModules);
router.get("/:slug", moduleController.getModuleBySlug);

// Admin routes
router.post(
  "/",
  requireAuth,
  requireAdmin,
  validate(createModuleSchema),
  moduleController.createModule
);
router.put("/:id", requireAuth, requireAdmin, moduleController.updateModule);
router.delete("/:id", requireAuth, requireAdmin, moduleController.deleteModule);

export default router;
