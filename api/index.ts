import type { VercelRequest, VercelResponse } from "@vercel/node";
import dotenv from "dotenv";

// Load environment variables first
dotenv.config();

// Import app after env is loaded
import app from "../src/app";

// Export handler for Vercel serverless
export default async (req: VercelRequest, res: VercelResponse) => {
  try {
    // Vercel passes req/res to Express
    // We need to promisify this or wait for response
    await new Promise<void>((resolve, reject) => {
      // Handle Express app with Vercel's req/res
      app(req as any, res as any);

      // Listen for response finish
      res.on("finish", () => resolve());
      res.on("error", (err) => reject(err));
    });
  } catch (error) {
    console.error("Serverless function error:", error);

    if (!res.headersSent) {
      res.status(500).json({
        error: true,
        code: "INTERNAL_SERVER_ERROR",
        message: "Serverless function crashed",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
};
