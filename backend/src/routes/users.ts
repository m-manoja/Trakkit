import { Router } from "express";
import { asyncHandler } from "../middlewares/async.middleware.js";
import { updateProfile, getProfile } from "../controllers/users.controller.js";
import { protect } from "../middlewares/auth.middleware.js";
const router = Router();

router.get("/profile", protect, getProfile);
router.post("/profile", asyncHandler(updateProfile));

export default router;
