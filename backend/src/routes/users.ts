import { Router } from "express";
import { asyncHandler } from "../middlewares/async.middleware.js";
import { updateProfile } from "../controllers/users.controller.js";

const router = Router();

router.post("/profile", asyncHandler(updateProfile));

export default router;
