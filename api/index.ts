import type { VercelRequest, VercelResponse } from "@vercel/node";
import dotenv from "dotenv";

// Load environment variables first
dotenv.config();

// Import app after env is loaded
import app from "../src/app";

// Export handler for Vercel serverless
export default (req: VercelRequest, res: VercelResponse) => {
  // Let Express handle the request
  return app(req as any, res as any);
};
