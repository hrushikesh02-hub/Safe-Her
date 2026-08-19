import { Response } from "express";
import { AuthRequest } from "../middleware/authMiddleware";
import Alert from "../models/Alert";
import User from "../models/User";
import path from "path";
import fs from "fs";

/**
 * POST /api/alerts/:id/evidence
 * User (or volunteer/admin) uploads captured emergency audio / video
 */
export const uploadEvidence = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const alert = await Alert.findById(id);
    if (!alert) {
      res.status(404).json({ success: false, message: "Incident not found" });
      return;
    }

    const file = req.file;
    if (!file) {
      res.status(400).json({ success: false, message: "No media file uploaded" });
      return;
    }

    const { mediaType, durationSec } = req.body;
    const duration = durationSec ? parseFloat(durationSec) : 0;
    const isAudio = mediaType === "AUDIO" || file.mimetype.includes("audio");

    const mediaRecord = {
      url: `/api/alerts/${id}/evidence/stream/${file.filename}`,
      durationSec: duration,
      recordedAt: new Date(),
      storageRef: file.filename,
      mimeType: file.mimetype,
      fileSize: file.size,
    };

    if (isAudio) {
      alert.audioRecording = mediaRecord;
    } else {
      alert.videoRecording = mediaRecord;
    }
    alert.evidenceStatus = "CAPTURED";

    alert.responseTimeline?.push({
      timestamp: new Date(),
      event: isAudio ? "AUDIO_EVIDENCE_CAPTURED" : "VIDEO_EVIDENCE_CAPTURED",
      description: `Emergency ${isAudio ? "audio" : "video"} recording securely captured (${duration}s, ${(file.size / 1024).toFixed(1)} KB).`,
      actor: "EvidenceCaptureEngine",
    });

    await alert.save();

    res.status(200).json({
      success: true,
      message: "Emergency evidence captured and securely stored",
      data: {
        evidenceStatus: alert.evidenceStatus,
        audioRecording: alert.audioRecording,
        videoRecording: alert.videoRecording,
      },
    });
  } catch (error: any) {
    console.error("Upload Evidence Error:", error);
    res.status(500).json({ success: false, message: error?.message || "Server Error" });
  }
};

/**
 * GET /api/alerts/:id/evidence
 * Authorized Admin views media metadata & logs audit access
 */
export const getIncidentEvidence = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const alert = await Alert.findById(id).select("audioRecording videoRecording evidenceStatus evidenceAccessLogs");
    if (!alert) {
      res.status(404).json({ success: false, message: "Incident not found" });
      return;
    }

    const admin = await User.findById(req.user?.id);
    const adminName = admin?.name || "Admin";

    // Record audit log
    if (!alert.evidenceAccessLogs) alert.evidenceAccessLogs = [];
    alert.evidenceAccessLogs.push({
      adminId: req.user!.id as any,
      adminName,
      mediaType: "ALL",
      action: "VIEW",
      accessedAt: new Date(),
      ipAddress: req.ip || req.socket.remoteAddress,
    });
    await alert.save();

    res.status(200).json({
      success: true,
      data: {
        evidenceStatus: alert.evidenceStatus || "NONE",
        audioRecording: alert.audioRecording,
        videoRecording: alert.videoRecording,
        accessLogs: alert.evidenceAccessLogs,
      },
    });
  } catch (error: any) {
    console.error("Get Incident Evidence Error:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

/**
 * GET /api/alerts/:id/evidence/stream/:filename
 * Securely streams the stored evidence file to authorized Admin with HTTP 206 Range support
 */
export const streamEvidenceFile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const filename = req.params.filename as string;
    const filePath = path.join(process.cwd(), "uploads", "evidence", filename);

    if (!fs.existsSync(filePath)) {
      res.status(404).json({ success: false, message: "Evidence file not found or expired" });
      return;
    }

    // Determine content type
    const ext = path.extname(filename).toLowerCase();
    let contentType = "application/octet-stream";
    if (ext === ".webm") {
      contentType = filename.includes("audio") ? "audio/webm" : "video/webm";
    } else if (ext === ".mp4") {
      contentType = "video/mp4";
    } else if (ext === ".wav") {
      contentType = "audio/wav";
    } else if (ext === ".mp3") {
      contentType = "audio/mpeg";
    } else if (ext === ".ogg") {
      contentType = "audio/ogg";
    }

    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const range = req.headers.range;

    if (range) {
      // Range request (e.g. bytes=0-1024000)
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

      if (start >= fileSize || end >= fileSize) {
        res.status(416).set("Content-Range", `bytes */${fileSize}`).end();
        return;
      }

      const chunksize = end - start + 1;
      const fileStream = fs.createReadStream(filePath, { start, end });

      res.writeHead(206, {
        "Content-Range": `bytes ${start}-${end}/${fileSize}`,
        "Accept-Ranges": "bytes",
        "Content-Length": chunksize,
        "Content-Type": contentType,
        "Cache-Control": "private, no-cache, no-store, must-revalidate",
      });

      fileStream.pipe(res);
    } else {
      // Full file streaming
      res.writeHead(200, {
        "Content-Length": fileSize,
        "Content-Type": contentType,
        "Accept-Ranges": "bytes",
        "Cache-Control": "private, no-cache, no-store, must-revalidate",
      });

      fs.createReadStream(filePath).pipe(res);
    }
  } catch (error: any) {
    console.error("Stream Evidence File Error:", error);
    res.status(500).json({ success: false, message: "Streaming Error" });
  }
};

/**
 * GET /api/alerts/:id/evidence/logs
 * Returns evidence access audit logs for compliance
 */
export const getEvidenceAccessLogs = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const alert = await Alert.findById(id).select("evidenceAccessLogs");
    if (!alert) {
      res.status(404).json({ success: false, message: "Incident not found" });
      return;
    }

    res.status(200).json({
      success: true,
      data: alert.evidenceAccessLogs || [],
    });
  } catch (error: any) {
    console.error("Get Evidence Logs Error:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};
