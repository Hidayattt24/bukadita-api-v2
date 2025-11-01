import prisma from "../config/database";
import logger from "../config/logger";

// Create quiz
export const createQuiz = async (
  data: {
    module_id: string;
    sub_materi_id?: string;
    title?: string;
    description?: string;
    time_limit_seconds?: number;
    passing_score?: number;
    quiz_type?: string;
    published?: boolean;
  },
  userId: string
) => {
  try {
    const quiz = await prisma.materisQuiz.create({
      // build data object conditionally because sub_materi_id may be optional
      data: ((): any => {
        const d: any = {
          module_id: data.module_id,
          title: data.title,
          description: data.description,
          time_limit_seconds: data.time_limit_seconds || 600,
          passing_score: data.passing_score || 70,
          quiz_type: data.quiz_type || "module",
          published: data.published || false,
        };
        if (data.sub_materi_id) d.sub_materi_id = data.sub_materi_id;
        return d;
      })(),
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        user_id: userId,
        action: "create_quiz",
        resource_type: "quiz",
        resource_id: quiz.id,
        details: {
          title: quiz.title,
          module_id: quiz.module_id,
        },
      },
    });

    return quiz;
  } catch (error) {
    logger.error("Error creating quiz:", error);
    throw new Error("Failed to create quiz");
  }
};

// Update quiz
export const updateQuiz = async (
  quizId: string,
  data: {
    title?: string;
    description?: string;
    time_limit_seconds?: number;
    passing_score?: number;
    quiz_type?: string;
    published?: boolean;
  },
  userId: string
) => {
  try {
    const quiz = await prisma.materisQuiz.update({
      where: { id: quizId },
      data: {
        ...data,
      },
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        user_id: userId,
        action: "update_quiz",
        resource_type: "quiz",
        resource_id: quiz.id,
        details: {
          changes: data,
        },
      },
    });

    return quiz;
  } catch (error) {
    logger.error("Error updating quiz:", error);
    throw new Error("Failed to update quiz");
  }
};

// Delete quiz
export const deleteQuiz = async (quizId: string, userId: string) => {
  try {
    // Delete all related data first
    await prisma.quizQuestion.deleteMany({
      where: { quiz_id: quizId },
    });

    await prisma.quizAttempt.deleteMany({
      where: { quiz_id: quizId },
    });

    // Delete quiz
    const quiz = await prisma.materisQuiz.delete({
      where: { id: quizId },
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        user_id: userId,
        action: "delete_quiz",
        resource_type: "quiz",
        resource_id: quiz.id,
        details: {
          title: quiz.title,
        },
      },
    });

    return quiz;
  } catch (error) {
    logger.error("Error deleting quiz:", error);
    throw new Error("Failed to delete quiz");
  }
};

// Add question to quiz
export const addQuestion = async (
  quizId: string,
  data: {
    question_text: string;
    options: string[];
    correct_answer_index: number;
    explanation?: string;
    order_index?: number;
  },
  userId: string
) => {
  try {
    // Get current max order_index
    const lastQuestion = await prisma.quizQuestion.findFirst({
      where: { quiz_id: quizId },
      orderBy: { order_index: "desc" },
      select: { order_index: true },
    });

    const orderIndex =
      data.order_index !== undefined
        ? data.order_index
        : (lastQuestion?.order_index || 0) + 1;

    const question = await prisma.quizQuestion.create({
      data: {
        quiz_id: quizId,
        question_text: data.question_text,
        options: data.options,
        correct_answer_index: data.correct_answer_index,
        explanation: data.explanation,
        order_index: orderIndex,
      },
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        user_id: userId,
        action: "add_question",
        resource_type: "quiz_question",
        resource_id: question.id,
        details: {
          quiz_id: quizId,
          question_text: question.question_text,
        },
      },
    });

    return question;
  } catch (error) {
    logger.error("Error adding question:", error);
    throw new Error("Failed to add question");
  }
};

// Update question
export const updateQuestion = async (
  questionId: string,
  data: {
    question_text?: string;
    options?: string[];
    correct_answer_index?: number;
    explanation?: string;
    order_index?: number;
  },
  userId: string
) => {
  try {
    const question = await prisma.quizQuestion.update({
      where: { id: questionId },
      data: {
        ...data,
      },
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        user_id: userId,
        action: "update_question",
        resource_type: "quiz_question",
        resource_id: question.id,
        details: {
          changes: data,
        },
      },
    });

    return question;
  } catch (error) {
    logger.error("Error updating question:", error);
    throw new Error("Failed to update question");
  }
};

// Delete question
export const deleteQuestion = async (questionId: string, userId: string) => {
  try {
    const question = await prisma.quizQuestion.delete({
      where: { id: questionId },
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        user_id: userId,
        action: "delete_question",
        resource_type: "quiz_question",
        resource_id: question.id,
        details: {
          quiz_id: question.quiz_id,
          question_text: question.question_text,
        },
      },
    });

    return question;
  } catch (error) {
    logger.error("Error deleting question:", error);
    throw new Error("Failed to delete question");
  }
};

// Get all quizzes for admin
export const getAllQuizzes = async (params: {
  moduleId?: string;
  page: number;
  limit: number;
}) => {
  try {
    const { moduleId, page, limit } = params;
    const skip = (page - 1) * limit;

    const whereConditions: any = {};
    if (moduleId) whereConditions.module_id = moduleId;

    const [quizzes, total] = await Promise.all([
      prisma.materisQuiz.findMany({
        where: whereConditions,
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
          _count: {
            select: {
              questions: true,
              attempts: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: {
          created_at: "desc",
        },
      }),
      prisma.materisQuiz.count({ where: whereConditions }),
    ]);

    return {
      items: quizzes.map((quiz) => ({
        id: quiz.id,
        module_id: quiz.module_id,
        module_title: quiz.module.title,
        sub_materi_id: quiz.sub_materi_id,
        sub_materi_title: quiz.subMateri?.title,
        title: quiz.title,
        description: quiz.description,
        quiz_type: quiz.quiz_type,
        time_limit_seconds: quiz.time_limit_seconds,
        passing_score: quiz.passing_score,
        published: quiz.published,
        total_questions: quiz._count.questions,
        total_attempts: quiz._count.attempts,
        created_at: quiz.created_at,
        updated_at: quiz.updated_at,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  } catch (error) {
    logger.error("Error fetching all quizzes:", error);
    throw new Error("Failed to fetch quizzes");
  }
};

// Get quiz with questions for admin
export const getQuizWithQuestions = async (quizId: string) => {
  try {
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
            correct_answer_index: true,
            explanation: true,
            order_index: true,
            created_at: true,
          },
        },
        _count: {
          select: {
            attempts: true,
          },
        },
      },
    });

    if (!quiz) {
      return null;
    }

    return {
      id: quiz.id,
      module_id: quiz.module_id,
      module: quiz.module,
      sub_materi_id: quiz.sub_materi_id,
      sub_materi: quiz.subMateri,
      title: quiz.title,
      description: quiz.description,
      quiz_type: quiz.quiz_type,
      time_limit_seconds: quiz.time_limit_seconds,
      passing_score: quiz.passing_score,
      published: quiz.published,
      questions: quiz.questions,
      total_attempts: quiz._count.attempts,
      created_at: quiz.created_at,
      updated_at: quiz.updated_at,
    };
  } catch (error) {
    logger.error("Error fetching quiz with questions:", error);
    throw new Error("Failed to fetch quiz");
  }
};

// Bulk update question order
export const updateQuestionOrder = async (
  quizId: string,
  questions: Array<{ id: string; order_index: number }>
) => {
  try {
    // Update each question's order_index
    await Promise.all(
      questions.map((q) =>
        prisma.quizQuestion.update({
          where: { id: q.id },
          data: { order_index: q.order_index },
        })
      )
    );

    return {
      success: true,
      message: "Question order updated successfully",
    };
  } catch (error) {
    logger.error("Error updating question order:", error);
    throw new Error("Failed to update question order");
  }
};
