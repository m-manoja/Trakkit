import { Router } from "express";
import { asyncHandler } from "../middlewares/async.middleware.js";
import { login, verifyOtp, forgotPassword, resetPassword, sendVerifyEmail, verifyEmail } from "../controllers/auth.controller.js";
import { emailLogin } from "../controllers/users.controller.js";
import { protect } from "../middlewares/auth.middleware.js";

const router = Router();

router.post("/login", asyncHandler(login));
router.post("/verify-otp", asyncHandler(verifyOtp));
router.post("/email-login", asyncHandler(emailLogin));
router.post("/forgot-password", asyncHandler(forgotPassword));
router.post("/reset-password", asyncHandler(resetPassword));
router.post("/verify-email/send", protect, asyncHandler(sendVerifyEmail));
router.post("/verify-email/confirm", protect, asyncHandler(verifyEmail));

export default router;
