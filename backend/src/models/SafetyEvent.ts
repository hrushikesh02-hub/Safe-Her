import mongoose, { Document, Schema } from "mongoose";

export interface ISafetyEvent extends Document {
  userId: mongoose.Types.ObjectId;
  eventType: "PREDICTIVE_EVAL" | "EARLY_WARNING" | "CHECKIN_PROMPT" | "CHECKIN_CONFIRMED" | "ROUTE_DEVIATION";
  location: {
    type: string;
    coordinates: [number, number]; // [lng, lat]
  };
  predictiveScore: number; // 0 - 100
  riskLevel: "SAFE" | "MODERATE" | "ELEVATED_CAUTION" | "HIGH_CAUTION";
  riskTrend: string;
  factors: {
    temporalScore: number;
    safeZoneCoverageScore: number;
    historicalDensityScore: number;
    movementTrajectoryScore: number;
  };
  warnings: Array<{
    type: string;
    severity: string;
    message: string;
    action?: string;
  }>;
  createdAt: Date;
}

const SafetyEventSchema = new Schema<ISafetyEvent>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    eventType: {
      type: String,
      enum: ["PREDICTIVE_EVAL", "EARLY_WARNING", "CHECKIN_PROMPT", "CHECKIN_CONFIRMED", "ROUTE_DEVIATION"],
      default: "PREDICTIVE_EVAL",
    },
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number],
        required: true,
      },
    },
    predictiveScore: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    riskLevel: {
      type: String,
      enum: ["SAFE", "MODERATE", "ELEVATED_CAUTION", "HIGH_CAUTION"],
      default: "SAFE",
    },
    riskTrend: {
      type: String,
      default: "stable",
    },
    factors: {
      temporalScore: { type: Number, default: 0 },
      safeZoneCoverageScore: { type: Number, default: 0 },
      historicalDensityScore: { type: Number, default: 0 },
      movementTrajectoryScore: { type: Number, default: 0 },
    },
    warnings: [
      {
        type: { type: String },
        severity: { type: String },
        message: { type: String },
        action: { type: String },
      },
    ],
  },
  {
    timestamps: true,
  }
);

SafetyEventSchema.index({ location: "2dsphere" });
SafetyEventSchema.index({ createdAt: -1 });

export default mongoose.model<ISafetyEvent>("SafetyEvent", SafetyEventSchema);
