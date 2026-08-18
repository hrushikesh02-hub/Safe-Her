import express from "express";
import { verifyToken } from "../middleware/authMiddleware";
import { getSafeZones } from "../controllers/adminController";

const router = express.Router();

router.get("/", verifyToken, getSafeZones);

export default router;