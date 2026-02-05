import { Router } from "express";
import * as adminController from "../controllers/admin.controller";
import { requireAuth } from "../middlewares/auth.middleware";
import { requireAdmin, requireSuperAdmin } from "../middlewares/role.middleware";

const router = Router();

// All admin routes require authentication and admin role
router.use(requireAuth);
router.use(requireAdmin);

// Progress monitoring
router.get("/progress", adminController.getAllUsersProgress);
router.get("/users/:userId/progress", adminController.getUserProgress);

// Quiz attempts monitoring
router.get("/quiz-attempts", adminController.getQuizAttempts);
router.get("/quiz-attempts/:attemptId", adminController.getQuizAttemptDetail);

// Statistics
router.get("/progress/stats", adminController.getProgressStats);
router.get("/quiz-performance-detailed", adminController.getQuizPerformanceDetailed);
router.get("/recent-activities-classified", adminController.getRecentActivitiesClassified);

// User management
router.get("/users", adminController.getAllUsers);
router.patch("/users/:userId/role", requireSuperAdmin, adminController.updateUserRole);

// Activity logs
router.get("/activity-logs", adminController.getActivityLogs);

// Progress management
router.post("/users/:userId/reset-progress", adminController.resetUserProgress);

// User management - CRUD
router.post("/users", requireSuperAdmin, adminController.createUser);
router.put("/users/:userId", requireAdmin, adminController.updateUser);
router.delete("/users/:userId", requireSuperAdmin, adminController.deleteUser);

export default router;
