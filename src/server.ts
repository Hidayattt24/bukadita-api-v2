import dotenv from "dotenv";
dotenv.config();

import app from "./app";
import logger from "./config/logger";
import prisma from "./config/database";

const PORT = process.env.PORT || 8080;

async function startServer() {
  try {
    // Test database connection
    await prisma.$connect();
    logger.info("✅ Database connected successfully");

    // Start server
    app.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT}`);
      logger.info(`📝 Environment: ${process.env.NODE_ENV}`);
      logger.info(`🌐 API Base URL: http://localhost:${PORT}/api/v1`);
    });
  } catch (error) {
    logger.error("❌ Failed to start server:", error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on("SIGTERM", async () => {
  logger.info("SIGTERM received, closing server...");
  await prisma.$disconnect();
  process.exit(0);
});

process.on("SIGINT", async () => {
  logger.info("SIGINT received, closing server...");
  await prisma.$disconnect();
  process.exit(0);
});

startServer();
