import { Router } from "express";
import { asyncHandler } from "../middlewares/async.middleware.js";
import { protect } from "../middlewares/auth.middleware.js";
import { getNotificationSettings, updateNotificationSettings } from "../controllers/settings.controller.js";

const router = Router();

router.get("/notification-settings", protect, asyncHandler(getNotificationSettings));
router.put("/notification-settings", protect, asyncHandler(updateNotificationSettings));

export default router;
