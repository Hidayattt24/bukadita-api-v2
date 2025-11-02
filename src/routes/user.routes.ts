import { Router } from "express";
import { UserController } from "../controllers/user.controller";
import { requireAuth } from "../middlewares/auth.middleware";
import { uploadSingle } from "../middlewares/upload.middleware";

const router = Router();

// All routes require authentication
router.use(requireAuth);

// Get current user profile
router.get("/me", UserController.getProfile);

// Update current user profile
router.put("/me", UserController.updateProfile);

// Upload profile photo
router.post(
  "/me/profile-photo",
  uploadSingle("photo"),
  UserController.uploadProfilePhoto
);

// Delete profile photo
router.delete("/me/profile-photo", UserController.deleteProfilePhoto);

// Change password
router.post("/me/change-password", UserController.changePassword);

export default router;
