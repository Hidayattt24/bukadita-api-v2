import prisma from "../config/database";
import logger from "../config/logger";
import supabaseAdmin from "../config/supabase";

// Admin: Get all materials by module (including unpublished)
export const getAllMaterials = async (
  moduleId: string,
  page: number = 1,
  limit: number = 10
) => {
  try {
    const skip = (page - 1) * limit;

    const [materials, total] = await Promise.all([
      prisma.subMateri.findMany({
        where: {
          module_id: moduleId,
        },
        orderBy: {
          order_index: "asc",
        },
        skip,
        take: limit,
        include: {
          _count: {
            select: {
              poinDetails: true,
              quizzes: true,
            },
          },
        },
      }),
      prisma.subMateri.count({
        where: {
          module_id: moduleId,
        },
      }),
    ]);

    return {
      items: materials,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  } catch (error) {
    logger.error("Error fetching all materials:", error);
    throw new Error("Failed to fetch materials");
  }
};

// Get public materials by module
export const getPublicMaterials = async (
  moduleId: string,
  page: number = 1,
  limit: number = 10
) => {
  try {
    const skip = (page - 1) * limit;

    const [materials, total] = await Promise.all([
      prisma.subMateri.findMany({
        where: {
          module_id: moduleId,
          published: true,
        },
        orderBy: {
          order_index: "asc",
        },
        skip,
        take: limit,
      }),
      prisma.subMateri.count({
        where: {
          module_id: moduleId,
          published: true,
        },
      }),
    ]);

    return {
      items: materials,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  } catch (error) {
    logger.error("Error fetching public materials:", error);
    throw new Error("Failed to fetch materials");
  }
};

// Get material detail
export const getMaterialDetail = async (materialId: string) => {
  try {
    const material = await prisma.subMateri.findUnique({
      where: { id: materialId },
      include: {
        module: {
          select: {
            id: true,
            title: true,
            slug: true,
          },
        },
        poinDetails: {
          orderBy: {
            order_index: "asc",
          },
          include: {
            // @ts-ignore - Prisma client will be regenerated, media relation exists
            media: {
              orderBy: {
                created_at: "asc",
              },
            },
          },
        },
        quizzes: {
          where: {
            published: true,
          },
          select: {
            id: true,
            title: true,
            description: true,
            time_limit_seconds: true,
            passing_score: true,
            quiz_type: true,
          },
        },
      },
    });

    if (!material) {
      return null;
    }

    // Transform media field to poin_media for frontend compatibility
    const transformedMaterial = {
      ...material,
      poin_details: material.poinDetails.map((poin: any) => ({
        ...poin,
        poin_media:
          poin.media?.map((m: any) => ({
            id: m.id,
            poin_detail_id: m.poin_detail_id,
            file_url: m.media_url,
            media_url: m.media_url, // Keep both for compatibility
            mime_type: m.media_type,
            media_type: m.media_type, // Keep both for compatibility
            original_filename: m.storage_path?.split("/").pop() || "media",
            file_size: 0, // Not stored yet
            storage_path: m.storage_path,
            created_at: m.created_at,
          })) || [],
        media: undefined, // Remove original media field
      })),
      poinDetails: undefined, // Remove original poinDetails field
    };

    return transformedMaterial;
  } catch (error) {
    logger.error("Error fetching material detail:", error);
    throw new Error("Failed to fetch material detail");
  }
};

// Get poin details with user progress
export const getPoinDetails = async (materialId: string, userId: string) => {
  try {
    const poinDetails = await prisma.poinDetail.findMany({
      where: {
        sub_materi_id: materialId,
      },
      orderBy: {
        order_index: "asc",
      },
      include: {
        userProgress: {
          where: {
            user_id: userId,
          },
        },
        // @ts-ignore - Prisma client will be regenerated, media relation exists
        media: {
          orderBy: {
            created_at: "asc",
          },
        },
      },
    });

    // Transform to include progress status and media
    return poinDetails.map((poin) => ({
      id: poin.id,
      sub_materi_id: poin.sub_materi_id,
      title: poin.title,
      content_html: poin.content_html,
      duration_label: poin.duration_label,
      duration_minutes: poin.duration_minutes,
      order_index: poin.order_index,
      is_completed:
        poin.userProgress.length > 0
          ? poin.userProgress[0].is_completed
          : false,
      completed_at:
        poin.userProgress.length > 0 ? poin.userProgress[0].completed_at : null,
      media: poin.media,
    }));
  } catch (error) {
    logger.error("Error fetching poin details:", error);
    throw new Error("Failed to fetch poin details");
  }
};

// Get quiz for a material
export const getMaterialQuiz = async (materialId: string) => {
  try {
    const quiz = await prisma.materisQuiz.findFirst({
      where: {
        sub_materi_id: materialId,
        published: true,
      },
      include: {
        questions: {
          orderBy: {
            order_index: "asc",
          },
          select: {
            id: true,
            question_text: true,
            options: true,
            explanation: true,
            order_index: true,
            // Don't include correct_answer_index for security
          },
        },
      },
    });

    if (!quiz) {
      return { quiz: null };
    }

    return {
      quiz: {
        id: quiz.id,
        title: quiz.title,
        description: quiz.description,
        time_limit_seconds: quiz.time_limit_seconds,
        passing_score: quiz.passing_score,
        questions: quiz.questions,
      },
    };
  } catch (error) {
    logger.error("Error fetching material quiz:", error);
    throw new Error("Failed to fetch material quiz");
  }
};

// Admin: Create material
export const createMaterial = async (
  data: {
    module_id: string;
    title: string;
    content?: string;
    order_index?: number;
    published?: boolean;
  },
  userId: string
) => {
  try {
    const material = await prisma.subMateri.create({
      data: {
        module_id: data.module_id,
        title: data.title,
        content: data.content,
        order_index: data.order_index || 0,
        published: data.published || false,
      },
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        user_id: userId,
        action: "create_material",
        resource_type: "sub_materi",
        resource_id: material.id,
        details: {
          title: material.title,
          module_id: material.module_id,
        },
      },
    });

    return material;
  } catch (error) {
    logger.error("Error creating material:", error);
    throw new Error("Failed to create material");
  }
};

// Admin: Update material
export const updateMaterial = async (
  materialId: string,
  data: {
    title?: string;
    content?: string;
    order_index?: number;
    published?: boolean;
  },
  userId: string
) => {
  try {
    const material = await prisma.subMateri.update({
      where: { id: materialId },
      data: {
        ...data,
        updated_at: new Date(),
      },
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        user_id: userId,
        action: "update_material",
        resource_type: "sub_materi",
        resource_id: material.id,
        details: {
          changes: data,
        },
      },
    });

    return material;
  } catch (error) {
    logger.error("Error updating material:", error);
    throw new Error("Failed to update material");
  }
};

// Admin: Delete material
export const deleteMaterial = async (materialId: string) => {
  try {
    const material = await prisma.subMateri.delete({
      where: { id: materialId },
    });

    return material;
  } catch (error) {
    logger.error("Error deleting material:", error);
    throw new Error("Failed to delete material");
  }
};

// Admin: Create poin detail
export const createPoinDetail = async (data: {
  sub_materi_id: string;
  title: string;
  content_html?: string;
  duration_label?: string;
  duration_minutes?: number;
  order_index?: number;
}) => {
  try {
    const poinDetail = await prisma.poinDetail.create({
      data: {
        sub_materi_id: data.sub_materi_id,
        title: data.title,
        content_html: data.content_html,
        duration_label: data.duration_label,
        duration_minutes: data.duration_minutes || 5,
        order_index: data.order_index || 0,
      },
    });

    return poinDetail;
  } catch (error) {
    logger.error("Error creating poin detail:", error);
    throw new Error("Failed to create poin detail");
  }
};

// Admin: Update poin detail
export const updatePoinDetail = async (
  poinId: string,
  data: {
    title?: string;
    content_html?: string;
    duration_label?: string;
    duration_minutes?: number;
    order_index?: number;
  }
) => {
  try {
    const poinDetail = await prisma.poinDetail.update({
      where: { id: poinId },
      data: {
        ...data,
        updated_at: new Date(),
      },
    });

    return poinDetail;
  } catch (error) {
    logger.error("Error updating poin detail:", error);
    throw new Error("Failed to update poin detail");
  }
};

// Admin: Delete poin detail
export const deletePoinDetail = async (poinId: string) => {
  try {
    const poinDetail = await prisma.poinDetail.delete({
      where: { id: poinId },
    });

    return poinDetail;
  } catch (error) {
    logger.error("Error deleting poin detail:", error);
    throw new Error("Failed to delete poin detail");
  }
};

// Admin: Upload media to poin detail
export const uploadMediaToPoin = async (
  poinId: string,
  file: Express.Multer.File,
  mimeType: string
) => {
  try {
    // Verify poin exists
    const poin = await prisma.poinDetail.findUnique({
      where: { id: poinId },
    });

    if (!poin) {
      throw new Error("Poin detail not found");
    }

    // Determine folder based on mime type
    let folder = "files";
    if (mimeType.startsWith("image/")) {
      folder = "images";
    } else if (mimeType.startsWith("video/")) {
      folder = "videos";
    } else if (mimeType.startsWith("audio/")) {
      folder = "audios";
    }

    // Generate unique filename
    const timestamp = Date.now();
    const originalName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, "_");
    const fileName = `${timestamp}-${originalName}`;
    const bucketName = "learning-media";
    const filePath = `${folder}/${poinId}/${fileName}`;

    // Upload to Supabase Storage
    const { data, error } = await supabaseAdmin.storage
      .from(bucketName)
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });

    if (error) {
      logger.error("Supabase upload error:", error);
      throw new Error(`Failed to upload file: ${error.message}`);
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabaseAdmin.storage.from(bucketName).getPublicUrl(filePath);

    // Create media record
    // @ts-ignore - Prisma client will be regenerated, media model exists in schema
    const media = await prisma.media.create({
      data: {
        poin_detail_id: poinId,
        media_type: mimeType,
        media_url: publicUrl,
        storage_path: filePath,
      },
    });

    logger.info(`Media uploaded successfully for poin ${poinId}:`, {
      mediaId: media.id,
      type: mimeType,
    });

    return media;
  } catch (error) {
    logger.error("Error uploading media to poin:", error);
    throw error;
  }
};

// Admin: Delete media from poin detail
export const deleteMediaFromPoin = async (mediaId: string) => {
  try {
    // @ts-ignore - Prisma client will be regenerated, media model exists in schema
    const media = await prisma.media.findUnique({
      where: { id: mediaId },
    });

    if (!media) {
      throw new Error("Media not found");
    }

    // Delete from Supabase Storage
    if (media.storage_path) {
      const { error } = await supabaseAdmin.storage
        .from("learning-media")
        .remove([media.storage_path]);

      if (error) {
        logger.error("Supabase delete error:", error);
        // Continue to delete record even if storage deletion fails
      }
    }

    // Delete from database
    // @ts-ignore - Prisma client will be regenerated, media model exists in schema
    await prisma.media.delete({
      where: { id: mediaId },
    });

    return media;
  } catch (error) {
    logger.error("Error deleting media:", error);
    throw error;
  }
};
