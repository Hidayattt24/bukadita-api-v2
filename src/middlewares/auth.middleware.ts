import { Request, Response, NextFunction } from "express";
import { verifyToken, JWTPayload } from "../utils/jwt.util";
import { sendError, API_CODES } from "../utils/response.util";
import prisma from "../config/database";

export interface AuthRequest extends Request {
  user?: JWTPayload & { profile?: any };
}

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    console.log("🔐 [AUTH] Headers:", req.headers);
    console.log("🔐 [AUTH] Authorization header:", authHeader);

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log("❌ [AUTH] No valid authorization header");
      sendError(res, API_CODES.UNAUTHORIZED, "Authentication required", 401);
      return;
    }

    const token = authHeader.substring(7);
    console.log("🔑 [AUTH] Token:", token.substring(0, 20) + "...");
    const payload = verifyToken(token);
    console.log("✅ [AUTH] Token verified, payload:", payload);

    // Fetch user profile
    const profile = await prisma.profile.findUnique({
      where: { id: payload.userId },
    });
    console.log(
      "👤 [AUTH] Profile found:",
      profile ? `${profile.full_name} (${profile.role})` : "null"
    );

    if (!profile) {
      console.log("❌ [AUTH] Profile not found for userId:", payload.userId);
      sendError(res, API_CODES.UNAUTHORIZED, "User not found", 401);
      return;
    }

    req.user = { ...payload, profile };
    console.log("✅ [AUTH] User authenticated:", req.user.email, req.user.role);
    next();
  } catch (error: any) {
    console.log("❌ [AUTH] Error:", error);

    // Distinguish between expired and invalid tokens
    if (error.name === "TokenExpiredError") {
      console.log("⏰ [AUTH] Token has expired");
      sendError(
        res,
        API_CODES.AUTH_TOKEN_EXPIRED,
        "Token has expired. Please refresh your token or login again.",
        401
      );
      return;
    }

    if (error.name === "JsonWebTokenError") {
      console.log("🔒 [AUTH] Invalid token");
      sendError(
        res,
        API_CODES.UNAUTHORIZED,
        "Invalid token. Please login again.",
        401
      );
      return;
    }

    // Generic error
    sendError(
      res,
      API_CODES.UNAUTHORIZED,
      "Authentication failed. Please login again.",
      401
    );
  }
};
