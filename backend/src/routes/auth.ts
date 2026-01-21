import { Router } from "express";
import { asyncHandler } from "../middlewares/async.middleware.js";
import { login, verifyOtp } from "../controllers/auth.controller.js";

const router = Router();

router.post("/login", asyncHandler(login));
router.post("/verify-otp", asyncHandler(verifyOtp));

export default router;
