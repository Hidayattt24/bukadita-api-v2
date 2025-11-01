import { Response } from "express";
import { AuthRequest } from "../middlewares/auth.middleware";
import { sendSuccess, sendError, API_CODES } from "../utils/response.util";
import * as quizAdminService from "../services/quiz.admin.service";

// Create quiz
export const createQuiz = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      sendError(res, API_CODES.UNAUTHORIZED, "Authentication required", 401);
      return;
    }

    const result = await quizAdminService.createQuiz(req.body, userId);

    sendSuccess(
      res,
      "QUIZ_CREATE_SUCCESS",
      "Quiz created successfully",
      result,
      201
    );
  } catch (error: any) {
    sendError(res, "QUIZ_CREATE_ERROR", error.message, 400);
  }
};

// Update quiz
export const updateQuiz = async (
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

    const result = await quizAdminService.updateQuiz(id, req.body, userId);

    if (!result) {
      sendError(res, API_CODES.NOT_FOUND, "Quiz not found", 404);
      return;
    }

    sendSuccess(
      res,
      "QUIZ_UPDATE_SUCCESS",
      "Quiz updated successfully",
      result
    );
  } catch (error: any) {
    sendError(res, "QUIZ_UPDATE_ERROR", error.message, 400);
  }
};

// Delete quiz
export const deleteQuiz = async (
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

    const result = await quizAdminService.deleteQuiz(id, userId);

    if (!result) {
      sendError(res, API_CODES.NOT_FOUND, "Quiz not found", 404);
      return;
    }

    sendSuccess(res, "QUIZ_DELETE_SUCCESS", "Quiz deleted successfully", {
      id,
    });
  } catch (error: any) {
    sendError(res, "QUIZ_DELETE_ERROR", error.message, 400);
  }
};

// Add question to quiz
export const addQuestion = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { quizId } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      sendError(res, API_CODES.UNAUTHORIZED, "Authentication required", 401);
      return;
    }

    const result = await quizAdminService.addQuestion(quizId, req.body, userId);

    sendSuccess(
      res,
      "QUESTION_CREATE_SUCCESS",
      "Question added successfully",
      result,
      201
    );
  } catch (error: any) {
    sendError(res, "QUESTION_CREATE_ERROR", error.message, 400);
  }
};

// Update question
export const updateQuestion = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { questionId } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      sendError(res, API_CODES.UNAUTHORIZED, "Authentication required", 401);
      return;
    }

    const result = await quizAdminService.updateQuestion(
      questionId,
      req.body,
      userId
    );

    if (!result) {
      sendError(res, API_CODES.NOT_FOUND, "Question not found", 404);
      return;
    }

    sendSuccess(
      res,
      "QUESTION_UPDATE_SUCCESS",
      "Question updated successfully",
      result
    );
  } catch (error: any) {
    sendError(res, "QUESTION_UPDATE_ERROR", error.message, 400);
  }
};

// Delete question
export const deleteQuestion = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { questionId } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      sendError(res, API_CODES.UNAUTHORIZED, "Authentication required", 401);
      return;
    }

    const result = await quizAdminService.deleteQuestion(questionId, userId);

    if (!result) {
      sendError(res, API_CODES.NOT_FOUND, "Question not found", 404);
      return;
    }

    sendSuccess(
      res,
      "QUESTION_DELETE_SUCCESS",
      "Question deleted successfully",
      { id: questionId }
    );
  } catch (error: any) {
    sendError(res, "QUESTION_DELETE_ERROR", error.message, 400);
  }
};

// Get all quizzes for admin
export const getAllQuizzes = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { module_id, page = 1, limit = 10 } = req.query;

    const result = await quizAdminService.getAllQuizzes({
      moduleId: module_id as string | undefined,
      page: Number(page),
      limit: Number(limit),
    });

    sendSuccess(
      res,
      "QUIZZES_FETCH_SUCCESS",
      "Quizzes fetched successfully",
      result
    );
  } catch (error: any) {
    sendError(res, "QUIZZES_FETCH_ERROR", error.message, 500);
  }
};

// Get quiz with questions for admin
export const getQuizWithQuestions = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    const result = await quizAdminService.getQuizWithQuestions(id);

    if (!result) {
      sendError(res, API_CODES.NOT_FOUND, "Quiz not found", 404);
      return;
    }

    sendSuccess(res, "QUIZ_FETCH_SUCCESS", "Quiz fetched successfully", result);
  } catch (error: any) {
    sendError(res, "QUIZ_FETCH_ERROR", error.message, 500);
  }
};

// Bulk update question order
export const updateQuestionOrder = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { quizId } = req.params;
    const { questions } = req.body; // Array of { id, order_index }

    if (!questions || !Array.isArray(questions)) {
      sendError(
        res,
        API_CODES.VALIDATION_ERROR,
        "questions array is required",
        400
      );
      return;
    }

    const result = await quizAdminService.updateQuestionOrder(
      quizId,
      questions
    );

    sendSuccess(
      res,
      "QUESTION_ORDER_UPDATE_SUCCESS",
      "Question order updated successfully",
      result
    );
  } catch (error: any) {
    sendError(res, "QUESTION_ORDER_UPDATE_ERROR", error.message, 400);
  }
};
