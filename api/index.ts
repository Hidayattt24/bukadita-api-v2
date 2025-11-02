import dotenv from "dotenv";
dotenv.config();

import app from "../src/app";

// Export the Express app for Vercel serverless
export default app;
