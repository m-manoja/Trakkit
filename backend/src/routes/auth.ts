import { Router } from "express";
import { asyncHandler } from "../middlewares/async.middleware.js";
import { login, verifyOtp } from "../controllers/auth.controller.js";
import { emailLogin } from "../controllers/users.controller.js";

const router = Router();

router.post("/login", asyncHandler(login));
router.post("/verify-otp", asyncHandler(verifyOtp));
router.post("/email-login", asyncHandler(emailLogin)); // Backup: email + password login

export default router;
