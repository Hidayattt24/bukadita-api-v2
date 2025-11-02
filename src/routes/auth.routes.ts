import { Router } from "express";
import * as authController from "../controllers/auth.controller";
import { validate } from "../middlewares/validation.middleware";
import { registerSchema, loginSchema } from "../utils/validation.util";
import { requireAuth } from "../middlewares/auth.middleware";

const router = Router();

router.post(
  "/register",
  validate(registerSchema),
  authController.register
);
router.post("/login", validate(loginSchema), authController.login);
router.post("/refresh", authController.refresh);
router.post("/logout", requireAuth, authController.logout);
router.post("/profile", requireAuth, authController.upsertProfile);
router.post(
  "/create-missing-profile",
  requireAuth,
  authController.createMissingProfile
);

export default router;
