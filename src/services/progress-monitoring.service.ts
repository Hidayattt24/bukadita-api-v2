import prisma from "../config/database";

/**
 * Get progress monitoring statistics
 * Returns: Total users, active, struggling, inactive counts
 */
export const getProgressMonitoringStats = async () => {
  try {
    console.log("\n========== [getProgressMonitoringStats] START ==========");
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    // Total users (pengguna only)
    const totalUsers = await prisma.profile.count({
      where: { role: "pengguna" },
    });
    console.log(`[Stats] Total users: ${totalUsers}`);

    // Active users: users who are very diligent (85%+ average score in all modules)
    const activeUsersData = await prisma.profile.findMany({
      where: {
        role: "pengguna",
      },
      select: {
        id: true,
        quizAttempts: {
          select: {
            score: true,
            quiz: {
              select: {
                module_id: true,
              },
            },
          },
        },
      },
    });

    const activeUsers = activeUsersData.filter((user: any) => {
      if (user.quizAttempts.length === 0) return false;

      // Group scores by module
      const moduleScores = new Map<string, number[]>();

      user.quizAttempts.forEach((attempt: any) => {
        if (attempt.quiz?.module_id) {
          const moduleId = attempt.quiz.module_id;
          if (!moduleScores.has(moduleId)) {
            moduleScores.set(moduleId, []);
          }
          moduleScores.get(moduleId)!.push(Number(attempt.score));
        }
      });

      // Check if all modules have average score >= 85%
      if (moduleScores.size === 0) return false;

      for (const scores of moduleScores.values()) {
        const avgScore =
          scores.reduce((sum, score) => sum + score, 0) / scores.length;
        if (avgScore < 85) {
          return false; // If any module has avg < 85%, not active
        }
      }

      return true; // All modules have avg >= 85%
    }).length;
    console.log(`[Stats] Active users (85%+ all modules): ${activeUsers}`);

    // Struggling users: users who fail 5+ times in the same module
    const strugglingUsersData = await prisma.profile.findMany({
      where: {
        role: "pengguna",
      },
      select: {
        id: true,
        quizAttempts: {
          select: {
            quiz_id: true,
            passed: true,
            quiz: {
              select: {
                module_id: true,
              },
            },
          },
          orderBy: {
            created_at: "desc",
          },
        },
      },
    });

    const strugglingUsers = strugglingUsersData.filter((user: any) => {
      if (user.quizAttempts.length === 0) return false;

      // Group attempts by module_id to count failures per module
      const moduleFailures = new Map<string, number>();

      user.quizAttempts.forEach((attempt: any) => {
        if (!attempt.passed && attempt.quiz?.module_id) {
          const moduleId = attempt.quiz.module_id;
          moduleFailures.set(moduleId, (moduleFailures.get(moduleId) || 0) + 1);
        }
      });

      // Check if user has any module with 5+ failures
      for (const failures of moduleFailures.values()) {
        if (failures >= 5) {
          return true;
        }
      }

      return false;
    }).length;
    console.log(
      `[Stats] Struggling users (5+ failures/module): ${strugglingUsers}`,
    );

    // Inactive users: users with 0 quiz attempts
    const inactiveUsersData = await prisma.profile.findMany({
      where: {
        role: "pengguna",
      },
      select: {
        id: true,
        quizAttempts: {
          select: {
            id: true,
          },
        },
      },
    });

    const inactiveUsers = inactiveUsersData.filter((user: any) => {
      return user.quizAttempts.length === 0;
    }).length;
    console.log(`[Stats] Inactive users (0 quiz attempts): ${inactiveUsers}`);

    const result = {
      total_users: totalUsers,
      active_users: activeUsers,
      struggling_users: strugglingUsers,
      inactive_users: inactiveUsers,
    };
    console.log("[Stats] RESULT:", JSON.stringify(result));
    console.log("========== [getProgressMonitoringStats] END ==========\n");

    return result;
  } catch (error) {
    console.error("Error in getProgressMonitoringStats:", error);
    throw error;
  }
};

/**
 * Get module completion and stuck statistics
 * Stuck = modul dimana banyak user mengalami kesulitan (sering gagal kuis)
 */
export const getModuleCompletionStats = async () => {
  try {
    console.log("\n========== [getModuleCompletionStats] START ==========");
    const modules = await prisma.module.findMany({
      where: { published: true },
      select: {
        id: true,
        title: true,
        quizzes: {
          select: {
            id: true,
          },
        },
      },
    });

    console.log(`[ModuleStats] Total modules: ${modules.length}`);

    // Get all quiz attempts for each module
    const moduleStats = await Promise.all(
      modules.map(async (module: any) => {
        const moduleQuizIds = module.quizzes.map((q: any) => q.id);

        // Get all users who attempted quizzes in this module
        const usersWithAttempts = await prisma.profile.findMany({
          where: {
            role: "pengguna",
            quizAttempts: {
              some: {
                quiz_id: {
                  in: moduleQuizIds,
                },
              },
            },
          },
          select: {
            id: true,
            quizAttempts: {
              where: {
                quiz_id: {
                  in: moduleQuizIds,
                },
              },
              select: {
                quiz_id: true,
                passed: true,
              },
            },
          },
        });

        const totalStarted = usersWithAttempts.length;

        // Count users who completed (answered all quizzes in module)
        let totalCompleted = 0;
        let totalStuck = 0; // Users with 5+ failures in this module

        usersWithAttempts.forEach((user: any) => {
          const answeredQuizIds = new Set(
            user.quizAttempts.map((a: any) => a.quiz_id),
          );
          const allQuizzesAnswered = moduleQuizIds.every((qid: string) =>
            answeredQuizIds.has(qid),
          );

          if (allQuizzesAnswered) {
            totalCompleted++;
          }

          // Count failures in this module (CHANGED: 5+ failures instead of 3+)
          const failures = user.quizAttempts.filter(
            (a: any) => !a.passed,
          ).length;
          if (failures >= 5) {
            totalStuck++;
          }
        });

        const completionRate =
          totalStarted > 0
            ? Math.round((totalCompleted / totalStarted) * 100)
            : 0;

        const stats = {
          module_id: module.id,
          module_title: module.title,
          total_completions: totalCompleted,
          total_stuck: totalStuck, // Users with 5+ failures
          total_started: totalStarted,
          completion_rate: completionRate,
        };

        console.log(
          `[ModuleStats] ${module.title}: completed=${totalCompleted}, stuck=${totalStuck} (5+ failures), started=${totalStarted}, rate=${completionRate}%`,
        );

        return stats;
      }),
    );

    console.log("[ModuleStats] RESULT: Total stats count:", moduleStats.length);
    console.log("========== [getModuleCompletionStats] END ==========\n");

    return moduleStats;
  } catch (error) {
    console.error("Error in getModuleCompletionStats:", error);
    throw error;
  }
};

/**
 * Get list of users who are stuck in a specific module
 * Stuck = users with 5+ failures in the module
 */
export const getStuckUsersByModule = async (moduleId: string) => {
  try {
    console.log(
      `\n========== [getStuckUsersByModule] START for module: ${moduleId} ==========`,
    );

    // Get module with its quizzes
    const module = await prisma.module.findUnique({
      where: { id: moduleId },
      select: {
        id: true,
        title: true,
        quizzes: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!module) {
      throw new Error("Module not found");
    }

    const moduleQuizIds = module.quizzes.map((q: any) => q.id);
    console.log(
      `[StuckUsers] Module: ${module.title}, Quiz IDs: ${moduleQuizIds.join(", ")}`,
    );

    // Get all users who attempted quizzes in this module
    const usersWithAttempts = await prisma.profile.findMany({
      where: {
        role: "pengguna",
        quizAttempts: {
          some: {
            quiz_id: {
              in: moduleQuizIds,
            },
          },
        },
      },
      select: {
        id: true,
        full_name: true,
        email: true,
        quizAttempts: {
          where: {
            quiz_id: {
              in: moduleQuizIds,
            },
          },
          select: {
            passed: true,
            completed_at: true,
          },
          orderBy: {
            completed_at: "desc",
          },
        },
      },
    });

    console.log(
      `[StuckUsers] Total users with attempts: ${usersWithAttempts.length}`,
    );

    // Filter users with 5+ failures and build result
    const stuckUsers = usersWithAttempts
      .map((user: any) => {
        const failures = user.quizAttempts.filter((a: any) => !a.passed).length;
        const lastAttempt =
          user.quizAttempts.length > 0
            ? user.quizAttempts[0].completed_at
            : new Date();

        console.log(
          `[StuckUsers] User: ${user.full_name}, Failures: ${failures}`,
        );

        return {
          user_id: user.id,
          user_name: user.full_name,
          user_email: user.email || "",
          failure_count: failures,
          last_attempt: lastAttempt,
        };
      })
      .filter((user: any) => user.failure_count >= 5) // CHANGED: 5+ failures instead of 3+
      .sort((a: any, b: any) => b.failure_count - a.failure_count); // Sort by failure count desc

    console.log(`[StuckUsers] Stuck users (5+ failures): ${stuckUsers.length}`);
    if (stuckUsers.length > 0) {
      console.log(
        `[StuckUsers] Sample:`,
        stuckUsers
          .slice(0, 3)
          .map((u: any) => `${u.user_name} (${u.failure_count} failures)`),
      );
    }
    console.log("========== [getStuckUsersByModule] END ==========\n");

    return stuckUsers;
  } catch (error) {
    console.error("Error in getStuckUsersByModule:", error);
    throw error;
  }
};

/**
 * Get user progress list with filtering and pagination
 */
export const getUserProgressList = async (params: {
  search?: string;
  status?: "active" | "struggling" | "inactive" | "all";
  page?: number;
  limit?: number;
}) => {
  try {
    console.log("\n========== [getUserProgressList] START ==========");
    console.log("[UserList] Params:", JSON.stringify(params));

    const { search = "", status = "all", page = 1, limit = 10 } = params;
    const skip = (page - 1) * limit;

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Build where clause
    const whereClause: any = {
      role: "pengguna",
    };

    // Search by name or email
    if (search) {
      whereClause.OR = [
        { full_name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    // Get all users first
    const allUsers = await prisma.profile.findMany({
      where: whereClause,
      select: {
        id: true,
        email: true,
        full_name: true,
        profil_url: true,
        created_at: true,
        quizAttempts: {
          select: {
            passed: true,
            score: true,
            created_at: true,
            quiz_id: true,
            quiz: {
              select: {
                module_id: true,
              },
            },
          },
          orderBy: {
            created_at: "desc",
          },
        },
      },
    });

    // Get all modules to calculate progress correctly
    const allModules = await prisma.module.findMany({
      where: { published: true },
      select: {
        id: true,
        title: true,
        quizzes: {
          select: {
            id: true,
          },
        },
      },
    });

    console.log(
      `[getUserProgressList] Total users: ${allUsers.length}, Total modules: ${allModules.length}`,
    );
    console.log(
      `[getUserProgressList] Modules:`,
      allModules
        .map((m: any) => `${m.title} (${m.quizzes.length} quizzes)`)
        .join(", "),
    );

    // Calculate status for each user and filter
    const usersWithStatus = allUsers.map((user: any) => {
      const totalModules = allModules.length;

      // Calculate module completion based on quiz attempts
      let completedModules = 0;
      let inProgressModules = 0;

      // Build module quiz summary for display
      const moduleQuizSummary: Array<{
        module_id: string;
        module_title: string;
        quizzes_passed: number;
        total_quizzes: number;
      }> = [];

      // Log for first few users
      const shouldLog = allUsers.indexOf(user) < 3;
      if (shouldLog) {
        console.log(
          `[UserList] Calculating module progress for: ${user.full_name}`,
        );
      }

      allModules.forEach((module: any) => {
        const moduleQuizIds = new Set(module.quizzes.map((q: any) => q.id));
        const userAttemptsForModule = user.quizAttempts.filter((attempt: any) =>
          moduleQuizIds.has(attempt.quiz_id),
        );

        const answeredQuizIds = new Set(
          userAttemptsForModule.map((a: any) => a.quiz_id),
        );
        const quizzesAnswered = answeredQuizIds.size;
        const totalQuizzes = module.quizzes.length;

        // Count passed quizzes
        const passedQuizIds = new Set(
          userAttemptsForModule
            .filter((a: any) => a.passed)
            .map((a: any) => a.quiz_id),
        );
        const quizzesPassed = passedQuizIds.size;

        // Add to summary
        moduleQuizSummary.push({
          module_id: module.id,
          module_title: module.title,
          quizzes_passed: quizzesPassed,
          total_quizzes: totalQuizzes,
        });

        if (shouldLog) {
          console.log(
            `  - Module: ${module.title}, Answered: ${quizzesAnswered}/${totalQuizzes}, Passed: ${quizzesPassed}`,
          );
        }

        if (quizzesAnswered === totalQuizzes && totalQuizzes > 0) {
          completedModules++;
          if (shouldLog) console.log(`    -> Status: COMPLETED`);
        } else if (quizzesAnswered > 0) {
          inProgressModules++;
          if (shouldLog) console.log(`    -> Status: IN-PROGRESS`);
        } else {
          if (shouldLog) console.log(`    -> Status: NOT-STARTED`);
        }
      });

      const notStartedModules =
        totalModules - completedModules - inProgressModules;

      // Count UNIQUE quizzes (not total attempts)
      const uniqueQuizIds = new Set(
        user.quizAttempts.map((a: any) => a.quiz_id),
      );
      const totalUniqueQuizzes = uniqueQuizIds.size;

      // Count unique quizzes that have at least one passed attempt
      const passedQuizIds = new Set(
        user.quizAttempts
          .filter((a: any) => a.passed)
          .map((a: any) => a.quiz_id),
      );
      const totalQuizPassed = passedQuizIds.size;

      // Failed quizzes = answered but never passed
      const totalQuizFailed = totalUniqueQuizzes - totalQuizPassed;

      // Total attempts (for logging/debugging)
      const totalQuizAttempts = user.quizAttempts.length;

      // Log detailed quiz info for first few users
      if (allUsers.indexOf(user) < 3) {
        console.log(`[UserList] User: ${user.full_name}`);
        console.log(`  - Total attempts: ${totalQuizAttempts}`);
        console.log(
          `  - Unique quizzes: ${totalUniqueQuizzes} (IDs: ${Array.from(uniqueQuizIds).join(", ")})`,
        );
        console.log(
          `  - Passed quizzes: ${totalQuizPassed} (IDs: ${Array.from(passedQuizIds).join(", ")})`,
        );
        console.log(`  - Failed quizzes: ${totalQuizFailed}`);
      }

      const averageQuizScore =
        totalQuizAttempts > 0
          ? Math.round(
              user.quizAttempts.reduce(
                (sum: number, a: any) => sum + Number(a.score),
                0,
              ) / totalQuizAttempts,
            )
          : 0;

      // Determine last activity
      const lastActivity =
        user.quizAttempts.length > 0
          ? user.quizAttempts[0].created_at
          : new Date(0);

      // Determine user status
      let userStatus: "active" | "struggling" | "inactive" = "inactive"; // Default to inactive

      // Check if user has any quiz attempts
      if (totalQuizAttempts === 0) {
        // No quiz attempts = inactive
        userStatus = "inactive";
      } else {
        // Check for active: all modules have average score >= 85%
        const moduleScores = new Map<string, number[]>();

        user.quizAttempts.forEach((attempt: any) => {
          if (attempt.quiz?.module_id) {
            const moduleId = attempt.quiz.module_id;
            if (!moduleScores.has(moduleId)) {
              moduleScores.set(moduleId, []);
            }
            moduleScores.get(moduleId)!.push(Number(attempt.score));
          }
        });

        let isActive = false;
        if (moduleScores.size > 0) {
          isActive = true;
          for (const scores of moduleScores.values()) {
            const avgScore =
              scores.reduce((sum: number, score: number) => sum + score, 0) /
              scores.length;
            if (avgScore < 85) {
              isActive = false;
              break;
            }
          }
        }

        // Check for struggling: 5+ failures in any single module
        const moduleFailures = new Map<string, number>();

        user.quizAttempts.forEach((attempt: any) => {
          if (!attempt.passed && attempt.quiz?.module_id) {
            const moduleId = attempt.quiz.module_id;
            moduleFailures.set(
              moduleId,
              (moduleFailures.get(moduleId) || 0) + 1,
            );
          }
        });

        let hasModuleWith5PlusFailures = false;
        for (const failures of moduleFailures.values()) {
          if (failures >= 5) {
            hasModuleWith5PlusFailures = true;
            break;
          }
        }

        if (hasModuleWith5PlusFailures) {
          userStatus = "struggling";
        } else if (isActive) {
          userStatus = "active";
        } else {
          // Has attempts but not active and not struggling with 5+ failures
          // This is a normal user who is learning
          userStatus = "active"; // Consider them active if they have attempts
        }
      }

      return {
        user_id: user.id,
        user_name: user.full_name,
        user_email: user.email || "",
        user_profil_url: user.profil_url,
        total_modules: totalModules,
        completed_modules: completedModules,
        in_progress_modules: inProgressModules,
        not_started_modules: notStartedModules,
        total_materials_read: 0, // Not used anymore
        total_quiz_attempts: totalQuizAttempts,
        total_quiz_passed: totalQuizPassed,
        total_quiz_failed: totalQuizFailed,
        unique_quizzes_attempted: totalUniqueQuizzes, // NEW: Total unique quizzes attempted
        pass_rate:
          totalUniqueQuizzes > 0
            ? Math.round((totalQuizPassed / totalUniqueQuizzes) * 100)
            : 0, // NEW: Pass rate percentage
        average_quiz_score: averageQuizScore,
        module_quiz_summary: moduleQuizSummary, // NEW: Quiz summary per module
        last_activity: lastActivity.toISOString(),
        status: userStatus,
      };
    });

    console.log(
      `[getUserProgressList] Processed ${usersWithStatus.length} users`,
    );

    // Log first user for debugging
    if (usersWithStatus.length > 0) {
      const firstUser = usersWithStatus[0];
      console.log("[UserList] First user sample:", {
        name: firstUser.user_name,
        total_modules: firstUser.total_modules,
        completed: firstUser.completed_modules,
        in_progress: firstUser.in_progress_modules,
        quiz_attempts: firstUser.total_quiz_attempts,
        unique_quizzes: firstUser.unique_quizzes_attempted,
        quiz_passed: firstUser.total_quiz_passed,
        quiz_failed: firstUser.total_quiz_failed,
        pass_rate: firstUser.pass_rate,
        avg_score: firstUser.average_quiz_score,
        status: firstUser.status,
      });
    }

    // Filter by status
    const filteredUsers =
      status === "all"
        ? usersWithStatus
        : usersWithStatus.filter((u: any) => u.status === status);

    console.log(
      `[UserList] After filter (status=${status}): ${filteredUsers.length} users`,
    );

    // Sort: struggling first, then active, then inactive
    filteredUsers.sort((a: any, b: any) => {
      const order = { struggling: 0, active: 1, inactive: 2 };
      return (
        order[a.status as keyof typeof order] -
        order[b.status as keyof typeof order]
      );
    });

    // Paginate
    const paginatedUsers = filteredUsers.slice(skip, skip + limit);

    const result = {
      items: paginatedUsers,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(filteredUsers.length / limit),
        totalCount: filteredUsers.length,
        limit,
      },
    };

    console.log("[UserList] RESULT:", {
      items_count: result.items.length,
      pagination: result.pagination,
    });
    console.log("========== [getUserProgressList] END ==========\n");

    return result;
  } catch (error) {
    console.error("Error in getUserProgressList:", error);
    throw error;
  }
};

/**
 * Get detailed progress for a specific user
 * Shows ALL modules and quizzes, even if not attempted
 */
export const getUserDetailProgress = async (userId: string) => {
  try {
    console.log(`[getUserDetailProgress] Fetching data for user: ${userId}`);

    // Get user data with poin progress for reading tracking
    const user = await prisma.profile.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        full_name: true,
        profil_url: true,
        quizAttempts: {
          select: {
            id: true,
            score: true,
            passed: true,
            total_questions: true,
            correct_answers: true,
            answers: true,
            completed_at: true,
            quiz_id: true,
            quiz: {
              select: {
                id: true,
                title: true,
                module_id: true,
                questions: {
                  select: {
                    id: true,
                    question_text: true,
                    options: true,
                    correct_answer_index: true,
                  },
                  orderBy: {
                    order_index: "asc",
                  },
                },
              },
            },
          },
          orderBy: {
            completed_at: "desc",
          },
        },
        poinProgress: {
          where: {
            OR: [{ is_completed: true }, { scroll_completed: true }],
          },
          select: {
            poin_id: true,
            is_completed: true,
            scroll_completed: true,
            scroll_completed_at: true,
            completed_at: true,
            poinDetail: {
              select: {
                id: true,
                title: true,
                sub_materi_id: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new Error("User not found");
    }

    console.log(
      `[getUserDetailProgress] User found: ${user.full_name}, Quiz attempts: ${user.quizAttempts.length}`,
    );

    // Get ALL modules with their quizzes and sub-materis (including poins for reading progress)
    const allModules = await prisma.module.findMany({
      where: { published: true },
      select: {
        id: true,
        title: true,
        quizzes: {
          select: {
            id: true,
            title: true,
            quiz_type: true,
            sub_materi_id: true,
            subMateri: {
              select: {
                id: true,
                title: true,
              },
            },
          },
          orderBy: {
            created_at: "asc",
          },
        },
        subMateris: {
          select: {
            id: true,
            title: true,
            poinDetails: {
              select: {
                id: true,
                title: true,
              },
              orderBy: {
                order_index: "asc",
              },
            },
          },
          orderBy: {
            order_index: "asc",
          },
        },
      },
      orderBy: {
        created_at: "asc",
      },
    });

    console.log(`[getUserDetailProgress] Total modules: ${allModules.length}`);

    // Build a map of user's reading progress by sub_materi_id
    const readingProgressBySubMateri = new Map<
      string,
      {
        total_poins: number;
        read_poins: number;
        scroll_completed_poins: number;
      }
    >();

    // Process user's poin progress to calculate reading stats per sub-materi
    user.poinProgress.forEach((progress: any) => {
      const subMateriId = progress.poinDetail?.sub_materi_id;
      if (!subMateriId) return;

      if (!readingProgressBySubMateri.has(subMateriId)) {
        readingProgressBySubMateri.set(subMateriId, {
          total_poins: 0,
          read_poins: 0,
          scroll_completed_poins: 0,
        });
      }

      const stats = readingProgressBySubMateri.get(subMateriId)!;
      if (progress.is_completed) {
        stats.read_poins++;
      }
      if (progress.scroll_completed) {
        stats.scroll_completed_poins++;
      }
    });

    // Count total poins per sub-materi from modules data
    allModules.forEach((module: any) => {
      module.subMateris.forEach((subMateri: any) => {
        const totalPoins = subMateri.poinDetails?.length || 0;
        if (totalPoins > 0) {
          const existing = readingProgressBySubMateri.get(subMateri.id);
          if (existing) {
            existing.total_poins = totalPoins;
          } else {
            readingProgressBySubMateri.set(subMateri.id, {
              total_poins: totalPoins,
              read_poins: 0,
              scroll_completed_poins: 0,
            });
          }
        }
      });
    });

    console.log(
      `[getUserDetailProgress] Reading progress tracked for ${readingProgressBySubMateri.size} sub-materis`,
    );

    // Build modules progress data
    const modulesProgress = allModules.map((module: any) => {
      const moduleQuizzes = module.quizzes;
      const totalQuizzes = moduleQuizzes.length;

      console.log(
        `[getUserDetailProgress] Module: ${module.title}, Total quizzes: ${totalQuizzes}`,
      );

      // Get user's attempts for this module's quizzes
      const moduleQuizIds = new Set(moduleQuizzes.map((q: any) => q.id));
      const userAttemptsForModule = user.quizAttempts.filter((attempt: any) =>
        moduleQuizIds.has(attempt.quiz_id),
      );

      console.log(
        `[getUserDetailProgress] Module: ${module.title}, User attempts: ${userAttemptsForModule.length}`,
      );

      // Group attempts by quiz_id to get unique quizzes answered
      const answeredQuizIds = new Set(
        userAttemptsForModule.map((a: any) => a.quiz_id),
      );
      const quizzesAnswered = answeredQuizIds.size;

      // Count passed quizzes (at least one passed attempt per quiz)
      const passedQuizIds = new Set(
        userAttemptsForModule
          .filter((a: any) => a.passed)
          .map((a: any) => a.quiz_id),
      );
      const quizzesPassed = passedQuizIds.size;

      // Calculate progress: percentage of quizzes answered (not necessarily passed)
      const overallProgress =
        totalQuizzes > 0
          ? Math.round((quizzesAnswered / totalQuizzes) * 100)
          : 0;

      console.log(
        `[getUserDetailProgress] Module: ${module.title}, Progress: ${overallProgress}% (${quizzesAnswered}/${totalQuizzes} answered, ${quizzesPassed} passed)`,
      );

      // Determine status
      let status: "not-started" | "in-progress" | "completed" = "not-started";
      if (quizzesAnswered === totalQuizzes && totalQuizzes > 0) {
        status = "completed";
      } else if (quizzesAnswered > 0) {
        status = "in-progress";
      }

      // Build quiz attempts array with ALL quizzes (even unattempted ones)
      const quizAttemptsData = moduleQuizzes
        .map((quiz: any) => {
          // Get all attempts for this specific quiz
          const attemptsForQuiz = userAttemptsForModule.filter(
            (a: any) => a.quiz_id === quiz.id,
          );

          // Get reading progress for this quiz's sub-materi
          const subMateriId = quiz.sub_materi_id;
          const readingProgress = subMateriId
            ? readingProgressBySubMateri.get(subMateriId)
            : null;

          const readingPercentage =
            readingProgress && readingProgress.total_poins > 0
              ? Math.round(
                  (readingProgress.scroll_completed_poins /
                    readingProgress.total_poins) *
                    100,
                )
              : 0;

          const isReadingComplete =
            readingProgress &&
            readingProgress.total_poins > 0 &&
            readingProgress.scroll_completed_poins ===
              readingProgress.total_poins;

          if (attemptsForQuiz.length === 0) {
            // Quiz not attempted yet - return placeholder with reading progress
            return {
              quiz_id: quiz.id,
              quiz_title: quiz.title || "Untitled Quiz",
              sub_materi_title:
                quiz.subMateri?.title || quiz.title || "Untitled Quiz",
              score: 0,
              passed: false,
              attempted_at: null,
              total_questions: 0,
              correct_answers: 0,
              answers: [],
              is_attempted: false,
              // Reading progress data
              reading_completed: isReadingComplete,
              reading_percentage: readingPercentage,
              total_poins: readingProgress?.total_poins || 0,
              scroll_completed_poins:
                readingProgress?.scroll_completed_poins || 0,
            };
          }

          // Return all attempts for this quiz (most recent first)
          return attemptsForQuiz.map((attempt: any) => {
            const answersArray = Array.isArray(attempt.answers)
              ? attempt.answers
              : [];

            const answersDetail = answersArray.map((ans: any, idx: number) => {
              const question = attempt.quiz.questions[idx];
              if (!question) {
                return {
                  question_id: `q_${idx}`,
                  question_text: "Pertanyaan tidak ditemukan",
                  user_answer: "Tidak tersedia",
                  correct_answer: "Tidak tersedia",
                  is_correct: false,
                };
              }

              const options = Array.isArray(question.options)
                ? question.options
                : [];
              const userAnswerIndex =
                ans.selected_option_index ??
                ans.answer_index ??
                ans.answerIndex ??
                ans.selected_index ??
                ans.selectedIndex ??
                -1;
              const correctAnswerIndex =
                question.correct_answer_index ??
                question.correctAnswerIndex ??
                -1;

              let userAnswerText = "Tidak dijawab";
              if (userAnswerIndex >= 0 && userAnswerIndex < options.length) {
                userAnswerText = options[userAnswerIndex];
              } else if (ans.answer && typeof ans.answer === "string") {
                userAnswerText = ans.answer;
              }

              let correctAnswerText = "Tidak tersedia";
              if (
                correctAnswerIndex >= 0 &&
                correctAnswerIndex < options.length
              ) {
                correctAnswerText = options[correctAnswerIndex];
              }

              return {
                question_id: question.id,
                question_text: question.question_text,
                user_answer: userAnswerText,
                correct_answer: correctAnswerText,
                is_correct:
                  userAnswerIndex === correctAnswerIndex &&
                  userAnswerIndex >= 0,
              };
            });

            return {
              quiz_id: attempt.quiz.id,
              quiz_title: attempt.quiz.title || "Untitled Quiz",
              sub_materi_title:
                quiz.subMateri?.title || attempt.quiz.title || "Untitled Quiz",
              score: Number(attempt.score),
              passed: attempt.passed,
              attempted_at:
                attempt.completed_at?.toISOString() || new Date().toISOString(),
              total_questions: attempt.total_questions,
              correct_answers: attempt.correct_answers,
              answers: answersDetail,
              is_attempted: true,
              // Reading progress data
              reading_completed: isReadingComplete,
              reading_percentage: readingPercentage,
              total_poins: readingProgress?.total_poins || 0,
              scroll_completed_poins:
                readingProgress?.scroll_completed_poins || 0,
            };
          });
        })
        .flat(); // Flatten to handle multiple attempts per quiz

      return {
        module_id: module.id,
        module_title: module.title,
        status,
        materials_read: module.subMateris.length, // Show total sub-materis
        total_materials: module.subMateris.length,
        quizzes_passed: quizzesPassed,
        total_quizzes: totalQuizzes,
        quiz_attempts: quizAttemptsData,
        last_accessed:
          userAttemptsForModule.length > 0
            ? userAttemptsForModule[0].completed_at?.toISOString() ||
              new Date().toISOString()
            : "",
        overall_progress: overallProgress,
        total_time_spent: 0,
      };
    });

    // Calculate overall stats
    const totalModules = modulesProgress.length;
    const completedModules = modulesProgress.filter(
      (m: any) => m.status === "completed",
    ).length;
    const inProgressModules = modulesProgress.filter(
      (m: any) => m.status === "in-progress",
    ).length;
    const notStartedModules =
      totalModules - completedModules - inProgressModules;

    const totalMaterialsRead = modulesProgress.reduce(
      (sum: number, m: any) => sum + m.materials_read,
      0,
    );

    // Count UNIQUE quizzes (not total attempts)
    const uniqueQuizIds = new Set(user.quizAttempts.map((a: any) => a.quiz_id));
    const totalUniqueQuizzes = uniqueQuizIds.size;

    // Count unique quizzes that have at least one passed attempt
    const passedQuizIds = new Set(
      user.quizAttempts.filter((a: any) => a.passed).map((a: any) => a.quiz_id),
    );
    const totalQuizPassed = passedQuizIds.size;

    // Failed quizzes = answered but never passed
    const totalQuizFailed = totalUniqueQuizzes - totalQuizPassed;

    // Total attempts (for reference)
    const totalQuizAttempts = user.quizAttempts.length;

    console.log(
      `[getUserDetailProgress] Quiz stats: Attempts=${totalQuizAttempts}, Unique=${totalUniqueQuizzes}, Passed=${totalQuizPassed}, Failed=${totalQuizFailed}`,
    );

    const averageQuizScore =
      totalQuizAttempts > 0
        ? Math.round(
            user.quizAttempts.reduce(
              (sum: number, a: any) => sum + Number(a.score),
              0,
            ) / totalQuizAttempts,
          )
        : 0;

    // Determine last activity
    const lastActivity =
      user.quizAttempts.length > 0
        ? user.quizAttempts[0].completed_at?.toISOString() ||
          new Date().toISOString()
        : new Date().toISOString();

    // Determine status
    let status: "active" | "struggling" | "inactive" = "inactive"; // Default to inactive

    // Check if user has any quiz attempts
    if (totalQuizAttempts === 0) {
      // No quiz attempts = inactive
      status = "inactive";
    } else {
      // Check for active: all modules have average score >= 85%
      const moduleScores = new Map<string, number[]>();

      user.quizAttempts.forEach((attempt: any) => {
        if (attempt.quiz?.module_id) {
          const moduleId = attempt.quiz.module_id;
          if (!moduleScores.has(moduleId)) {
            moduleScores.set(moduleId, []);
          }
          moduleScores.get(moduleId)!.push(Number(attempt.score));
        }
      });

      let isActive = false;
      if (moduleScores.size > 0) {
        isActive = true;
        for (const scores of moduleScores.values()) {
          const avgScore =
            scores.reduce((sum: number, score: number) => sum + score, 0) /
            scores.length;
          if (avgScore < 85) {
            isActive = false;
            break;
          }
        }
      }

      // Check for struggling: 5+ failures in any single module
      const moduleFailures = new Map<string, number>();

      user.quizAttempts.forEach((attempt: any) => {
        if (!attempt.passed && attempt.quiz?.module_id) {
          const moduleId = attempt.quiz.module_id;
          moduleFailures.set(moduleId, (moduleFailures.get(moduleId) || 0) + 1);
        }
      });

      let hasModuleWith5PlusFailures = false;
      for (const failures of moduleFailures.values()) {
        if (failures >= 5) {
          hasModuleWith5PlusFailures = true;
          break;
        }
      }

      if (hasModuleWith5PlusFailures) {
        status = "struggling";
      } else if (isActive) {
        status = "active";
      } else {
        // Has attempts but not active and not struggling with 5+ failures
        // This is a normal user who is learning
        status = "active"; // Consider them active if they have attempts
      }
    }

    const result = {
      user_id: user.id,
      user_name: user.full_name,
      user_email: user.email || "",
      user_profil_url: user.profil_url,
      total_modules: totalModules,
      completed_modules: completedModules,
      in_progress_modules: inProgressModules,
      not_started_modules: notStartedModules,
      total_materials_read: totalMaterialsRead,
      total_quiz_attempts: totalQuizAttempts,
      total_quiz_passed: totalQuizPassed,
      total_quiz_failed: totalQuizFailed,
      unique_quizzes_attempted: totalUniqueQuizzes, // NEW: Total unique quizzes attempted
      pass_rate:
        totalUniqueQuizzes > 0
          ? Math.round((totalQuizPassed / totalUniqueQuizzes) * 100)
          : 0, // NEW: Pass rate percentage
      average_quiz_score: averageQuizScore,
      last_activity: lastActivity,
      status,
      modules_progress: modulesProgress,
    };

    console.log(`[getUserDetailProgress] Result summary:`, {
      user_name: result.user_name,
      total_modules: result.total_modules,
      completed_modules: result.completed_modules,
      in_progress_modules: result.in_progress_modules,
      total_quiz_attempts: result.total_quiz_attempts,
      unique_quizzes: result.unique_quizzes_attempted,
      quiz_passed: result.total_quiz_passed,
      quiz_failed: result.total_quiz_failed,
      pass_rate: result.pass_rate,
      avg_score: result.average_quiz_score,
      status: result.status,
    });

    return result;
  } catch (error) {
    console.error("Error in getUserDetailProgress:", error);
    throw error;
  }
};

/**
 * Get reading progress statistics per module
 * Shows which poins users have read (scroll_completed = true)
 */
export const getReadingProgressStats = async () => {
  try {
    console.log("\n========== [getReadingProgressStats] START ==========");

    // Get all users with their poin progress
    const usersWithProgress = await prisma.profile.findMany({
      where: {
        role: "pengguna",
        poinProgress: {
          some: {
            scroll_completed: true,
          },
        },
      },
      select: {
        id: true,
        full_name: true,
        email: true,
        poinProgress: {
          where: {
            OR: [{ is_completed: true }, { scroll_completed: true }],
          },
          select: {
            poin_id: true,
            is_completed: true,
            scroll_completed: true,
            poinDetail: {
              select: {
                id: true,
                title: true,
                sub_materi_id: true,
                subMateri: {
                  select: {
                    id: true,
                    title: true,
                    module_id: true,
                    module: {
                      select: {
                        id: true,
                        title: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    console.log(
      `[ReadingProgress] Found ${usersWithProgress.length} users with reading progress`,
    );

    // Get all modules with their sub-materis and poins
    const allModules = await prisma.module.findMany({
      where: { published: true },
      select: {
        id: true,
        title: true,
        subMateris: {
          select: {
            id: true,
            title: true,
            poinDetails: {
              select: {
                id: true,
                title: true,
              },
            },
          },
          orderBy: {
            order_index: "asc",
          },
        },
      },
      orderBy: {
        created_at: "asc",
      },
    });

    console.log(`[ReadingProgress] Total modules: ${allModules.length}`);

    // Build reading progress data
    const readingProgressData: Array<{
      user_id: string;
      user_name: string;
      user_email: string;
      module_id: string;
      module_title: string;
      sub_materis: Array<{
        sub_materi_id: string;
        sub_materi_title: string;
        total_poins: number;
        read_poins: number;
        scroll_completed_poins: number;
        read_percentage: number;
      }>;
      total_poins: number;
      read_poins: number;
      scroll_completed_poins: number;
      read_percentage: number;
    }> = [];

    // Process each user
    for (const user of usersWithProgress) {
      // Group user's poin progress by module
      const moduleProgressMap = new Map<
        string,
        {
          module_id: string;
          module_title: string;
          sub_materis: Map<
            string,
            {
              sub_materi_id: string;
              sub_materi_title: string;
              read_poins: Set<string>;
              scroll_completed_poins: Set<string>;
            }
          >;
        }
      >();

      // Build progress map from user's poin progress
      for (const progress of user.poinProgress) {
        const poinDetail = progress.poinDetail;
        if (!poinDetail?.subMateri?.module) continue;

        const moduleId = poinDetail.subMateri.module.id;
        const moduleTitle = poinDetail.subMateri.module.title;
        const subMateriId = poinDetail.subMateri.id;
        const subMateriTitle = poinDetail.subMateri.title;

        if (!moduleProgressMap.has(moduleId)) {
          moduleProgressMap.set(moduleId, {
            module_id: moduleId,
            module_title: moduleTitle,
            sub_materis: new Map(),
          });
        }

        const moduleProgress = moduleProgressMap.get(moduleId)!;

        if (!moduleProgress.sub_materis.has(subMateriId)) {
          moduleProgress.sub_materis.set(subMateriId, {
            sub_materi_id: subMateriId,
            sub_materi_title: subMateriTitle,
            read_poins: new Set(),
            scroll_completed_poins: new Set(),
          });
        }

        const subMateriProgress = moduleProgress.sub_materis.get(subMateriId)!;

        if (progress.is_completed) {
          subMateriProgress.read_poins.add(progress.poin_id);
        }
        if (progress.scroll_completed) {
          subMateriProgress.scroll_completed_poins.add(progress.poin_id);
        }
      }

      // Calculate statistics for each module
      for (const module of allModules) {
        const moduleProgress = moduleProgressMap.get(module.id);

        // Calculate total poins in this module
        const totalPoins = module.subMateris.reduce(
          (sum, sm) => sum + sm.poinDetails.length,
          0,
        );

        if (totalPoins === 0) continue; // Skip modules with no poins

        // Build sub-materi statistics
        const subMateriStats = module.subMateris.map((subMateri) => {
          const totalSubMateriPoins = subMateri.poinDetails.length;
          const subMateriProgress = moduleProgress?.sub_materis.get(
            subMateri.id,
          );

          const readPoins = subMateriProgress?.read_poins.size || 0;
          const scrollCompletedPoins =
            subMateriProgress?.scroll_completed_poins.size || 0;
          const readPercentage =
            totalSubMateriPoins > 0
              ? Math.round((scrollCompletedPoins / totalSubMateriPoins) * 100)
              : 0;

          return {
            sub_materi_id: subMateri.id,
            sub_materi_title: subMateri.title,
            total_poins: totalSubMateriPoins,
            read_poins: readPoins,
            scroll_completed_poins: scrollCompletedPoins,
            read_percentage: readPercentage,
          };
        });

        // Calculate module-level statistics
        const totalReadPoins = subMateriStats.reduce(
          (sum, sm) => sum + sm.read_poins,
          0,
        );
        const totalScrollCompletedPoins = subMateriStats.reduce(
          (sum, sm) => sum + sm.scroll_completed_poins,
          0,
        );
        const moduleReadPercentage =
          totalPoins > 0
            ? Math.round((totalScrollCompletedPoins / totalPoins) * 100)
            : 0;

        // Only include if user has some progress in this module
        if (totalScrollCompletedPoins > 0) {
          readingProgressData.push({
            user_id: user.id,
            user_name: user.full_name,
            user_email: user.email || "",
            module_id: module.id,
            module_title: module.title,
            sub_materis: subMateriStats,
            total_poins: totalPoins,
            read_poins: totalReadPoins,
            scroll_completed_poins: totalScrollCompletedPoins,
            read_percentage: moduleReadPercentage,
          });
        }
      }
    }

    console.log(
      `[ReadingProgress] Generated ${readingProgressData.length} reading progress records`,
    );
    console.log("========== [getReadingProgressStats] END ==========\n");

    return readingProgressData;
  } catch (error) {
    console.error("Error in getReadingProgressStats:", error);
    throw error;
  }
};
