import { Router } from "express";
import multer from "multer";
import { asyncHandler } from "../middlewares/async.middleware.js";
import { updateProfile, getProfile, initiatePhoneChange, verifyPhoneChange, uploadProfileImage } from "../controllers/users.controller.js";
import { protect } from "../middlewares/auth.middleware.js";

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  },
});

router.get("/profile", protect, getProfile);
router.post("/profile", asyncHandler(updateProfile));
router.post("/change-phone/initiate", protect, asyncHandler(initiatePhoneChange));
router.post("/change-phone/verify", protect, asyncHandler(verifyPhoneChange));
router.post("/profile-image", protect, upload.single('image'), asyncHandler(uploadProfileImage));

export default router;
