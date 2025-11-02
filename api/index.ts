import type { VercelRequest, VercelResponse } from '@vercel/node';
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Import app after env is loaded
import app from "../src/app";

// Export handler for Vercel serverless
export default async (req: VercelRequest, res: VercelResponse) => {
  // Pass request to Express app
  return app(req, res);
};
