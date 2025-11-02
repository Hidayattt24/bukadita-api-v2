import express, { Application } from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";
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

const app: Application = express();

// Security middleware
app.use(helmet());

// CORS configuration
const corsOptions = {
  origin: [
    process.env.ADMIN_URL || "http://localhost:3000",
    process.env.USER_URL || "http://localhost:3001",
  ],
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
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
  })
);

// Root redirect to health
app.get("/", (req, res) => {
  res.redirect("/health");
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
  res.json({
    error: false,
    code: "API_INFO",
    message: "BUKADITA API v2 - Learning Platform for Community Health Cadres",
    data: {
      version: "2.0.0",
      environment: process.env.NODE_ENV,
      endpoints: {
        public: {
          health: "GET /health",
          auth: {
            register: "POST /api/v1/auth/register",
            login: "POST /api/v1/auth/login",
            refresh: "POST /api/v1/auth/refresh",
          },
          modules: {
            list: "GET /api/v1/modules",
            detail: "GET /api/v1/modules/:id",
          },
        },
        protected: {
          progress: {
            modules: "GET /api/v1/progress/modules",
            moduleDetail: "GET /api/v1/progress/modules/:moduleId",
            updateModule: "POST /api/v1/progress/modules/:moduleId",
            updateSubMaterial: "POST /api/v1/progress/sub-materials/:subMateriId",
          },
          quizzes: {
            get: "GET /api/v1/quizzes/:moduleId",
            submit: "POST /api/v1/quizzes/:quizId/submit",
          },
          notes: {
            list: "GET /api/v1/notes",
            create: "POST /api/v1/notes",
            update: "PUT /api/v1/notes/:id",
            delete: "DELETE /api/v1/notes/:id",
          },
          profile: {
            get: "GET /api/v1/users/profile",
            update: "PUT /api/v1/users/profile",
          },
        },
        admin: {
          modules: "GET|POST|PUT|DELETE /api/v1/admin/modules",
          quizzes: "GET|POST|PUT|DELETE /api/v1/admin/quizzes",
          users: "GET|PUT|DELETE /api/v1/admin/users",
        },
      },
      documentation: "https://github.com/Hidayattt24/bukadita-api-v2",
    },
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
