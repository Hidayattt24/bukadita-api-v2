import prisma from "../config/database";
import { PaginationParams, PaginatedResponse } from "../types";

export const getAllModules = async (
  params: PaginationParams & { published?: boolean }
) => {
  const { page = 1, limit = 10, published } = params;
  const skip = (page - 1) * limit;

  const where = published !== undefined ? { published } : {};

  const [items, total] = await Promise.all([
    prisma.module.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      include: {
        creator: {
          select: {
            id: true,
            full_name: true,
            role: true,
          },
        },
        _count: {
          select: {
            subMateris: true,
            quizzes: true,
          },
        },
      },
    }),
    prisma.module.count({ where }),
  ]);

  return {
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  } as PaginatedResponse<any>;
};

export const getModuleBySlug = async (slug: string, userId?: string) => {
  const module = await prisma.module.findUnique({
    where: { slug },
    include: {
      subMateris: {
        orderBy: { order_index: "asc" },
        include: {
          poinDetails: {
            orderBy: { order_index: "asc" },
          },
          quizzes: {
            select: {
              id: true,
              title: true,
              description: true,
              time_limit_seconds: true,
              passing_score: true,
              published: true,
            },
          },
        },
      },
      creator: {
        select: {
          id: true,
          full_name: true,
          role: true,
        },
      },
    },
  });

  if (!module) {
    throw new Error("Module not found");
  }

  // If user is provided, get progress
  if (userId) {
    const progress = await prisma.userModuleProgress.findUnique({
      where: {
        user_id_module_id: {
          user_id: userId,
          module_id: module.id,
        },
      },
    });

    return { ...module, userProgress: progress };
  }

  return module;
};

export const createModule = async (data: {
  title: string;
  slug: string;
  description?: string;
  duration_label?: string;
  duration_minutes?: number;
  lessons?: number;
  category?: string;
  published?: boolean;
  created_by: string;
}) => {
  const module = await prisma.module.create({
    data: {
      ...data,
      published: data.published || false,
    },
  });

  return module;
};

export const updateModule = async (
  id: string,
  data: {
    title?: string;
    slug?: string;
    description?: string;
    duration_label?: string;
    duration_minutes?: number;
    lessons?: number;
    category?: string;
    published?: boolean;
  }
) => {
  const module = await prisma.module.update({
    where: { id },
    data: {
      ...data,
      updated_at: new Date(),
    },
  });

  return module;
};

export const deleteModule = async (id: string) => {
  await prisma.module.delete({
    where: { id },
  });
};
