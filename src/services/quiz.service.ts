import prisma from "../config/database";
import * as progressService from "./progress.service";

export const getQuizzesByModule = async (
  moduleId: string,
  includeUnpublished: boolean = false // ✅ NEW: Option for admin
) => {
  const whereClause: any = { module_id: moduleId };

  // Only filter by published if not admin mode
  if (!includeUnpublished) {
    whereClause.published = true;
  }

  const quizzes = await prisma.materisQuiz.findMany({
    where: whereClause,
    include: {
      subMateri: {
        select: {
          id: true,
          title: true,
        },
      },
      _count: {
        select: {
          questions: true,
        },
      },
    },
    orderBy: { created_at: "desc" },
  });

  return quizzes;
};

export const getQuizById = async (
  quizId: string,
  includeAnswers: boolean = false
) => {
  const quiz = await prisma.materisQuiz.findUnique({
    where: { id: quizId },
    include: {
      module: {
        select: {
          id: true,
          title: true,
          slug: true,
        },
      },
      subMateri: {
        select: {
          id: true,
          title: true,
        },
      },
      questions: {
        orderBy: { order_index: "asc" },
        select: {
          id: true,
          question_text: true,
          options: true,
          correct_answer_index: includeAnswers,
          explanation: includeAnswers,
          order_index: true,
        },
      },
    },
  });

  if (!quiz) {
    throw new Error("Quiz not found");
  }

  return quiz;
};

export const startQuiz = async (userId: string, quizId: string) => {
  // Check if quiz exists
  const quiz = await prisma.materisQuiz.findUnique({
    where: { id: quizId },
    include: {
      questions: true,
    },
  });

  if (!quiz) {
    throw new Error("Quiz not found");
  }

  if (!quiz.published) {
    throw new Error("Quiz is not published");
  }

  // ✅ FIX: Check if there's already an ongoing attempt (started but not completed)
  const existingOngoingAttempt = await prisma.quizAttempt.findFirst({
    where: {
      quiz_id: quizId,
      user_id: userId,
      completed_at: null, // Not completed yet (if completed_at is null, it means started but not finished)
    },
    orderBy: { started_at: "desc" },
  });

  // If there's an ongoing attempt, return it instead of creating a new one
  if (existingOngoingAttempt) {
    console.log(
      `[startQuiz] ✅ Found existing ongoing attempt ${existingOngoingAttempt.id}, returning it instead of creating new one`
    );
    return {
      attempt_id: existingOngoingAttempt.id,
      quiz_id: quizId,
      total_questions: quiz.questions.length,
      time_limit_seconds: quiz.time_limit_seconds,
      started_at: existingOngoingAttempt.started_at,
      is_existing: true, // Flag to indicate this is an existing attempt
    };
  }

  // Create new quiz attempt only if no ongoing attempt exists
  console.log(
    `[startQuiz] 🆕 Creating new quiz attempt for user ${userId}, quiz ${quizId}`
  );
  const attempt = await prisma.quizAttempt.create({
    data: {
      quiz_id: quizId,
      user_id: userId,
      total_questions: quiz.questions.length,
      started_at: new Date(),
    },
  });

  return {
    attempt_id: attempt.id,
    quiz_id: quizId,
    total_questions: quiz.questions.length,
    time_limit_seconds: quiz.time_limit_seconds,
    started_at: attempt.started_at,
    is_existing: false,
  };
};

export const submitQuiz = async (
  userId: string,
  data: {
    quiz_id: string;
    answers: Array<{
      question_id: string;
      selected_option_index: number;
    }>;
  }
) => {
  // Get quiz with questions
  const quiz = await prisma.materisQuiz.findUnique({
    where: { id: data.quiz_id },
    include: {
      questions: true,
    },
  });

  if (!quiz) {
    throw new Error("Quiz not found");
  }

  // Calculate score
  let correct_answers = 0;
  const detailedAnswers = data.answers.map((answer) => {
    const question = quiz.questions.find((q) => q.id === answer.question_id);
    if (!question) return { ...answer, is_correct: false };

    const is_correct =
      question.correct_answer_index === answer.selected_option_index;
    if (is_correct) correct_answers++;

    return {
      question_id: answer.question_id,
      selected_option_index: answer.selected_option_index,
      correct_answer_index: question.correct_answer_index,
      is_correct,
      explanation: question.explanation,
    };
  });

  const score = (correct_answers / quiz.questions.length) * 100;
  const passed = score >= quiz.passing_score;

  // Create quiz attempt
  const attempt = await prisma.quizAttempt.create({
    data: {
      quiz_id: data.quiz_id,
      user_id: userId,
      score,
      total_questions: quiz.questions.length,
      correct_answers,
      passed,
      answers: detailedAnswers,
      completed_at: new Date(),
    },
  });

  // 🔥 NEW: If quiz passed and has sub_materi_id, mark all poins and sub-materi as completed
  console.log("[submitQuiz] 🔍 Checking if should save progress:", {
    passed,
    sub_materi_id: quiz.sub_materi_id,
    quiz_id: quiz.id,
    user_id: userId,
  });

  if (passed && quiz.sub_materi_id) {
    console.log(
      `[submitQuiz] ✅ Quiz passed! Saving progress for sub-materi: ${quiz.sub_materi_id}`
    );

    try {
      // Get all poins for this sub-materi
      const poins = await prisma.poinDetail.findMany({
        where: { sub_materi_id: quiz.sub_materi_id },
        select: { id: true },
      });

      console.log(
        `[submitQuiz] 📝 Found ${poins.length} poins to mark as completed`
      );

      // Mark all poins as completed
      for (const poin of poins) {
        console.log(`[submitQuiz] Marking poin ${poin.id} as completed...`);
        await prisma.userPoinProgress.upsert({
          where: {
            user_id_poin_id: {
              user_id: userId,
              poin_id: poin.id,
            },
          },
          update: {
            is_completed: true,
            completed_at: new Date(),
          },
          create: {
            user_id: userId,
            poin_id: poin.id,
            is_completed: true,
            completed_at: new Date(),
          },
        });
      }

      console.log(
        `[submitQuiz] ✅ All ${poins.length} poins marked as completed`
      );

      // Mark sub-materi as completed
      console.log(
        `[submitQuiz] Marking sub-materi ${quiz.sub_materi_id} as completed...`
      );
      await prisma.userSubMateriProgress.upsert({
        where: {
          user_id_sub_materi_id: {
            user_id: userId,
            sub_materi_id: quiz.sub_materi_id,
          },
        },
        update: {
          is_completed: true,
          progress_percent: 100,
          completed_at: new Date(),
          updated_at: new Date(),
        },
        create: {
          user_id: userId,
          sub_materi_id: quiz.sub_materi_id,
          is_unlocked: true,
          is_completed: true,
          progress_percent: 100,
          completed_at: new Date(),
        },
      });

      console.log(`[submitQuiz] ✅ Sub-materi marked as completed`);

      // Update module progress
      const subMateri = await prisma.subMateri.findUnique({
        where: { id: quiz.sub_materi_id },
        select: { module_id: true },
      });

      if (subMateri) {
        console.log(
          `[submitQuiz] Updating module progress for module: ${subMateri.module_id}`
        );
        await progressService.updateModuleProgress(userId, subMateri.module_id);
        await progressService.unlockNextSubMateri(
          userId,
          subMateri.module_id,
          quiz.sub_materi_id
        );
        console.log(`[submitQuiz] ✅ Module progress updated`);
      }

      console.log(
        `[submitQuiz] ✅ ALL PROGRESS SAVED - ${poins.length} poins and sub-materi ${quiz.sub_materi_id} marked as completed`
      );
    } catch (error) {
      console.error(
        "[submitQuiz] ❌ ERROR marking poins/sub-materi as completed:",
        error
      );
      console.error("[submitQuiz] Error details:", {
        name: (error as Error).name,
        message: (error as Error).message,
        stack: (error as Error).stack,
      });
      // Don't throw error - quiz submission should still succeed
    }
  } else {
    console.log("[submitQuiz] ⚠️ NOT saving progress because:", {
      passed,
      has_sub_materi_id: !!quiz.sub_materi_id,
      sub_materi_id: quiz.sub_materi_id,
    });
  }

  return {
    attempt_id: attempt.id,
    score: parseFloat(score.toFixed(2)),
    total_questions: quiz.questions.length,
    correct_answers,
    passed,
    passing_score: quiz.passing_score,
    answers: detailedAnswers,
  };
};

export const getQuizAttempts = async (userId: string, quizId?: string) => {
  const where: any = { user_id: userId };
  if (quizId) where.quiz_id = quizId;

  const attempts = await prisma.quizAttempt.findMany({
    where,
    include: {
      quiz: {
        select: {
          id: true,
          title: true,
          module: {
            select: {
              title: true,
              slug: true,
            },
          },
        },
      },
    },
    orderBy: { created_at: "desc" },
  });

  return attempts;
};

// 🔥 NEW: Get quiz attempts by module (for quiz history)
export const getQuizAttemptsByModule = async (userId: string, moduleId: string) => {
  const attempts = await prisma.quizAttempt.findMany({
    where: {
      user_id: userId,
      quiz: {
        module_id: moduleId,
      },
    },
    include: {
      quiz: {
        select: {
          id: true,
          title: true,
          sub_materi_id: true,
          module_id: true,
          passing_score: true,
        },
      },
    },
    orderBy: { completed_at: "desc" },
  });

  return {
    attempts,
    total: attempts.length,
  };
};

export const createQuiz = async (data: {
  module_id: string;
  sub_materi_id?: string;
  title?: string;
  description?: string;
  time_limit_seconds?: number;
  passing_score?: number;
  published?: boolean;
  created_by: string;
}) => {
  // Validate module exists
  const module = await prisma.module.findUnique({
    where: { id: data.module_id },
  });

  if (!module) {
    throw new Error("Module not found");
  }

  // If sub_materi_id provided, validate it
  if (data.sub_materi_id) {
    const subMateri = await prisma.subMateri.findUnique({
      where: { id: data.sub_materi_id },
    });

    if (!subMateri) {
      throw new Error("Sub-materi not found");
    }

    if (subMateri.module_id !== data.module_id) {
      throw new Error("Sub-materi does not belong to the specified module");
    }
  }

  const quizData: any = {
    module_id: data.module_id,
    title: data.title || `Quiz ${module.title}`,
    description: data.description,
    time_limit_seconds: data.time_limit_seconds || 600,
    passing_score: data.passing_score || 70,
    quiz_type: data.sub_materi_id ? "sub_materi" : "module",
    published: data.published || false,
    created_by: data.created_by,
  };

  // Only add sub_materi_id if provided
  if (data.sub_materi_id) {
    quizData.sub_materi_id = data.sub_materi_id;
  }

  const quiz = await prisma.materisQuiz.create({
    data: quizData,
  });

  return quiz;
};

export const addQuizQuestion = async (
  quizId: string,
  data: {
    question_text: string;
    options: any;
    correct_answer_index: number;
    explanation?: string;
    order_index: number;
  }
) => {
  const question = await prisma.quizQuestion.create({
    data: {
      quiz_id: quizId,
      ...data,
    },
  });

  return question;
};
