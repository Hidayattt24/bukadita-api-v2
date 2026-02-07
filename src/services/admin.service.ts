import prisma from "../config/database";
import logger from "../config/logger";
import { normalizePhone, validatePhone } from "../utils/phone.util";

// Get all users progress
export const getAllUsersProgress = async (params: {
  moduleId?: string;
  search?: string;
  page: number;
  limit: number;
}) => {
  try {
    const { moduleId, search, page, limit } = params;
    const skip = (page - 1) * limit;

    const whereConditions: any = {};

    if (moduleId) {
      whereConditions.moduleProgress = {
        some: {
          module_id: moduleId,
        },
      };
    }

    if (search) {
      whereConditions.OR = [
        { full_name: { contains: search, mode: "insensitive" } },
        { phone: { contains: search } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.profile.findMany({
        where: whereConditions,
        select: {
          id: true,
          full_name: true,
          phone: true,
          role: true,
          created_at: true,
          moduleProgress: {
            where: moduleId ? { module_id: moduleId } : undefined,
            include: {
              module: {
                select: {
                  id: true,
                  title: true,
                  slug: true,
                },
              },
            },
          },
        },
        skip,
        take: limit,
        orderBy: {
          created_at: "desc",
        },
      }),
      prisma.profile.count({ where: whereConditions }),
    ]);

    return {
      items: users.map((user) => ({
        user_id: user.id,
        user_full_name: user.full_name,
        user_phone: user.phone,
        user_role: user.role,
        module_progress: user.moduleProgress.map((mp) => ({
          module_id: mp.module_id,
          module_title: mp.module.title,
          status: mp.status,
          progress_percent: mp.progress_percent,
          completed: mp.status === "completed",
          last_accessed_at: mp.last_accessed_at,
          completed_at: mp.completed_at,
        })),
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  } catch (error) {
    logger.error("Error fetching all users progress:", error);
    throw new Error("Failed to fetch users progress");
  }
};

// Get specific user progress
export const getUserProgress = async (userId: string, moduleId?: string) => {
  try {
    const user = await prisma.profile.findUnique({
      where: { id: userId },
      select: {
        id: true,
        full_name: true,
        phone: true,
        role: true,
        created_at: true,
      },
    });

    if (!user) {
      throw new Error("User not found");
    }

    const moduleProgress = await prisma.userModuleProgress.findMany({
      where: {
        user_id: userId,
        ...(moduleId && { module_id: moduleId }),
      },
      include: {
        module: {
          select: {
            id: true,
            title: true,
            slug: true,
            lessons: true,
          },
        },
      },
      orderBy: {
        last_accessed_at: "desc",
      },
    });

    const subMateriProgress = await prisma.userSubMateriProgress.findMany({
      where: {
        user_id: userId,
      },
      include: {
        subMateri: {
          select: {
            id: true,
            title: true,
            module_id: true,
          },
        },
      },
    });

    const quizAttempts = await prisma.quizAttempt.findMany({
      where: {
        user_id: userId,
      },
      include: {
        quiz: {
          select: {
            id: true,
            title: true,
            module_id: true,
            passing_score: true,
          },
        },
      },
      orderBy: {
        created_at: "desc",
      },
      take: 20,
    });

    return {
      user,
      module_progress: moduleProgress.map((mp) => ({
        module_id: mp.module_id,
        module_title: mp.module.title,
        status: mp.status,
        progress_percent: mp.progress_percent,
        completed: mp.status === "completed",
        last_accessed_at: mp.last_accessed_at,
        completed_at: mp.completed_at,
      })),
      sub_materi_progress: subMateriProgress.map((smp) => ({
        sub_materi_id: smp.sub_materi_id,
        sub_materi_title: smp.subMateri.title,
        module_id: smp.subMateri.module_id,
        is_completed: smp.is_completed,
        progress_percent: smp.progress_percent,
        completed_at: smp.completed_at,
      })),
      quiz_attempts: quizAttempts.map((qa) => ({
        quiz_id: qa.quiz_id,
        quiz_title: qa.quiz.title,
        score: Number(qa.score),
        passed: qa.passed,
        completed_at: qa.completed_at,
      })),
    };
  } catch (error) {
    logger.error("Error fetching user progress:", error);
    throw new Error("Failed to fetch user progress");
  }
};

// Get quiz attempts
export const getQuizAttempts = async (params: {
  quizId?: string;
  userId?: string;
  moduleId?: string;
  page: number;
  limit: number;
}) => {
  try {
    const { quizId, userId, moduleId, page, limit } = params;
    const skip = (page - 1) * limit;

    const whereConditions: any = {};

    if (quizId) whereConditions.quiz_id = quizId;
    if (userId) whereConditions.user_id = userId;
    if (moduleId) {
      whereConditions.quiz = {
        module_id: moduleId,
      };
    }

    const [attempts, total] = await Promise.all([
      prisma.quizAttempt.findMany({
        where: whereConditions,
        include: {
          quiz: {
            select: {
              id: true,
              title: true,
              module_id: true,
              passing_score: true,
              time_limit_seconds: true,
            },
          },
          user: {
            select: {
              id: true,
              full_name: true,
              phone: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: {
          created_at: "desc",
        },
      }),
      prisma.quizAttempt.count({ where: whereConditions }),
    ]);

    return {
      items: attempts.map((attempt) => ({
        id: attempt.id,
        quiz_id: attempt.quiz_id,
        quiz_title: attempt.quiz.title,
        module_id: attempt.quiz.module_id,
        user_id: attempt.user_id,
        user_full_name: attempt.user.full_name,
        user_phone: attempt.user.phone,
        score: Number(attempt.score),
        total_questions: attempt.total_questions,
        correct_answers: attempt.correct_answers,
        passed: attempt.passed,
        passing_score: attempt.quiz.passing_score,
        started_at: attempt.started_at,
        completed_at: attempt.completed_at,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  } catch (error) {
    logger.error("Error fetching quiz attempts:", error);
    throw new Error("Failed to fetch quiz attempts");
  }
};

// Get quiz attempt detail
export const getQuizAttemptDetail = async (attemptId: string) => {
  try {
    const attempt = await prisma.quizAttempt.findUnique({
      where: { id: attemptId },
      include: {
        quiz: {
          include: {
            questions: {
              orderBy: { order_index: "asc" },
            },
          },
        },
        user: {
          select: {
            id: true,
            full_name: true,
            phone: true,
            role: true,
          },
        },
      },
    });

    if (!attempt) {
      return null;
    }

    // Parse answers from JSONB
    const userAnswers = attempt.answers as any;

    // Map questions with user answers
    const questionsWithAnswers = attempt.quiz.questions.map((q) => {
      const userAnswer = userAnswers?.[q.id];
      return {
        id: q.id,
        question_text: q.question_text,
        options: q.options,
        correct_answer_index: q.correct_answer_index,
        user_answer_index: userAnswer?.selected_option_index,
        is_correct:
          userAnswer?.selected_option_index === q.correct_answer_index,
        explanation: q.explanation,
      };
    });

    return {
      id: attempt.id,
      quiz: {
        id: attempt.quiz.id,
        title: attempt.quiz.title,
        passing_score: attempt.quiz.passing_score,
      },
      user: attempt.user,
      score: Number(attempt.score),
      total_questions: attempt.total_questions,
      correct_answers: attempt.correct_answers,
      passed: attempt.passed,
      started_at: attempt.started_at,
      completed_at: attempt.completed_at,
      questions_with_answers: questionsWithAnswers,
    };
  } catch (error) {
    logger.error("Error fetching quiz attempt detail:", error);
    throw new Error("Failed to fetch quiz attempt detail");
  }
};

// Get progress statistics
export const getProgressStats = async () => {
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Safely get counts with fallback to 0
    const [
      totalUsers,
      totalModules,
      totalMaterials,
      totalQuizzes,
      completedModules,
      completedQuizzes,
      passedQuizzes,
      activeUsersToday,
      newUsersThisWeek,
    ] = await Promise.all([
      prisma.profile.count({ where: { role: "pengguna" } }).catch(() => 0),
      prisma.module.count({ where: { published: true } }).catch(() => 0),
      prisma.subMateri.count({ where: { published: true } }).catch(() => 0),
      prisma.materisQuiz.count({ where: { published: true } }).catch(() => 0),
      prisma.userModuleProgress.count({ where: { status: "completed" } }).catch(() => 0),
      prisma.quizAttempt.count().catch(() => 0),
      prisma.quizAttempt.count({ where: { passed: true } }).catch(() => 0),
      prisma.userModuleProgress.count({
        where: {
          last_accessed_at: {
            gte: oneDayAgo,
          },
        },
      }).catch(() => 0),
      prisma.profile.count({
        where: {
          role: "pengguna",
          created_at: {
            gte: sevenDaysAgo,
          },
        },
      }).catch(() => 0),
    ]);

    // Get module completion stats (safely handle if modules table doesn't exist)
    const moduleStats = await prisma.module.findMany({
      where: { published: true },
      select: {
        id: true,
        title: true,
        userProgress: {
          select: {
            status: true,
          },
        },
      },
    }).catch(() => []);

    const moduleCompletionStats = moduleStats.map((module) => {
      const totalEnrolled = module.userProgress.length;
      const totalCompleted = module.userProgress.filter(
        (p) => p.status === "completed"
      ).length;
      return {
        module_id: module.id,
        module_title: module.title,
        total_users_started: totalEnrolled,
        total_users_completed: totalCompleted,
        completion_rate:
          totalEnrolled > 0
            ? Math.round((totalCompleted / totalEnrolled) * 100)
            : 0,
      };
    });

    // Calculate average completion rate
    const avgCompletionRate =
      moduleCompletionStats.length > 0
        ? Math.round(
            moduleCompletionStats.reduce(
              (sum, m) => sum + m.completion_rate,
              0
            ) / moduleCompletionStats.length
          )
        : 0;

    // Get recent activities (quiz attempts and module completions)
    const recentQuizAttempts = await prisma.quizAttempt.findMany({
      where: {
        completed_at: {
          not: null,
        },
      },
      include: {
        user: {
          select: {
            full_name: true,
          },
        },
        quiz: {
          select: {
            title: true,
          },
        },
      },
      orderBy: {
        completed_at: "desc",
      },
      take: 10,
    }).catch(() => []);

    const recentActivities = recentQuizAttempts.map((attempt) => {
      const completedAt = attempt.completed_at || new Date();
      const now = new Date();
      const diffMs = now.getTime() - completedAt.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      let relativeTime = "";
      if (diffMins < 1) {
        relativeTime = "Baru saja";
      } else if (diffMins < 60) {
        relativeTime = `${diffMins} menit lalu`;
      } else if (diffHours < 24) {
        relativeTime = `${diffHours} jam lalu`;
      } else {
        relativeTime = `${diffDays} hari lalu`;
      }

      return {
        id: attempt.id,
        user: attempt.user.full_name || "Unknown User",
        action: attempt.passed ? "Menyelesaikan kuis" : "Mencoba kuis",
        category: attempt.quiz.title || "Kuis",
        score: Number(attempt.score) || 0,
        passed: attempt.passed,
        time: completedAt.toISOString(),
        relative_time: relativeTime,
      };
    });

    return {
      total_users: totalUsers,
      active_users_today: activeUsersToday,
      new_users_this_week: newUsersThisWeek,
      total_modules: totalModules,
      total_materials: totalMaterials,
      total_quizzes: totalQuizzes,
      completed_modules_total: completedModules,
      completed_quizzes_total: completedQuizzes,
      passed_quizzes_total: passedQuizzes,
      average_completion_rate: avgCompletionRate,
      module_completion_stats: moduleCompletionStats,
      recent_activities: recentActivities,
      last_updated: new Date().toISOString(),
    };
  } catch (error) {
    logger.error("Error fetching progress stats:", error);
    throw new Error("Failed to fetch progress statistics");
  }
};

// Get all users
export const getAllUsers = async (params: {
  role?: string;
  search?: string;
  page: number;
  limit: number;
}) => {
  try {
    const { role, search, page, limit } = params;
    const skip = (page - 1) * limit;

    const whereConditions: any = {};

    if (role) whereConditions.role = role;
    if (search) {
      // Normalize phone search to handle both 08xxx and +62xxx formats
      const searchConditions: any[] = [
        { full_name: { contains: search, mode: "insensitive" } },
        { phone: { contains: search } },
      ];

      // If search starts with "08", also search for "+62" version
      if (search.startsWith("08")) {
        const normalizedPhone = "+62" + search.substring(1);
        searchConditions.push({ phone: { contains: normalizedPhone } });
      }
      // If search starts with "+62", also search for "08" version
      else if (search.startsWith("+62")) {
        const normalizedPhone = "0" + search.substring(3);
        searchConditions.push({ phone: { contains: normalizedPhone } });
      }
      // If search starts with "62" (without +), also search for "08" and "+62" versions
      else if (search.startsWith("62") && !search.startsWith("620")) {
        const normalizedPhone1 = "0" + search.substring(2);
        const normalizedPhone2 = "+" + search;
        searchConditions.push(
          { phone: { contains: normalizedPhone1 } },
          { phone: { contains: normalizedPhone2 } }
        );
      }

      whereConditions.OR = searchConditions;
    }

    const [users, total] = await Promise.all([
      prisma.profile.findMany({
        where: whereConditions,
        select: {
          id: true,
          email: true,
          full_name: true,
          phone: true,
          role: true,
          address: true,
          date_of_birth: true,
          profil_url: true,
          created_at: true,
          updated_at: true,
          _count: {
            select: {
              moduleProgress: true,
              quizAttempts: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: {
          created_at: "desc",
        },
      }),
      prisma.profile.count({ where: whereConditions }),
    ]);

    return {
      items: users.map((user) => ({
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        phone: user.phone,
        role: user.role,
        address: user.address,
        date_of_birth: user.date_of_birth,
        profil_url: user.profil_url,
        created_at: user.created_at,
        modules_enrolled: user._count.moduleProgress,
        quiz_attempts: user._count.quizAttempts,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  } catch (error) {
    logger.error("Error fetching all users:", error);
    throw new Error("Failed to fetch users");
  }
};

// Update user role
export const updateUserRole = async (userId: string, role: string) => {
  try {
    const user = await prisma.profile.update({
      where: { id: userId },
      data: {
        role,
        updated_at: new Date(),
      },
    });

    return user;
  } catch (error) {
    logger.error("Error updating user role:", error);
    throw new Error("Failed to update user role");
  }
};

// Get activity logs
export const getActivityLogs = async (params: {
  userId?: string;
  action?: string;
  resourceType?: string;
  page: number;
  limit: number;
}) => {
  try {
    const { userId, action, resourceType, page, limit } = params;
    const skip = (page - 1) * limit;

    const whereConditions: any = {};

    if (userId) whereConditions.user_id = userId;
    if (action) whereConditions.action = action;
    if (resourceType) whereConditions.resource_type = resourceType;

    const [logs, total] = await Promise.all([
      prisma.activityLog.findMany({
        where: whereConditions,
        include: {
          user: {
            select: {
              id: true,
              full_name: true,
              role: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: {
          created_at: "desc",
        },
      }),
      prisma.activityLog.count({ where: whereConditions }),
    ]);

    return {
      items: logs.map((log) => ({
        id: log.id,
        user_id: log.user_id,
        user_full_name: log.user.full_name,
        user_role: log.user.role,
        action: log.action,
        resource_type: log.resource_type,
        resource_id: log.resource_id,
        details: log.details,
        ip_address: log.ip_address,
        created_at: log.created_at,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  } catch (error) {
    logger.error("Error fetching activity logs:", error);
    throw new Error("Failed to fetch activity logs");
  }
};

// Reset user progress
export const resetUserProgress = async (userId: string, moduleId: string) => {
  try {
    // Delete all progress for the module
    await Promise.all([
      prisma.userModuleProgress.deleteMany({
        where: {
          user_id: userId,
          module_id: moduleId,
        },
      }),
      prisma.userSubMateriProgress.deleteMany({
        where: {
          user_id: userId,
          subMateri: {
            module_id: moduleId,
          },
        },
      }),
      prisma.quizAttempt.deleteMany({
        where: {
          user_id: userId,
          quiz: {
            module_id: moduleId,
          },
        },
      }),
    ]);

    return {
      success: true,
      message: "User progress reset successfully",
    };
  } catch (error) {
    logger.error("Error resetting user progress:", error);
    throw new Error("Failed to reset user progress");
  }
};

// Create new user
export const createUser = async (userData: {
  email?: string;
  password: string;
  full_name: string;
  phone?: string;
  role: string;
  address?: string;
  date_of_birth?: string;
  profil_url?: string;
}) => {
  try {
    const bcrypt = await import("bcrypt");

    // Validate at least email OR phone is provided
    if (!userData.email && !userData.phone) {
      throw new Error("Either email or phone number must be provided");
    }

    // Validate and normalize phone if provided
    let normalizedPhone: string | undefined = undefined;
    if (userData.phone) {
      if (!validatePhone(userData.phone)) {
        throw new Error(
          "Invalid phone number format. Use format: 08xxx or +62xxx"
        );
      }
      normalizedPhone = normalizePhone(userData.phone);
    }

    // Generate email for phone-only users (required by Supabase Auth)
    const userEmail =
      userData.email || `${normalizedPhone?.replace(/\+/g, "")}@bukadita.temp`;

    // Check if email or phone already exists
    const existingProfile = await prisma.profile.findFirst({
      where: {
        OR: [
          ...(userData.email ? [{ email: userData.email }] : []),
          ...(normalizedPhone ? [{ phone: normalizedPhone }] : []),
        ],
      },
    });

    if (existingProfile) {
      if (userData.email && existingProfile.email === userData.email) {
        throw new Error("Email already registered");
      }
      if (normalizedPhone && existingProfile.phone === normalizedPhone) {
        throw new Error("Phone number already registered");
      }
    }

    // Hash password
    const passwordHash = await bcrypt.hash(userData.password, 12);

    // Create user in Supabase Auth
    const supabase = (await import("../config/supabase")).default;
    const { data: authData, error: authError } =
      await supabase.auth.admin.createUser({
        email: userEmail,
        password: userData.password,
        email_confirm: true,
      });

    if (authError || !authData.user) {
      throw new Error(authError?.message || "Failed to create user in auth");
    }

    // Store password hash with phone
    await supabase.from("user_credentials").upsert({
      id: authData.user.id,
      email: userData.email || null,
      phone: normalizedPhone || null,
      password_hash: passwordHash,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    // Convert date_of_birth to ISO DateTime if provided
    let dateOfBirth: string | null = null;
    if (userData.date_of_birth) {
      const dateOnly = userData.date_of_birth;
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) {
        dateOfBirth = new Date(dateOnly + 'T00:00:00.000Z').toISOString();
      } else {
        dateOfBirth = userData.date_of_birth;
      }
    }

    // Create profile with all fields
    const profile = await prisma.profile.create({
      data: {
        id: authData.user.id,
        email: userData.email || null,
        full_name: userData.full_name,
        phone: normalizedPhone,
        role: userData.role,
        address: userData.address || null,
        date_of_birth: dateOfBirth,
        profil_url: userData.profil_url || null,
      },
    });

    // Log activity
    logger.info("User created:", {
      userId: profile.id,
      email: profile.email,
      phone: normalizedPhone,
      role: profile.role,
    });

    return {
      id: profile.id,
      email: profile.email,
      full_name: profile.full_name,
      phone: profile.phone,
      role: profile.role,
      created_at: profile.created_at,
    };
  } catch (error) {
    logger.error("Error creating user:", error);
    throw error;
  }
};

// Update user profile
export const updateUser = async (
  userId: string,
  updateData: {
    full_name?: string;
    email?: string;
    phone?: string;
    address?: string;
    date_of_birth?: string;
    profil_url?: string;
  }
) => {
  try {
    // Convert date_of_birth to ISO DateTime if provided
    const dataToUpdate: any = { ...updateData };
    
    if (dataToUpdate.date_of_birth) {
      // Convert YYYY-MM-DD to ISO DateTime (set to midnight UTC)
      const dateOnly = dataToUpdate.date_of_birth;
      if (dateOnly && /^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) {
        dataToUpdate.date_of_birth = new Date(dateOnly + 'T00:00:00.000Z').toISOString();
      }
    }

    const user = await prisma.profile.update({
      where: { id: userId },
      data: {
        ...dataToUpdate,
        updated_at: new Date(),
      },
    });

    return user;
  } catch (error) {
    logger.error("Error updating user:", error);
    throw new Error("Failed to update user");
  }
};

// Delete user
export const deleteUser = async (userId: string) => {
  try {
    // Delete from Supabase Auth first
    const supabase = (await import("../config/supabase")).default;
    const { error: authError } = await supabase.auth.admin.deleteUser(userId);

    if (authError) {
      logger.warn("Error deleting from Supabase auth:", authError.message);
      // Continue anyway to clean up local data
    }

    // Delete user credentials
    await supabase.from("user_credentials").delete().eq("id", userId);

    // Delete all user data (cascade will handle related records)
    await prisma.profile.delete({
      where: { id: userId },
    });

    return { success: true, message: "User deleted successfully" };
  } catch (error) {
    logger.error("Error deleting user:", error);
    throw new Error("Failed to delete user");
  }
};

// Get quiz performance detailed (per module with users)
export const getQuizPerformanceDetailed = async (moduleId?: string) => {
  try {
    // Get all modules or specific module
    const modules = await prisma.module.findMany({
      where: {
        published: true,
        ...(moduleId && { id: moduleId }),
      },
      select: {
        id: true,
        title: true,
        slug: true,
        quizzes: {
          where: { published: true },
          select: {
            id: true,
            title: true,
            passing_score: true,
            attempts: {
              where: {
                completed_at: { not: null },
              },
              include: {
                user: {
                  select: {
                    id: true,
                    full_name: true,
                    phone: true,
                  },
                },
              },
              orderBy: {
                completed_at: "desc",
              },
            },
          },
        },
      },
    }).catch(() => []);

    const performanceData = modules.map((module) => {
      const quizStats = module.quizzes.map((quiz) => {
        const totalAttempts = quiz.attempts.length;
        const passedAttempts = quiz.attempts.filter((a) => a.passed).length;
        const failedAttempts = totalAttempts - passedAttempts;
        const passRate = totalAttempts > 0
          ? Math.round((passedAttempts / totalAttempts) * 100)
          : 0;

        // Get all attempts per user (not aggregated)
        const userAttemptsMap = new Map();
        quiz.attempts.forEach((attempt) => {
          const userId = attempt.user_id;

          if (!userAttemptsMap.has(userId)) {
            userAttemptsMap.set(userId, {
              user_id: attempt.user_id,
              user_name: attempt.user.full_name,
              user_phone: attempt.user.phone,
              attempts: [],
            });
          }

          const userRecord = userAttemptsMap.get(userId);
          userRecord.attempts.push({
            attempt_id: attempt.id,
            score: Number(attempt.score),
            passed: attempt.passed,
            total_questions: attempt.total_questions,
            correct_answers: attempt.correct_answers,
            completed_at: attempt.completed_at,
          });
        });

        // Sort attempts by completed_at (most recent first) and calculate best score
        const userResults = Array.from(userAttemptsMap.values()).map((userRecord) => {
          userRecord.attempts.sort((a: any, b: any) =>
            new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime()
          );

          const bestScore = Math.max(...userRecord.attempts.map((a: any) => a.score));
          const bestAttempt = userRecord.attempts.find((a: any) => a.score === bestScore);

          return {
            ...userRecord,
            best_score: bestScore,
            passed: bestAttempt?.passed || false,
            total_attempts: userRecord.attempts.length,
          };
        });

        return {
          quiz_id: quiz.id,
          quiz_title: quiz.title,
          passing_score: quiz.passing_score,
          total_attempts: totalAttempts,
          passed_count: passedAttempts,
          failed_count: failedAttempts,
          pass_rate: passRate,
          unique_users: userResults.length,
          user_results: userResults.sort((a, b) => b.best_score - a.best_score),
        };
      });

      const totalQuizzes = quizStats.length;
      const totalAttempts = quizStats.reduce((sum, q) => sum + q.total_attempts, 0);
      const totalPassed = quizStats.reduce((sum, q) => sum + q.passed_count, 0);
      const totalFailed = quizStats.reduce((sum, q) => sum + q.failed_count, 0);
      const avgPassRate = totalQuizzes > 0
        ? Math.round(quizStats.reduce((sum, q) => sum + q.pass_rate, 0) / totalQuizzes)
        : 0;

      return {
        module_id: module.id,
        module_title: module.title,
        module_slug: module.slug,
        total_quizzes: totalQuizzes,
        summary: {
          total_attempts: totalAttempts,
          total_passed: totalPassed,
          total_failed: totalFailed,
          average_pass_rate: avgPassRate,
        },
        quizzes: quizStats,
      };
    });

    return {
      modules: performanceData,
      overall_stats: {
        total_modules: performanceData.length,
        total_quizzes: performanceData.reduce((sum, m) => sum + m.total_quizzes, 0),
        total_attempts: performanceData.reduce((sum, m) => sum + m.summary.total_attempts, 0),
        total_passed: performanceData.reduce((sum, m) => sum + m.summary.total_passed, 0),
        total_failed: performanceData.reduce((sum, m) => sum + m.summary.total_failed, 0),
      },
      last_updated: new Date().toISOString(),
    };
  } catch (error) {
    logger.error("Error fetching quiz performance detailed:", error);
    throw new Error("Failed to fetch quiz performance details");
  }
};

// Get recent activities with user classification (deduplicated)
export const getRecentActivitiesClassified = async (limit: number = 20) => {
  try {
    // Get all recent quiz attempts
    const recentAttempts = await prisma.quizAttempt.findMany({
      where: {
        completed_at: { not: null },
      },
      include: {
        user: {
          select: {
            id: true,
            full_name: true,
            profil_url: true,
          },
        },
        quiz: {
          select: {
            title: true,
            module: {
              select: {
                title: true,
              },
            },
          },
        },
      },
      orderBy: {
        completed_at: "desc",
      },
      take: 100, // Take more to process
    }).catch(() => []);

    // Get all recent module completions
    const recentCompletions = await prisma.userModuleProgress.findMany({
      where: {
        status: "completed",
        completed_at: { not: null },
      },
      include: {
        user: {
          select: {
            id: true,
            full_name: true,
            profil_url: true,
          },
        },
        module: {
          select: {
            title: true,
          },
        },
      },
      orderBy: {
        completed_at: "desc",
      },
      take: 100,
    }).catch(() => []);

    // Combine and classify by user
    const userActivityMap = new Map();

    // Process quiz attempts
    recentAttempts.forEach((attempt) => {
      const userId = attempt.user_id;
      const activityTime = attempt.completed_at!.getTime();

      if (!userActivityMap.has(userId) ||
          activityTime > userActivityMap.get(userId).timestamp) {
        userActivityMap.set(userId, {
          user_id: userId,
          user_name: attempt.user.full_name || "Unknown User",
          user_avatar: attempt.user.profil_url,
          activity_type: "quiz_attempt",
          activity_detail: attempt.quiz.title,
          module_name: attempt.quiz.module?.title,
          passed: attempt.passed,
          score: Number(attempt.score),
          timestamp: activityTime,
          completed_at: attempt.completed_at,
        });
      }
    });

    // Process module completions
    recentCompletions.forEach((completion) => {
      const userId = completion.user_id;
      const activityTime = completion.completed_at!.getTime();

      if (!userActivityMap.has(userId) ||
          activityTime > userActivityMap.get(userId).timestamp) {
        userActivityMap.set(userId, {
          user_id: userId,
          user_name: completion.user.full_name || "Unknown User",
          user_avatar: completion.user.profil_url,
          activity_type: "module_completed",
          activity_detail: completion.module.title,
          module_name: completion.module.title,
          progress_percent: completion.progress_percent,
          timestamp: activityTime,
          completed_at: completion.completed_at,
        });
      }
    });

    // Convert to array and sort by timestamp
    const classifiedActivities = Array.from(userActivityMap.values())
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit)
      .map((activity) => {
        const now = new Date();
        const diffMs = now.getTime() - activity.timestamp;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        let relativeTime = "";
        if (diffMins < 1) {
          relativeTime = "Baru saja";
        } else if (diffMins < 60) {
          relativeTime = `${diffMins} menit lalu`;
        } else if (diffHours < 24) {
          relativeTime = `${diffHours} jam lalu`;
        } else {
          relativeTime = `${diffDays} hari lalu`;
        }

        return {
          ...activity,
          relative_time: relativeTime,
        };
      });

    return classifiedActivities;
  } catch (error) {
    logger.error("Error fetching classified activities:", error);
    throw new Error("Failed to fetch recent activities");
  }
};
