import { Router } from "express";
import * as progressController from "../controllers/progress.controller";
import { requireAuth } from "../middlewares/auth.middleware";

const router = Router();

// All progress routes require authentication
router.use(requireAuth);

// Module progress
router.get("/modules", progressController.getUserModulesProgress);
router.get("/modules/:id", progressController.getModuleProgress);

// Sub-materi progress
router.get("/sub-materis/:id", progressController.getSubMateriProgress);
router.post("/sub-materis/:id/complete", progressController.completeSubMateri);

// Material access check
router.get("/materials/:id/access", progressController.checkMaterialAccess);

// Poin progress
router.post("/poins/:id/complete", progressController.completePoin);

// Quiz progress
router.get("/quiz/:id", progressController.getQuizProgress);

// User statistics
router.get("/stats", progressController.getUserStats);

export default router;
