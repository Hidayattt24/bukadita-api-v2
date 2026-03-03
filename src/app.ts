import express, { Application } from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";
import path from "path";
import { errorHandler } from "./middlewares/error.middleware";
import logger from "./config/logger";

// Import routes
import authRoutes from "./routes/auth.routes";
import moduleRoutes from "./routes/module.routes";
import quizRoutes from "./routes/quiz.routes";
import materialRoutes from "./routes/material.routes";
import progressRoutes from "./routes/progress.routes";
import adminRoutes from "./routes/admin.routes";
import quizAdminRoutes from "./routes/quiz.admin.routes";
import noteRoutes from "./routes/note.routes";
import userRoutes from "./routes/user.routes";
import whatsappRoutes from "./routes/whatsapp.routes";

const app: Application = express();

// Security middleware
app.use(helmet());

// CORS configuration - support multiple origins (comma-separated)
const getAllowedOrigins = () => {
  const origins: string[] = [];

  // Parse ADMIN_URL (can be comma-separated)
  if (process.env.ADMIN_URL) {
    const adminUrls = process.env.ADMIN_URL.split(",").map((url) => url.trim());
    origins.push(...adminUrls);
  } else {
    origins.push("http://localhost:3000");
  }

  // Parse USER_URL (can be comma-separated)
  if (process.env.USER_URL) {
    const userUrls = process.env.USER_URL.split(",").map((url) => url.trim());
    origins.push(...userUrls);
  } else {
    origins.push("http://localhost:3001");
  }

  return origins;
};

const corsOptions = {
  origin: (
    origin: string | undefined,
    callback: (err: Error | null, allow?: boolean) => void,
  ) => {
    const allowedOrigins = getAllowedOrigins();

    // Allow requests with no origin (like mobile apps, Postman, curl)
    if (!origin) {
      return callback(null, true);
    }

    // Check if origin is in allowed list
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    // Allow all *.vercel.app domains in production
    if (
      process.env.NODE_ENV === "production" &&
      origin.endsWith(".vercel.app")
    ) {
      return callback(null, true);
    }

    // Allow localhost in development
    if (
      process.env.NODE_ENV === "development" &&
      (origin.startsWith("http://localhost") ||
        origin.startsWith("http://127.0.0.1"))
    ) {
      return callback(null, true);
    }

    // Reject other origins
    logger.warn(`CORS: Blocked request from origin: ${origin}`);
    callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  exposedHeaders: ["Content-Range", "X-Content-Range"],
  maxAge: 86400, // 24 hours
};
app.use(cors(corsOptions));

// Body parsing
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Compression
app.use(compression());

// Logging
app.use(
  morgan("combined", {
    stream: { write: (message) => logger.info(message.trim()) },
  }),
);

// Root redirect to health
app.get("/", (req, res) => {
  res.redirect("/api/v1");
});

// Health check
app.get("/health", (req, res) => {
  res.json({
    error: false,
    code: "HEALTH_OK",
    message: "Server is healthy",
    data: {
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
    },
  });
});

// API routes
const API_PREFIX = "/api/v1";

// API documentation endpoint
app.get(`${API_PREFIX}`, (req, res) => {
  const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
  const host = req.get("host");
  const baseUrl = `${protocol}://${host}${API_PREFIX}`;

  res.json({
    error: false,
    code: "API_INFO",
    message:
      "BUKADITA API - Platform Pembelajaran Digital untuk Kader Kesehatan",
    data: {
      name: "BUKADITA API",
      version: "1.0.0",
      description:
        "RESTful API untuk aplikasi pembelajaran kesehatan masyarakat berbasis modul interaktif",
      environment: process.env.NODE_ENV || "development",
      timestamp: new Date().toISOString(),
      documentation: `${baseUrl}/docs`,

      endpoints: {
        // ====================
        // PUBLIC ENDPOINTS
        // ====================
        public: {
          health: {
            check: "GET /health",
            description: "Status kesehatan server dan uptime",
          },

          authentication: {
            register: {
              endpoint: "POST /api/v1/auth/register",
              description: "Registrasi pengguna baru",
            },
            login: {
              endpoint: "POST /api/v1/auth/login",
              description: "Login pengguna biasa",
            },
            adminLogin: {
              endpoint: "POST /api/v1/auth/admin-login",
              description: "Login khusus admin",
            },
            refresh: {
              endpoint: "POST /api/v1/auth/refresh",
              description: "Perbarui access token dengan refresh token",
            },
            passwordReset: {
              request: "POST /api/v1/auth/request-password-reset",
              verify: "POST /api/v1/auth/verify-otp-reset-password",
              resendOTP: "POST /api/v1/auth/resend-otp",
              description: "Fitur reset password dengan OTP",
            },
          },

          modules: {
            list: {
              endpoint: "GET /api/v1/modules",
              description: "Daftar semua modul pembelajaran",
            },
            detail: {
              endpoint: "GET /api/v1/modules/:slug",
              description: "Detail modul berdasarkan slug",
            },
          },

          materials: {
            publicList: {
              endpoint: "GET /api/v1/materials/public",
              description: "Daftar materi yang dapat diakses publik",
            },
            publicDetail: {
              endpoint: "GET /api/v1/materials/:id/public",
              description: "Detail materi publik",
            },
            quiz: {
              endpoint: "GET /api/v1/materials/:id/quiz",
              description: "Kuis terkait materi",
            },
          },
        },

        // ====================
        // PROTECTED ENDPOINTS (Require Authentication)
        // ====================
        protected: {
          profile: {
            get: {
              endpoint: "GET /api/v1/users/me",
              description: "Data profil pengguna yang sedang login",
            },
            update: {
              endpoint: "PUT /api/v1/users/me",
              description: "Update profil pengguna",
            },
            uploadPhoto: {
              endpoint: "POST /api/v1/users/me/profile-photo",
              description: "Upload foto profil",
            },
            deletePhoto: {
              endpoint: "DELETE /api/v1/users/me/profile-photo",
              description: "Hapus foto profil",
            },
            changePassword: {
              endpoint: "POST /api/v1/users/me/change-password",
              description: "Ubah password pengguna",
            },
          },

          progress: {
            modules: {
              endpoint: "GET /api/v1/progress/modules",
              description: "Progress pembelajaran semua modul",
            },
            moduleDetail: {
              endpoint: "GET /api/v1/progress/modules/:id",
              description: "Progress detail per modul",
            },
            subMateri: {
              get: "GET /api/v1/progress/sub-materis/:id",
              complete: "POST /api/v1/progress/sub-materis/:id/complete",
              description: "Progress dan penyelesaian sub-materi",
            },
            poin: {
              complete: "POST /api/v1/progress/poins/:id/complete",
              scrollComplete: "POST /api/v1/progress/poins/:id/scroll-complete",
              scrollStatus: "GET /api/v1/progress/poins/:id/scroll-status",
              description: "Tracking progress poin pembelajaran",
            },
            materialAccess: {
              endpoint: "GET /api/v1/progress/materials/:id/access",
              description: "Cek akses ke materi tertentu",
            },
            quiz: {
              endpoint: "GET /api/v1/progress/quiz/:id",
              description: "Progress kuis",
            },
            stats: {
              endpoint: "GET /api/v1/progress/stats",
              description: "Statistik pembelajaran pengguna",
            },
          },

          quizzes: {
            byModule: {
              endpoint: "GET /api/v1/quizzes/module/:moduleId",
              description: "Daftar kuis dalam modul",
            },
            detail: {
              endpoint: "GET /api/v1/quizzes/:id",
              description: "Detail kuis",
            },
            start: {
              endpoint: "POST /api/v1/quizzes/start",
              description: "Mulai mengerjakan kuis",
            },
            submit: {
              endpoint: "POST /api/v1/quizzes/:id/submit",
              description: "Submit jawaban kuis",
            },
            attempts: {
              me: "GET /api/v1/quizzes/attempts/me",
              my: "GET /api/v1/quizzes/attempts/my",
              description: "Riwayat percobaan kuis pengguna",
            },
          },

          notes: {
            categories: {
              endpoint: "GET /api/v1/notes/categories",
              description: "Kategori catatan pengguna",
            },
            list: {
              endpoint: "GET /api/v1/notes",
              description: "Semua catatan pengguna",
            },
            detail: {
              endpoint: "GET /api/v1/notes/:id",
              description: "Detail catatan",
            },
            create: {
              endpoint: "POST /api/v1/notes",
              description: "Buat catatan baru",
            },
            update: {
              endpoint: "PUT /api/v1/notes/:id",
              description: "Update catatan",
            },
            delete: {
              endpoint: "DELETE /api/v1/notes/:id",
              description: "Hapus catatan",
            },
            pin: {
              endpoint: "PATCH /api/v1/notes/:id/pin",
              description: "Pin/unpin catatan",
            },
          },

          materials: {
            points: {
              endpoint: "GET /api/v1/materials/:id/points",
              description: "Detail poin-poin dalam materi",
            },
          },

          whatsapp: {
            status: {
              endpoint: "GET /api/v1/whatsapp/status",
              description: "Status koneksi WhatsApp",
            },
            qr: {
              endpoint: "GET /api/v1/whatsapp/qr",
              description: "QR Code untuk WhatsApp",
            },
          },
        },

        // ====================
        // ADMIN ENDPOINTS (Require Admin Role)
        // ====================
        admin: {
          dashboard: {
            progressStats: {
              endpoint: "GET /api/v1/admin/progress/stats",
              description: "Statistik progress pembelajaran keseluruhan",
            },
            quizPerformance: {
              endpoint: "GET /api/v1/admin/quiz-performance-detailed",
              description: "Performa kuis detail semua pengguna",
            },
            recentActivities: {
              endpoint: "GET /api/v1/admin/recent-activities-classified",
              description: "Aktivitas terbaru terklasifikasi",
            },
            activityLogs: {
              endpoint: "GET /api/v1/admin/activity-logs",
              description: "Log aktivitas sistem",
            },
          },

          progressMonitoring: {
            stats: {
              endpoint: "GET /api/v1/admin/progress-monitoring/stats",
              description: "Statistik monitoring progress",
            },
            moduleStats: {
              endpoint: "GET /api/v1/admin/progress-monitoring/module-stats",
              description: "Statistik penyelesaian per modul",
            },
            stuckUsers: {
              endpoint:
                "GET /api/v1/admin/progress-monitoring/stuck-users/:moduleId",
              description: "Pengguna yang stuck di modul tertentu",
            },
            usersList: {
              endpoint: "GET /api/v1/admin/progress-monitoring/users",
              description: "Daftar progress semua pengguna",
            },
            userDetail: {
              endpoint: "GET /api/v1/admin/progress-monitoring/users/:userId",
              description: "Detail progress pengguna tertentu",
            },
            readingProgress: {
              endpoint:
                "GET /api/v1/admin/progress-monitoring/reading-progress",
              description: "Statistik progress pembacaan",
            },
          },

          users: {
            list: {
              endpoint: "GET /api/v1/admin/users",
              description: "Daftar semua pengguna",
            },
            create: {
              endpoint: "POST /api/v1/admin/users",
              description: "Buat pengguna baru (Super Admin only)",
            },
            update: {
              endpoint: "PUT /api/v1/admin/users/:userId",
              description: "Update data pengguna",
            },
            delete: {
              endpoint: "DELETE /api/v1/admin/users/:userId",
              description: "Hapus pengguna (Super Admin only)",
            },
            updateRole: {
              endpoint: "PATCH /api/v1/admin/users/:userId/role",
              description: "Update role pengguna (Super Admin only)",
            },
            progress: {
              endpoint: "GET /api/v1/admin/users/:userId/progress",
              description: "Progress pembelajaran pengguna tertentu",
            },
            resetProgress: {
              endpoint: "POST /api/v1/admin/users/:userId/reset-progress",
              description: "Reset progress pengguna",
            },
          },

          modules: {
            create: {
              endpoint: "POST /api/v1/modules",
              description: "Buat modul baru",
            },
            update: {
              endpoint: "PUT /api/v1/modules/:id",
              description: "Update modul",
            },
            delete: {
              endpoint: "DELETE /api/v1/modules/:id",
              description: "Hapus modul",
            },
          },

          materials: {
            list: {
              endpoint: "GET /api/v1/materials",
              description: "Semua materi (admin view)",
            },
            detail: {
              endpoint: "GET /api/v1/materials/:id",
              description: "Detail materi (admin view)",
            },
            create: {
              endpoint: "POST /api/v1/materials",
              description: "Buat materi baru",
            },
            update: {
              endpoint: "PUT /api/v1/materials/:id",
              description: "Update materi",
            },
            delete: {
              endpoint: "DELETE /api/v1/materials/:id",
              description: "Hapus materi",
            },
            subMateri: {
              create: "POST /api/v1/materials/:id/sub-materis",
              update: "PUT /api/v1/materials/:id/sub-materis/:subMateriId",
              delete: "DELETE /api/v1/materials/:id/sub-materis/:subMateriId",
              description: "Manajemen sub-materi",
            },
            poin: {
              create:
                "POST /api/v1/materials/:id/sub-materis/:subMateriId/poins",
              delete:
                "DELETE /api/v1/materials/:id/sub-materis/:subMateriId/poins/:poinId",
              description: "Manajemen poin pembelajaran",
            },
          },

          quizzes: {
            list: {
              endpoint: "GET /api/v1/admin/quizzes",
              description: "Semua kuis dengan statistik",
            },
            detail: {
              endpoint: "GET /api/v1/admin/quizzes/:id",
              description: "Detail kuis dengan pertanyaan",
            },
            create: {
              endpoint: "POST /api/v1/admin/quizzes",
              description: "Buat kuis baru",
            },
            update: {
              endpoint: "PUT /api/v1/admin/quizzes/:id",
              description: "Update kuis",
            },
            delete: {
              endpoint: "DELETE /api/v1/admin/quizzes/:id",
              description: "Hapus kuis",
            },
            questions: {
              create: "POST /api/v1/admin/quizzes/:quizId/questions",
              update: "PUT /api/v1/admin/quizzes/:quizId/questions/:questionId",
              delete: "DELETE /api/v1/admin/quizzes/questions/:questionId",
              reorder: "PUT /api/v1/admin/quizzes/:quizId/questions/order",
              description: "Manajemen pertanyaan kuis",
            },
            attempts: {
              list: "GET /api/v1/admin/quiz-attempts",
              detail: "GET /api/v1/admin/quiz-attempts/:attemptId",
              description: "Monitoring percobaan kuis",
            },
          },
        },
      },

      features: [
        "✓ Autentikasi berbasis JWT dengan refresh token",
        "✓ Role-based access control (User, Admin, Super Admin)",
        "✓ Pembelajaran berbasis modul dan materi terstruktur",
        "✓ Sistem kuis interaktif dengan pelacakan skor",
        "✓ Progress tracking detail untuk setiap pengguna",
        "✓ Catatan pribadi pengguna per modul",
        "✓ Dashboard admin dengan monitoring lengkap",
        "✓ Reset password dengan OTP",
        "✓ Upload foto profil",
        "✓ Integrasi WhatsApp (opsional)",
      ],

      responseFormat: {
        success: {
          error: false,
          code: "SUCCESS_CODE",
          message: "Success message",
          data: "Response data object",
        },
        error: {
          error: true,
          code: "ERROR_CODE",
          message: "Error message description",
          details: "Additional error details (optional)",
        },
      },

      authentication: {
        type: "Bearer Token (JWT)",
        header: "Authorization: Bearer <access_token>",
        tokenExpiry: {
          accessToken: "15 minutes",
          refreshToken: "7 days",
        },
      },

      support: {
        documentation: `${baseUrl}/docs`,
        repository: "Private Repository",
        contact: "Support team",
      },
    },
  });
});

// API Web Documentation
app.get(`${API_PREFIX}/docs`, (req, res) => {
  const docsPath = path.join(__dirname, "views", "api-docs.html");
  res.sendFile(docsPath, (err) => {
    if (err) {
      logger.error("Error serving documentation:", err);
      res.status(404).json({
        error: true,
        code: "DOCS_NOT_FOUND",
        message: "Documentation file not found",
      });
    }
  });
});

// Mount routes
app.use(`${API_PREFIX}/auth`, authRoutes);
app.use(`${API_PREFIX}/modules`, moduleRoutes);
app.use(`${API_PREFIX}/quizzes`, quizRoutes);
app.use(`${API_PREFIX}/kuis`, quizRoutes); // Alias for quizzes
app.use(`${API_PREFIX}/materials`, materialRoutes);
app.use(`${API_PREFIX}/progress`, progressRoutes);
app.use(`${API_PREFIX}/admin`, adminRoutes);
app.use(`${API_PREFIX}/admin/quizzes`, quizAdminRoutes);
app.use(`${API_PREFIX}/notes`, noteRoutes);
app.use(`${API_PREFIX}/users`, userRoutes);
app.use(`${API_PREFIX}/whatsapp`, whatsappRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: true,
    code: "NOT_FOUND",
    message: `Route ${req.method} ${req.url} not found`,
  });
});

// Error handler (must be last)
app.use(errorHandler);

export default app;
