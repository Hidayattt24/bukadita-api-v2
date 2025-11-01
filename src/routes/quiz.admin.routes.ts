import { Router } from "express";
import * as quizAdminController from "../controllers/quiz.admin.controller";
import { validate } from "../middlewares/validation.middleware";
import {
  createQuizAdminSchema,
  updateQuizAdminSchema,
  createQuestionSchema,
  updateQuestionSchema,
} from "../utils/validation.util";
import { requireAuth } from "../middlewares/auth.middleware";
import { requireAdmin } from "../middlewares/role.middleware";

const router = Router();

// All admin quiz routes require authentication and admin role
router.use(requireAuth);
router.use(requireAdmin);

// Quiz CRUD
router.get("/", quizAdminController.getAllQuizzes);
router.get("/:id", quizAdminController.getQuizWithQuestions);
router.post(
  "/",
  validate(createQuizAdminSchema),
  quizAdminController.createQuiz
);
router.put(
  "/:id",
  validate(updateQuizAdminSchema),
  quizAdminController.updateQuiz
);
router.delete("/:id", quizAdminController.deleteQuiz);

// Question management
router.post(
  "/:quizId/questions",
  validate(createQuestionSchema),
  quizAdminController.addQuestion
);
router.put(
  "/questions/:questionId",
  validate(updateQuestionSchema),
  quizAdminController.updateQuestion
);
router.delete("/questions/:questionId", quizAdminController.deleteQuestion);

// Bulk operations
router.put("/:quizId/questions/order", quizAdminController.updateQuestionOrder);

export default router;
