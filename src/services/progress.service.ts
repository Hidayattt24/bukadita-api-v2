import prisma from "../config/database";
import logger from "../config/logger";

// Get user's modules progress
export const getUserModulesProgress = async (userId: string) => {
  try {
    const progress = await prisma.userModuleProgress.findMany({
      where: {
        user_id: userId,
      },
      include: {
        module: {
          select: {
            id: true,
            title: true,
            slug: true,
            description: true,
            category: true,
            lessons: true,
          },
        },
      },
      orderBy: {
        last_accessed_at: "desc",
      },
    });

    // Calculate overall statistics
    const totalModules = await prisma.module.count({
      where: { published: true },
    });

    const completedModules = progress.filter(
      (p) => p.status === "completed"
    ).length;

    return {
      modules: progress.map((p) => ({
        id: p.id,
        module_id: p.module_id,
        module_title: p.module.title,
        module_slug: p.module.slug,
        progress_percentage: p.progress_percent,
        status: p.status,
        completed: p.status === "completed",
        last_accessed_at: p.last_accessed_at,
        completed_at: p.completed_at,
      })),
      overall_progress: {
        total_modules: totalModules,
        completed_modules: completedModules,
        percentage: totalModules > 0 ? Math.round((completedModules / totalModules) * 100) : 0,
      },
    };
  } catch (error) {
    logger.error("Error fetching user modules progress:", error);
    throw new Error("Failed to fetch modules progress");
  }
};

// Get specific module progress with details
export const getModuleProgress = async (userId: string, moduleId: string) => {
  try {
    // Get or create module progress
    let moduleProgress = await prisma.userModuleProgress.findUnique({
      where: {
        user_id_module_id: {
          user_id: userId,
          module_id: moduleId,
        },
      },
    });

    if (!moduleProgress) {
      moduleProgress = await prisma.userModuleProgress.create({
        data: {
          user_id: userId,
          module_id: moduleId,
          status: "not-started",
          progress_percent: 0,
        },
      });

      // 🔥 FIX: Ensure first sub-materi is unlocked when module is accessed for first time
      const firstSubMateri = await prisma.subMateri.findFirst({
        where: { module_id: moduleId },
        orderBy: { order_index: "asc" },
      });

      if (firstSubMateri) {
        await prisma.userSubMateriProgress.upsert({
          where: {
            user_id_sub_materi_id: {
              user_id: userId,
              sub_materi_id: firstSubMateri.id,
            },
          },
          update: {
            is_unlocked: true,
            updated_at: new Date(),
          },
          create: {
            user_id: userId,
            sub_materi_id: firstSubMateri.id,
            is_unlocked: true,
            is_completed: false,
            current_poin_index: 0,
            progress_percent: 0,
          },
        });
      }
    }

    // Get module with sub-materis and their progress
    const module = await prisma.module.findUnique({
      where: { id: moduleId },
      include: {
        subMateris: {
          orderBy: { order_index: "asc" },
          include: {
            userProgress: {
              where: { user_id: userId },
            },
            poinDetails: {
              orderBy: { order_index: "asc" },
            },
          },
        },
      },
    });

    if (!module) {
      throw new Error("Module not found");
    }

    // 🔥 IMPROVED: Check quiz history and auto-unlock next sub-materi ONLY if previous is completed
    for (let i = 0; i < module.subMateris.length - 1; i++) {
      const currentSub = module.subMateris[i];
      const nextSub = module.subMateris[i + 1];
      
      // Get current sub-materi progress
      const currentProgress = await prisma.userSubMateriProgress.findUnique({
        where: {
          user_id_sub_materi_id: {
            user_id: userId,
            sub_materi_id: currentSub.id,
          },
        },
      });
      
      // ✅ Only unlock next if current is completed
      if (currentProgress?.is_completed) {
        // Ensure next sub-materi is unlocked
        await prisma.userSubMateriProgress.upsert({
          where: {
            user_id_sub_materi_id: {
              user_id: userId,
              sub_materi_id: nextSub.id,
            },
          },
          update: {
            is_unlocked: true,
            updated_at: new Date(),
          },
          create: {
            user_id: userId,
            sub_materi_id: nextSub.id,
            is_unlocked: true,
            is_completed: false,
            current_poin_index: 0,
            progress_percent: 0,
          },
        });
        
        logger.info(`[getModuleProgress] Auto-unlocked next sub-materi ${nextSub.id} because previous sub-materi ${currentSub.id} is completed`);
      } else {
        // ✅ Ensure next sub-materi is LOCKED if previous is not completed
        const nextProgress = await prisma.userSubMateriProgress.findUnique({
          where: {
            user_id_sub_materi_id: {
              user_id: userId,
              sub_materi_id: nextSub.id,
            },
          },
        });
        
        // Only lock if it exists and is not completed (don't lock completed sub-materis)
        if (nextProgress && !nextProgress.is_completed) {
          await prisma.userSubMateriProgress.update({
            where: {
              user_id_sub_materi_id: {
                user_id: userId,
                sub_materi_id: nextSub.id,
              },
            },
            data: {
              is_unlocked: false,
              updated_at: new Date(),
            },
          });
          
          logger.info(`[getModuleProgress] Locked sub-materi ${nextSub.id} because previous sub-materi ${currentSub.id} is not completed`);
        }
      }
    }
    
    // Re-fetch sub-materis with updated progress
    const updatedModule = await prisma.module.findUnique({
      where: { id: moduleId },
      include: {
        subMateris: {
          orderBy: { order_index: "asc" },
          include: {
            userProgress: {
              where: { user_id: userId },
            },
            poinDetails: {
              orderBy: { order_index: "asc" },
            },
          },
        },
      },
    });

    if (!updatedModule) {
      throw new Error("Module not found after update");
    }

    // Calculate detailed progress
    const subMaterisWithProgress = updatedModule.subMateris.map((sm, index) => {
      const userProgress = sm.userProgress[0];
      // 🔥 FIX: First sub-materi should always be unlocked
      const isFirstSubMateri = index === 0;
      const isUnlocked = isFirstSubMateri || userProgress?.is_unlocked || false;
      
      return {
        id: sm.id,
        title: sm.title,
        order_index: sm.order_index,
        is_unlocked: isUnlocked,
        is_completed: userProgress?.is_completed || false,
        progress_percent: userProgress?.progress_percent || 0,
        total_poins: sm.poinDetails.length,
        current_poin_index: userProgress?.current_poin_index || 0,
      };
    });

    return {
      module: {
        id: module.id,
        title: module.title,
        slug: module.slug,
        description: module.description,
      },
      progress: {
        status: moduleProgress.status,
        progress_percent: moduleProgress.progress_percent,
        last_accessed_at: moduleProgress.last_accessed_at,
        completed_at: moduleProgress.completed_at,
      },
      sub_materis: subMaterisWithProgress,
    };
  } catch (error) {
    logger.error("Error fetching module progress:", error);
    throw new Error("Failed to fetch module progress");
  }
};

// Get sub-materi progress
export const getSubMateriProgress = async (userId: string, subMateriId: string) => {
  try {
    let progress = await prisma.userSubMateriProgress.findUnique({
      where: {
        user_id_sub_materi_id: {
          user_id: userId,
          sub_materi_id: subMateriId,
        },
      },
      include: {
        subMateri: {
          include: {
            poinDetails: {
              orderBy: { order_index: "asc" },
              include: {
                userProgress: {
                  where: { user_id: userId },
                },
              },
            },
          },
        },
      },
    });

    if (!progress) {
      // Get sub-materi to check if it's the first one
      const subMateri = await prisma.subMateri.findUnique({
        where: { id: subMateriId },
        select: { order_index: true },
      });

      const isFirstSubMateri = subMateri?.order_index === 0;

      // Create initial progress
      progress = await prisma.userSubMateriProgress.create({
        data: {
          user_id: userId,
          sub_materi_id: subMateriId,
          is_unlocked: isFirstSubMateri, // 🔥 FIX: Unlock if first sub-materi
          is_completed: false,
          current_poin_index: 0,
          progress_percent: 0,
        },
        include: {
          subMateri: {
            include: {
              poinDetails: {
                orderBy: { order_index: "asc" },
                include: {
                  userProgress: {
                    where: { user_id: userId },
                  },
                },
              },
            },
          },
        },
      });
    }

    // 🔥 FIX: Check if this is the first sub-materi and ensure it's unlocked
    const isFirstSubMateri = progress.subMateri.order_index === 0;
    const actualIsUnlocked = isFirstSubMateri || progress.is_unlocked;

    // Map poin details with progress
    const poinsWithProgress = progress.subMateri.poinDetails.map((poin) => ({
      id: poin.id,
      title: poin.title,
      order_index: poin.order_index,
      duration_minutes: poin.duration_minutes,
      is_completed: poin.userProgress.length > 0 ? poin.userProgress[0].is_completed : false,
    }));

    return {
      id: progress.id,
      user_id: progress.user_id,
      sub_materi_id: progress.sub_materi_id,
      is_unlocked: actualIsUnlocked, // 🔥 FIX: Use calculated value
      is_completed: progress.is_completed,
      current_poin_index: progress.current_poin_index,
      progress_percent: progress.progress_percent,
      last_accessed_at: progress.last_accessed_at,
      completed_at: progress.completed_at,
      poin_details: poinsWithProgress,
    };
  } catch (error) {
    logger.error("Error fetching sub-materi progress:", error);
    throw new Error("Failed to fetch sub-materi progress");
  }
};

// Complete sub-materi
export const completeSubMateri = async (
  userId: string,
  subMateriId: string,
  moduleId?: string
) => {
  try {
    // Get sub-materi to find module_id if not provided
    const subMateri = await prisma.subMateri.findUnique({
      where: { id: subMateriId },
      select: { module_id: true },
    });

    if (!subMateri) {
      throw new Error("Sub-materi not found");
    }

    const finalModuleId = moduleId || subMateri.module_id;

    // Update sub-materi progress
    const subMateriProgress = await prisma.userSubMateriProgress.upsert({
      where: {
        user_id_sub_materi_id: {
          user_id: userId,
          sub_materi_id: subMateriId,
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
        sub_materi_id: subMateriId,
        is_unlocked: true,
        is_completed: true,
        progress_percent: 100,
        completed_at: new Date(),
      },
    });

    // Update module progress
    await updateModuleProgress(userId, finalModuleId);

    // Unlock next sub-materi
    await unlockNextSubMateri(userId, finalModuleId, subMateriId);

    return subMateriProgress;
  } catch (error) {
    logger.error("Error completing sub-materi:", error);
    throw new Error("Failed to complete sub-materi");
  }
};

// Check material access
export const checkMaterialAccess = async (userId: string, subMateriId: string) => {
  try {
    const progress = await prisma.userSubMateriProgress.findUnique({
      where: {
        user_id_sub_materi_id: {
          user_id: userId,
          sub_materi_id: subMateriId,
        },
      },
    });

    // Get sub-materi details
    const subMateri = await prisma.subMateri.findUnique({
      where: { id: subMateriId },
      include: {
        module: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    if (!subMateri) {
      throw new Error("Sub-materi not found");
    }

    // Check if it's the first sub-materi in the module
    const isFirst = subMateri.order_index === 0;

    const canAccess = isFirst || (progress?.is_unlocked || false);

    return {
      can_access: canAccess,
      sub_materi_id: subMateriId,
      is_unlocked: isFirst || (progress?.is_unlocked || false), // 🔥 FIX: First sub-materi always unlocked
      reason: canAccess
        ? "Access granted"
        : "Complete previous sub-materi to unlock",
    };
  } catch (error) {
    logger.error("Error checking material access:", error);
    throw new Error("Failed to check material access");
  }
};

// Complete poin
export const completePoin = async (userId: string, poinId: string) => {
  try {
    const poinProgress = await prisma.userPoinProgress.upsert({
      where: {
        user_id_poin_id: {
          user_id: userId,
          poin_id: poinId,
        },
      },
      update: {
        is_completed: true,
        completed_at: new Date(),
      },
      create: {
        user_id: userId,
        poin_id: poinId,
        is_completed: true,
        completed_at: new Date(),
      },
    });

    // Get poin detail to update sub-materi progress
    const poin = await prisma.poinDetail.findUnique({
      where: { id: poinId },
    });

    if (poin) {
      await updateSubMateriProgress(userId, poin.sub_materi_id);
    }

    return poinProgress;
  } catch (error) {
    logger.error("Error completing poin:", error);
    throw new Error("Failed to complete poin");
  }
};

// Get quiz progress
export const getQuizProgress = async (userId: string, quizId: string) => {
  try {
    const attempts = await prisma.quizAttempt.findMany({
      where: {
        user_id: userId,
        quiz_id: quizId,
      },
      orderBy: {
        created_at: "desc",
      },
      take: 10,
    });

    const bestScore = attempts.length > 0
      ? Math.max(...attempts.map((a) => Number(a.score)))
      : 0;

    const passed = attempts.some((a) => a.passed);

    return {
      quiz_id: quizId,
      attempts_count: attempts.length,
      best_score: bestScore,
      passed,
      last_attempt: attempts.length > 0 ? attempts[0] : null,
      recent_attempts: attempts.slice(0, 5),
    };
  } catch (error) {
    logger.error("Error fetching quiz progress:", error);
    throw new Error("Failed to fetch quiz progress");
  }
};

// Get user statistics
export const getUserStats = async (userId: string) => {
  try {
    const [
      totalModules,
      completedModules,
      totalSubMateris,
      completedSubMateris,
      totalQuizAttempts,
      passedQuizzes,
    ] = await Promise.all([
      prisma.module.count({ where: { published: true } }),
      prisma.userModuleProgress.count({
        where: { user_id: userId, status: "completed" },
      }),
      prisma.subMateri.count({ where: { published: true } }),
      prisma.userSubMateriProgress.count({
        where: { user_id: userId, is_completed: true },
      }),
      prisma.quizAttempt.count({ where: { user_id: userId } }),
      prisma.quizAttempt.count({
        where: { user_id: userId, passed: true },
      }),
    ]);

    // Calculate average quiz score
    const quizAttempts = await prisma.quizAttempt.findMany({
      where: { user_id: userId },
      select: { score: true },
    });

    const averageScore = quizAttempts.length > 0
      ? quizAttempts.reduce((sum, a) => sum + Number(a.score), 0) / quizAttempts.length
      : 0;

    return {
      total_modules: totalModules,
      completed_modules: completedModules,
      module_completion_rate: totalModules > 0
        ? Math.round((completedModules / totalModules) * 100)
        : 0,
      total_materials: totalSubMateris,
      completed_materials: completedSubMateris,
      material_completion_rate: totalSubMateris > 0
        ? Math.round((completedSubMateris / totalSubMateris) * 100)
        : 0,
      total_quiz_attempts: totalQuizAttempts,
      passed_quizzes: passedQuizzes,
      average_quiz_score: Math.round(averageScore),
    };
  } catch (error) {
    logger.error("Error fetching user stats:", error);
    throw new Error("Failed to fetch user statistics");
  }
};

// Admin: Get all users progress for monitoring
export const getAllUsersProgress = async (params: {
  page: number;
  limit: number;
  search: string;
}) => {
  try {
    const { page, limit, search } = params;
    const skip = (page - 1) * limit;

    // Build where clause for search
    const whereClause = search
      ? {
        OR: [
          { full_name: { contains: search, mode: "insensitive" as const } },
          { email: { contains: search, mode: "insensitive" as const } },
          { phone: { contains: search, mode: "insensitive" as const } },
        ],
        role: "pengguna", // Only show regular users, not admins
      }
      : {
        role: "pengguna",
      };

    // Get users with their progress
    const [users, total] = await Promise.all([
      prisma.profile.findMany({
        where: whereClause,
        select: {
          id: true,
          email: true,
          full_name: true,
          phone: true,
          created_at: true,
        },
        skip,
        take: limit,
        orderBy: {
          created_at: "desc",
        },
      }),
      prisma.profile.count({ where: whereClause }),
    ]);

    // Get progress for each user
    const usersWithProgress = await Promise.all(
      users.map(async (user) => {
        const [moduleProgress, quizAttempts, lastActivity] = await Promise.all([
          prisma.userModuleProgress.findMany({
            where: { user_id: user.id },
            select: {
              status: true,
              progress_percent: true,
              last_accessed_at: true,
              module: {
                select: {
                  title: true,
                },
              },
            },
          }),
          prisma.quizAttempt.findMany({
            where: { user_id: user.id },
            select: {
              score: true,
              passed: true,
              created_at: true,
            },
            orderBy: {
              created_at: "desc",
            },
            take: 1,
          }),
          prisma.userModuleProgress.findFirst({
            where: { user_id: user.id },
            orderBy: {
              last_accessed_at: "desc",
            },
            select: {
              last_accessed_at: true,
            },
          }),
        ]);

        const completedModules = moduleProgress.filter(
          (p) => p.status === "completed"
        ).length;
        const inProgressModules = moduleProgress.filter(
          (p) => p.status === "in-progress"
        ).length;
        const totalModulesAccessed = moduleProgress.length;

        const passedQuizzes = await prisma.quizAttempt.count({
          where: { user_id: user.id, passed: true },
        });

        const totalQuizAttempts = await prisma.quizAttempt.count({
          where: { user_id: user.id },
        });

        return {
          id: user.id,
          email: user.email,
          full_name: user.full_name,
          phone: user.phone,
          registered_at: user.created_at,
          last_activity: lastActivity?.last_accessed_at || null,
          progress: {
            modules_accessed: totalModulesAccessed,
            modules_in_progress: inProgressModules,
            modules_completed: completedModules,
            quiz_attempts: totalQuizAttempts,
            quizzes_passed: passedQuizzes,
            last_quiz_score: quizAttempts[0]?.score || null,
            last_quiz_passed: quizAttempts[0]?.passed || false,
          },
        };
      })
    );

    return {
      users: usersWithProgress,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  } catch (error) {
    logger.error("Error fetching all users progress:", error);
    throw new Error("Failed to fetch all users progress");
  }
};

// Helper: Update module progress
export async function updateModuleProgress(userId: string, moduleId: string) {
  const subMateris = await prisma.subMateri.findMany({
    where: { module_id: moduleId },
    include: {
      userProgress: {
        where: { user_id: userId },
      },
    },
  });

  const totalSubMateris = subMateris.length;
  const completedSubMateris = subMateris.filter(
    (sm) => sm.userProgress[0]?.is_completed
  ).length;

  const progressPercent = totalSubMateris > 0
    ? Math.round((completedSubMateris / totalSubMateris) * 100)
    : 0;

  const status =
    progressPercent === 0 ? "not-started" :
      progressPercent === 100 ? "completed" :
        "in-progress";

  await prisma.userModuleProgress.upsert({
    where: {
      user_id_module_id: {
        user_id: userId,
        module_id: moduleId,
      },
    },
    update: {
      status,
      progress_percent: progressPercent,
      completed_at: status === "completed" ? new Date() : null,
      last_accessed_at: new Date(),
      updated_at: new Date(),
    },
    create: {
      user_id: userId,
      module_id: moduleId,
      status,
      progress_percent: progressPercent,
      completed_at: status === "completed" ? new Date() : null,
    },
  });
}

// Helper: Update sub-materi progress
export async function updateSubMateriProgress(userId: string, subMateriId: string) {
  const poins = await prisma.poinDetail.findMany({
    where: { sub_materi_id: subMateriId },
    include: {
      userProgress: {
        where: { user_id: userId },
      },
    },
  });

  const totalPoins = poins.length;
  const completedPoins = poins.filter(
    (p) => p.userProgress[0]?.is_completed
  ).length;

  const progressPercent = totalPoins > 0
    ? Math.round((completedPoins / totalPoins) * 100)
    : 0;

  await prisma.userSubMateriProgress.upsert({
    where: {
      user_id_sub_materi_id: {
        user_id: userId,
        sub_materi_id: subMateriId,
      },
    },
    update: {
      progress_percent: progressPercent,
      current_poin_index: completedPoins,
      updated_at: new Date(),
    },
    create: {
      user_id: userId,
      sub_materi_id: subMateriId,
      is_unlocked: true,
      progress_percent: progressPercent,
      current_poin_index: completedPoins,
    },
  });
}

// Helper: Unlock next sub-materi
export async function unlockNextSubMateri(
  userId: string,
  moduleId: string,
  currentSubMateriId: string
) {
  const currentSubMateri = await prisma.subMateri.findUnique({
    where: { id: currentSubMateriId },
  });

  if (!currentSubMateri) return;

  const nextSubMateri = await prisma.subMateri.findFirst({
    where: {
      module_id: moduleId,
      order_index: currentSubMateri.order_index + 1,
    },
  });

  if (nextSubMateri) {
    await prisma.userSubMateriProgress.upsert({
      where: {
        user_id_sub_materi_id: {
          user_id: userId,
          sub_materi_id: nextSubMateri.id,
        },
      },
      update: {
        is_unlocked: true,
        updated_at: new Date(),
      },
      create: {
        user_id: userId,
        sub_materi_id: nextSubMateri.id,
        is_unlocked: true,
        is_completed: false,
        current_poin_index: 0,
        progress_percent: 0,
      },
    });
  }
}

// Mark poin as scroll completed (user reached 100% scroll)
export const markPoinScrollCompleted = async (userId: string, poinId: string) => {
  try {
    logger.info(`[markPoinScrollCompleted] User ${userId} completed scrolling poin ${poinId}`);

    // Check if already marked as scroll completed
    const existingProgress = await prisma.userPoinProgress.findUnique({
      where: {
        user_id_poin_id: {
          user_id: userId,
          poin_id: poinId,
        },
      },
    }) as any; // Type assertion until Prisma regenerated

    // Only update if not already scroll completed (first time reaching 100%)
    if (existingProgress?.scroll_completed) {
      logger.info(`[markPoinScrollCompleted] Poin ${poinId} already marked as scroll completed`);
      return {
        success: true,
        already_completed: true,
        scroll_completed_at: existingProgress.scroll_completed_at,
      };
    }

    // Update or create progress with scroll completion
    const progress = await prisma.userPoinProgress.upsert({
      where: {
        user_id_poin_id: {
          user_id: userId,
          poin_id: poinId,
        },
      },
      update: {
        scroll_completed: true,
        scroll_completed_at: new Date(),
      } as any, // Type assertion until Prisma regenerated
      create: {
        user_id: userId,
        poin_id: poinId,
        scroll_completed: true,
        scroll_completed_at: new Date(),
        is_completed: false, // Scroll completion doesn't mean poin is completed
      } as any, // Type assertion until Prisma regenerated
    }) as any;

    logger.info(`[markPoinScrollCompleted] Successfully marked poin ${poinId} as scroll completed`);

    return {
      success: true,
      already_completed: false,
      scroll_completed_at: progress.scroll_completed_at,
    };
  } catch (error) {
    logger.error("[markPoinScrollCompleted] Error:", error);
    throw new Error("Failed to mark poin as scroll completed");
  }
};

// Get poin scroll status
export const getPoinScrollStatus = async (userId: string, poinId: string) => {
  try {
    const progress = await prisma.userPoinProgress.findUnique({
      where: {
        user_id_poin_id: {
          user_id: userId,
          poin_id: poinId,
        },
      },
      select: {
        scroll_completed: true,
        scroll_completed_at: true,
      } as any, // Type assertion until Prisma regenerated
    }) as any;

    return {
      scroll_completed: progress?.scroll_completed || false,
      scroll_completed_at: progress?.scroll_completed_at || null,
    };
  } catch (error) {
    logger.error("[getPoinScrollStatus] Error:", error);
    throw new Error("Failed to get poin scroll status");
  }
};
