import multer from "multer";
import path from "path";
import fs from "fs";

// Ensure local evidence directory exists
const evidenceDir = path.join(process.cwd(), "uploads", "evidence");
if (!fs.existsSync(evidenceDir)) {
  fs.mkdirSync(evidenceDir, { recursive: true });
}

const diskStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, evidenceDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || (file.mimetype.includes("audio") ? ".webm" : ".mp4");
    const uniqueName = `evidence_${req.params.id || "alert"}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}${ext}`;
    cb(null, uniqueName);
  },
});

export const evidenceUpload = multer({
  storage: diskStorage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB max
  },
});
