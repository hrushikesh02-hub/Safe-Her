import { Router } from "express";
import {
  registerUser,
  loginUser,
  getProfile,
} from "../controllers/authController";

import { verifyToken } from "../middleware/authMiddleware";

const router = Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/profile", verifyToken, getProfile);

export default router;