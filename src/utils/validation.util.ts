import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  full_name: z.string().min(1, "Full name is required"),
  phone: z
    .string()
    .regex(/^(\+62|62|0)[0-9]{9,12}$/, "Invalid phone number")
    .optional(),
});

export const loginSchema = z.object({
  identifier: z.string().min(1, "Email or phone is required"),
  password: z.string().min(1, "Password is required"),
});

export const createModuleSchema = z.object({
  title: z.string().min(1, "Title is required"),
  slug: z.string().regex(/^[a-z0-9-]+$/, "Slug must be lowercase with hyphens").optional(),
  description: z.string().optional(),
  duration_label: z.string().optional(),
  duration_minutes: z.number().int().min(0).optional(),
  lessons: z.number().int().min(0).optional(),
  category: z.string().optional(),
  published: z.boolean().optional(),
});

export const createQuizSchema = z.object({
  module_id: z.string().uuid(),
  sub_materi_id: z.string().uuid(),
  title: z.string().optional(),
  description: z.string().optional(),
  time_limit_seconds: z.number().int().min(60).optional(),
  passing_score: z.number().int().min(0).max(100).optional(),
  published: z.boolean().optional(),
});

export const submitQuizSchema = z.object({
  quiz_id: z.string().uuid(),
  answers: z.array(
    z.object({
      question_id: z.string().uuid(),
      selected_option_index: z.number().int().min(0),
    })
  ),
});

// Material schemas
export const createMaterialSchema = z.object({
  module_id: z.string().uuid("Invalid module ID"),
  title: z.string().min(1, "Title is required"),
  content: z.string().optional(),
  order_index: z.number().int().min(0).optional(),
  published: z.boolean().optional(),
});

export const updateMaterialSchema = z.object({
  title: z.string().min(1, "Title is required").optional(),
  content: z.string().optional(),
  order_index: z.number().int().min(0).optional(),
  published: z.boolean().optional(),
});

export const createPoinDetailSchema = z.object({
  sub_materi_id: z.string().uuid("Invalid sub-materi ID"),
  title: z.string().min(1, "Title is required"),
  content_html: z.string().optional(),
  duration_label: z.string().optional(),
  duration_minutes: z.number().int().min(1).optional(),
  order_index: z.number().int().min(0).optional(),
});

// User management schemas
export const createUserSchema = z
  .object({
    email: z.string().email("Invalid email format").optional(),
    password: z.string().min(6, "Password must be at least 6 characters"),
    full_name: z.string().min(1, "Full name is required"),
    phone: z
      .string()
      .regex(
        /^(\+62|62|0)[0-9]{9,12}$/,
        "Invalid phone number. Use format: 08xxx or +62xxx"
      )
      .optional(),
    role: z.enum(["pengguna", "admin"]).optional().default("pengguna"),
  })
  .refine((data) => data.email || data.phone, {
    message: "Either email or phone must be provided",
    path: ["email"],
  });

export const updateUserSchema = z.object({
  full_name: z.string().min(1, "Full name is required").optional(),
  phone: z
    .string()
    .regex(
      /^(\+62|62|0)[0-9]{9,12}$/,
      "Invalid phone number. Use format: 08xxx or +62xxx"
    )
    .optional(),
  address: z.string().max(500).optional(),
  date_of_birth: z.string().optional(),
  profil_url: z.string().url("Invalid URL format").optional(),
});

// Quiz admin schemas
export const createQuizAdminSchema = z.object({
  module_id: z.string().uuid("Invalid module ID"),
  sub_materi_id: z.string().uuid("Invalid sub-materi ID").optional(),
  title: z.string().min(1, "Title is required").optional(),
  description: z.string().optional(),
  time_limit_seconds: z.number().int().min(60).optional(),
  passing_score: z.number().int().min(0).max(100).optional(),
  quiz_type: z.enum(["module", "sub_materi"]).optional(),
  published: z.boolean().optional(),
});

export const updateQuizAdminSchema = z.object({
  title: z.string().min(1, "Title is required").optional(),
  description: z.string().optional(),
  time_limit_seconds: z.number().int().min(60).optional(),
  passing_score: z.number().int().min(0).max(100).optional(),
  quiz_type: z.enum(["module", "sub_materi"]).optional(),
  published: z.boolean().optional(),
});

export const createQuestionSchema = z.object({
  question_text: z.string().min(1, "Question text is required"),
  options: z.array(z.string()).min(2, "At least 2 options are required"),
  correct_answer_index: z.number().int().min(0),
  explanation: z.string().optional(),
  order_index: z.number().int().min(0).optional(),
});

export const updateQuestionSchema = z.object({
  question_text: z.string().min(1, "Question text is required").optional(),
  options: z
    .array(z.string())
    .min(2, "At least 2 options are required")
    .optional(),
  correct_answer_index: z.number().int().min(0).optional(),
  explanation: z.string().optional(),
  order_index: z.number().int().min(0).optional(),
});
