import prisma from "../config/database";

export const getQuizzesByModule = async (moduleId: string) => {
  const quizzes = await prisma.materisQuiz.findMany({
    where: { module_id: moduleId, published: true },
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

  // Create quiz attempt
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

export const createQuiz = async (data: {
  module_id: string;
  sub_materi_id: string;
  title?: string;
  description?: string;
  time_limit_seconds?: number;
  passing_score?: number;
  published?: boolean;
  created_by: string;
}) => {
  const quiz = await prisma.materisQuiz.create({
    data: {
      ...data,
      published: data.published || false,
    },
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
