import { Router } from "express";
import {
  registerUser,
  loginUser,
  getProfile,
  verifyEmailOtp,
  resendEmailOtp,
} from "../controllers/authController";

import { verifyToken } from "../middleware/authMiddleware";

const router = Router();

router.post("/register", registerUser);
router.post("/verify-otp", verifyEmailOtp);
router.post("/resend-otp", resendEmailOtp);
router.post("/login", loginUser);
router.get("/profile", verifyToken, getProfile);

export default router;