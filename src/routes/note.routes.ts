import { Router } from "express";
import * as noteController from "../controllers/note.controller";
import { requireAuth } from "../middlewares/auth.middleware";

const router = Router();

// All routes require authentication
router.use(requireAuth);

// Get user note categories
router.get("/categories", noteController.getUserNoteCategories);

// CRUD operations
router.get("/", noteController.getUserNotes);
router.get("/:id", noteController.getNoteById);
router.post("/", noteController.createNote);
router.put("/:id", noteController.updateNote);
router.delete("/:id", noteController.deleteNote);

// Toggle pin
router.patch("/:id/pin", noteController.togglePinNote);

export default router;
