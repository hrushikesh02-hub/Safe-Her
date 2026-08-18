import express from "express";
import {
  updateProfile,
  getSafeZones,
  getSupportTeams,
  requestSupport,
  getNearbySafeZones,
} from "../controllers/userController";
import { verifyToken } from "../middleware/authMiddleware";
import { upload } from "../middleware/upload";

const router = express.Router();

// =======================
// Safe Zones
// =======================
router.get(
  "/safe-zones",
  verifyToken,
  getSafeZones
);

// =======================
// Support Teams
// =======================
router.get(
  "/support-teams",
  verifyToken,
  getSupportTeams
);

// =======================
// Request Support
// =======================
router.post(
  "/request-support",
  verifyToken,
  requestSupport
);

// =======================
// Nearby Safe Zones
// =======================
router.get(
  "/nearby-safe-zones",
  verifyToken,
  getNearbySafeZones
);

// =======================
// Update Profile
// =======================
router.put(
  "/profile",
  verifyToken,
  upload.single("profileImage"),
  updateProfile
);

// =======================
// Test Upload Route
// =======================
router.post(
  "/test",
  upload.single("profileImage"),
  (req, res) => {
    console.log("BODY:", req.body);
    console.log("FILE:", req.file);

    res.status(200).json({
      success: true,
      body: req.body,
      file: req.file,
    });
  }
);

export default router;