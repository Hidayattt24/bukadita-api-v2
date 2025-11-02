import { Router } from "express";
import * as quizController from "../controllers/quiz.controller";
import { validate } from "../middlewares/validation.middleware";
import { createQuizSchema, submitQuizSchema } from "../utils/validation.util";
import { requireAuth } from "../middlewares/auth.middleware";
import { requireAdmin } from "../middlewares/role.middleware";

const router = Router();

// Public/User routes
router.get("/module/:moduleId", quizController.getQuizzesByModule);
router.get("/:id", quizController.getQuizById);

// Authenticated user routes
router.post("/start", requireAuth, quizController.startQuiz);
router.post(
  "/submit",
  requireAuth,
  validate(submitQuizSchema),
  quizController.submitQuiz
);
router.get("/attempts/me", requireAuth, quizController.getQuizAttempts);
// 🔥 NEW: Get quiz attempts by module (for quiz history)
router.get("/attempts/my", requireAuth, quizController.getMyQuizAttempts);

// Admin routes
router.post(
  "/",
  requireAuth,
  requireAdmin,
  validate(createQuizSchema),
  quizController.createQuiz
);
router.post(
  "/:quizId/questions",
  requireAuth,
  requireAdmin,
  quizController.addQuizQuestion
);

export default router;
