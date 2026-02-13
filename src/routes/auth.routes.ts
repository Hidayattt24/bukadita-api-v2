import { Router } from "express";
import * as authController from "../controllers/auth.controller";
import * as passwordResetController from "../controllers/password-reset.controller";
import { validate } from "../middlewares/validation.middleware";
import { registerSchema, loginSchema } from "../utils/validation.util";
import { requireAuth } from "../middlewares/auth.middleware";

const router = Router();

router.post("/register", validate(registerSchema), authController.register);
router.post("/login", validate(loginSchema), authController.login);
router.post("/admin-login", validate(loginSchema), authController.adminLogin);
router.post("/refresh", authController.refresh);
router.post("/logout", requireAuth, authController.logout);
router.post("/profile", requireAuth, authController.upsertProfile);
router.post(
  "/create-missing-profile",
  requireAuth,
  authController.createMissingProfile
);

// Password reset routes
router.post("/request-password-reset", passwordResetController.requestPasswordReset);
router.post("/verify-otp-reset-password", passwordResetController.verifyOTPAndResetPassword);
router.post("/resend-otp", passwordResetController.resendOTP);

export default router;
