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
