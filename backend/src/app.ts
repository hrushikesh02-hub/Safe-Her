console.log("APP FILE STARTED");

import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import authRoutes from "./routes/authRoutes";
import contactRoutes from "./routes/contactRoutes";
import alertRoutes from "./routes/alertRoutes";
import adminRoutes from "./routes/adminRoutes";
import userRoutes from "./routes/userRoutes";
import volunteerRoutes from "./routes/volunteerRoutes";
import aiVoiceRoutes from "./routes/aiVoiceRoutes";
import movementRoutes from "./routes/movementRoutes";
import fusionRoutes from "./routes/fusionRoutes";
import predictiveRoutes from "./routes/predictiveRoutes";


dotenv.config();

const app = express();

/* ===========================
   Middlewares
=========================== */

app.use(cors());
app.use(express.json());

/* ===========================
   API Routes
=========================== */

app.use("/api/auth", authRoutes);

app.use("/api/users", userRoutes);

app.use("/api/contacts", contactRoutes);

app.use("/api/alerts", alertRoutes);

app.use("/api/volunteer", volunteerRoutes);

app.use("/api/admin", adminRoutes);

app.use("/api/ai/voice", aiVoiceRoutes);

app.use("/api/ai/movement", movementRoutes);

app.use("/api/ai/fusion", fusionRoutes);
app.use("/api/predictive", predictiveRoutes);

/* ===========================
   Home Route
=========================== */

app.get("/", (req, res) => {
  res.send("SafeHer Backend is Running...");
});

/* ===========================
   404 Route
=========================== */

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found.`,
  });
});

/* ===========================
   Global Error Handler
=========================== */
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err?.name === "MulterError") {
    res.status(400).json({
      success: false,
      message: `Upload error: ${err.message}`,
      code: err.code,
    });
    return;
  }
  res.status(err?.status || 500).json({
    success: false,
    message: err?.message || "Internal Server Error",
  });
});

export default app;