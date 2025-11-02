import { Response } from "express";
import { AuthRequest } from "../middlewares/auth.middleware";
import { sendSuccess, sendError, API_CODES } from "../utils/response.util";
import * as quizService from "../services/quiz.service";

export const getQuizzesByModule = async (req: AuthRequest, res: Response) => {
  try {
    const { moduleId } = req.params;
    const result = await quizService.getQuizzesByModule(moduleId);
    sendSuccess(
      res,
      API_CODES.QUIZ_FETCH_SUCCESS,
      "Quizzes retrieved successfully",
      result
    );
  } catch (error: any) {
    sendError(res, "QUIZ_FETCH_ERROR", error.message, 400);
  }
};

export const getQuizById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const includeAnswers = req.query.includeAnswers === "true";
    const result = await quizService.getQuizById(id, includeAnswers);
    sendSuccess(
      res,
      API_CODES.QUIZ_FETCH_SUCCESS,
      "Quiz retrieved successfully",
      result
    );
  } catch (error: any) {
    sendError(res, "QUIZ_NOT_FOUND", error.message, 404);
  }
};

export const startQuiz = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { quiz_id, quizId } = req.body;
    const finalQuizId = quiz_id || quizId;

    if (!finalQuizId) {
      return sendError(res, "QUIZ_START_ERROR", "quiz_id is required", 400);
    }

    const result = await quizService.startQuiz(userId, finalQuizId);
    sendSuccess(
      res,
      API_CODES.QUIZ_START_SUCCESS,
      "Quiz started successfully",
      result
    );
  } catch (error: any) {
    sendError(res, "QUIZ_START_ERROR", error.message, 400);
  }
};

export const submitQuiz = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const result = await quizService.submitQuiz(userId, req.body);
    sendSuccess(
      res,
      API_CODES.QUIZ_SUBMIT_SUCCESS,
      "Quiz submitted successfully",
      result
    );
  } catch (error: any) {
    sendError(res, "QUIZ_SUBMIT_ERROR", error.message, 400);
  }
};

export const getQuizAttempts = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const quizId = req.query.quizId as string | undefined;
    const result = await quizService.getQuizAttempts(userId, quizId);
    sendSuccess(
      res,
      API_CODES.QUIZ_FETCH_SUCCESS,
      "Quiz attempts retrieved successfully",
      result
    );
  } catch (error: any) {
    sendError(res, "QUIZ_ATTEMPTS_FETCH_ERROR", error.message, 400);
  }
};

// 🔥 NEW: Get quiz attempts by module (for quiz history)
export const getMyQuizAttempts = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const moduleId = req.query.module_id as string | undefined;
    
    if (!moduleId) {
      return sendError(res, "MODULE_ID_REQUIRED", "module_id query parameter is required", 400);
    }

    const result = await quizService.getQuizAttemptsByModule(userId, moduleId);
    sendSuccess(
      res,
      API_CODES.QUIZ_FETCH_SUCCESS,
      "Quiz attempts retrieved successfully",
      result
    );
  } catch (error: any) {
    sendError(res, "QUIZ_ATTEMPTS_FETCH_ERROR", error.message, 400);
  }
};

export const createQuiz = async (req: AuthRequest, res: Response) => {
  try {
    const created_by = req.user!.userId;
    const result = await quizService.createQuiz({ ...req.body, created_by });
    sendSuccess(
      res,
      API_CODES.QUIZ_FETCH_SUCCESS,
      "Quiz created successfully",
      result,
      201
    );
  } catch (error: any) {
    sendError(res, "QUIZ_CREATE_ERROR", error.message, 400);
  }
};

export const addQuizQuestion = async (req: AuthRequest, res: Response) => {
  try {
    const { quizId } = req.params;
    const result = await quizService.addQuizQuestion(quizId, req.body);
    sendSuccess(
      res,
      API_CODES.QUIZ_FETCH_SUCCESS,
      "Question added successfully",
      result,
      201
    );
  } catch (error: any) {
    sendError(res, "QUESTION_ADD_ERROR", error.message, 400);
  }
};
