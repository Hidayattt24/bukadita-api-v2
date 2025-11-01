import { Response, NextFunction } from "express";
import { AuthRequest } from "./auth.middleware";
import { sendError, API_CODES } from "../utils/response.util";

export const requireRole = (allowedRoles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    // Get role from profile (database) or fallback to JWT payload
    const userRole = req.user?.profile?.role || req.user?.role;

    console.log(
      "🔒 [ROLE] Checking role:",
      userRole,
      "- Allowed:",
      allowedRoles
    );
    console.log("🔒 [ROLE] User object:", JSON.stringify(req.user, null, 2));

    if (!userRole) {
      console.log("❌ [ROLE] No role found in request");
      sendError(res, API_CODES.FORBIDDEN, "Access denied", 403);
      return;
    }

    if (!allowedRoles.includes(userRole)) {
      console.log(
        `❌ [ROLE] Role ${userRole} not in allowed roles:`,
        allowedRoles
      );
      sendError(res, API_CODES.FORBIDDEN, "Insufficient permissions", 403);
      return;
    }

    console.log(`✅ [ROLE] Access granted for role: ${userRole}`);
    next();
  };
};

export const requireAdmin = requireRole(["admin", "superadmin"]);
export const requireSuperAdmin = requireRole(["superadmin"]);
