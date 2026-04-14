import { Router } from "express";
import * as messageController from "../controllers/message.controller";
import { requireAuth } from "../middlewares/auth.middleware";
import { requireAdmin } from "../middlewares/role.middleware";

const router = Router();

router.use(requireAuth);

// User endpoints
router.get("/my", messageController.getMyMessages);
router.get("/unread-count", messageController.getUnreadCount);
router.patch("/read-all", messageController.markAllAsRead);
router.patch("/:id/read", messageController.markAsRead);
router.delete("/my/:id", messageController.userDeleteMessage);

// Admin-only endpoints
router.post("/", requireAdmin, messageController.sendMessage);
router.get("/history/:userId", requireAdmin, messageController.getMessageHistory);
router.delete("/:id", requireAdmin, messageController.adminDeleteMessage);

export default router;
