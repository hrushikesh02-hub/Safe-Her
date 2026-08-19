import mongoose, { Schema, Document } from "mongoose";

export interface IAssignmentRecord {
  volunteerId: mongoose.Types.ObjectId;
  volunteerName?: string;
  volunteerEmail?: string;
  volunteerPhone?: string;
  distanceKm?: number;
  responseScore?: number;
  status: "NOTIFIED" | "ACCEPTED" | "REJECTED" | "TIMED_OUT";
  notifiedAt: Date;
  respondedAt?: Date;
  rejectionReason?: string;
}

export interface ITimelineEvent {
  timestamp: Date;
  event: string;
  description: string;
  actor?: string;
}

export interface IAlert extends Document {
  user: mongoose.Types.ObjectId;
  latitude: number;
  longitude: number;
  status: "active" | "accepted" | "resolved";
  acceptedBy?: mongoose.Types.ObjectId;

  // Phase 1 — AI Voice metadata
  source: "MANUAL_SOS" | "AI_VOICE" | "AI_MOVEMENT" | "AI_FUSION";
  riskLevel?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  riskScore?: number;
  distressType?: string;
  confidence?: number;
  detectedKeywords?: string[];

  // Phase 2 — Movement AI metadata
  movementRiskScore?: number;
  movementAnomalyType?: string;
  routeDeviated?: boolean;
  suddenStop?: boolean;
  stationaryAlert?: boolean;

  // Phase 2 — GPS Context metadata
  gpsContextScore?: number;

  // Phase 2 — Fusion metadata
  finalRiskScore?: number;
  fusionSource?: string;

  // Phase 4 — AI Intelligent Response & Volunteer Coordination
  priority?: "P1" | "P2" | "P3" | "P4";
  priorityScore?: number; // 0 - 100
  priorityReasons?: string[];
  responseStatus?: "CREATED" | "AI_DETECTED" | "NOTIFYING" | "ASSIGNMENT_PENDING" | "ASSIGNED" | "RESPONDING" | "NEARBY" | "ARRIVED" | "RESOLVED" | "CANCELLED" | "REASSIGNED";
  assignmentHistory?: IAssignmentRecord[];
  assignedVolunteerId?: mongoose.Types.ObjectId;
  assignedVolunteerName?: string;
  assignedVolunteerPhone?: string;
  assignedAt?: Date;
  acceptedAt?: Date;
  respondingAt?: Date;
  arrivedAt?: Date;
  resolvedAt?: Date;
  estimatedEtaMinutes?: number;
  responderLiveLocation?: {
    latitude: number;
    longitude: number;
    updatedAt: Date;
  };
  aiRecommendation?: string;
  escalationLevel?: "NONE" | "ADMIN_ALERT" | "HIGH_ESCALATION";
  responseTimeline?: ITimelineEvent[];
  resolutionSummary?: {
    incidentType: string;
    priority: string;
    initialRisk: number;
    mainFactors: string[];
    assignmentDurationSec: number;
    totalResponseDurationSec: number;
    responderName: string;
    resolvedAt: Date;
  };

  // Emergency Evidence & Reporting
  evidenceStatus?: "NONE" | "RECORDING" | "CAPTURED" | "FAILED";
  audioRecording?: {
    url: string;
    durationSec?: number;
    recordedAt?: Date;
    storageRef?: string;
    mimeType?: string;
    fileSize?: number;
  };
  videoRecording?: {
    url: string;
    durationSec?: number;
    recordedAt?: Date;
    storageRef?: string;
    mimeType?: string;
    fileSize?: number;
  };
  evidenceAccessLogs?: {
    adminId: mongoose.Types.ObjectId;
    adminName?: string;
    mediaType: "AUDIO" | "VIDEO" | "ALL";
    action: "VIEW" | "DOWNLOAD" | "STREAM";
    accessedAt: Date;
    ipAddress?: string;
  }[];
  reportGeneratedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

const alertSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    latitude: {
      type: Number,
      required: true,
    },

    longitude: {
      type: Number,
      required: true,
    },

    status: {
      type: String,
      enum: ["active", "accepted", "resolved"],
      default: "active",
    },

    acceptedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },

    // Phase 1 AI Voice fields
    source: {
      type: String,
      enum: ["MANUAL_SOS", "AI_VOICE", "AI_MOVEMENT", "AI_FUSION"],
      default: "MANUAL_SOS",
    },

    riskLevel: {
      type: String,
      enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
    },

    riskScore: {
      type: Number,
      min: 0,
      max: 100,
    },

    distressType: {
      type: String,
      trim: true,
    },

    confidence: {
      type: Number,
      min: 0,
      max: 1,
    },

    detectedKeywords: {
      type: [String],
      default: [],
    },

    // Phase 2 — Movement AI
    movementRiskScore: { type: Number, min: 0, max: 100 },
    movementAnomalyType: { type: String, trim: true },
    routeDeviated: { type: Boolean },
    suddenStop: { type: Boolean },
    stationaryAlert: { type: Boolean },

    // Phase 2 — GPS Context
    gpsContextScore: { type: Number, min: 0, max: 100 },

    // Phase 2 — Fusion
    finalRiskScore: { type: Number, min: 0, max: 100 },
    fusionSource: { type: String, trim: true },

    // Phase 4 — Response Coordination
    priority: {
      type: String,
      enum: ["P1", "P2", "P3", "P4"],
      default: "P2",
    },

    priorityScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 75,
    },

    priorityReasons: {
      type: [String],
      default: [],
    },

    responseStatus: {
      type: String,
      enum: ["CREATED", "AI_DETECTED", "NOTIFYING", "ASSIGNMENT_PENDING", "ASSIGNED", "RESPONDING", "NEARBY", "ARRIVED", "RESOLVED", "CANCELLED", "REASSIGNED"],
      default: "CREATED",
    },

    assignmentHistory: [
      {
        volunteerId: { type: Schema.Types.ObjectId, ref: "User" },
        volunteerName: String,
        volunteerEmail: String,
        volunteerPhone: String,
        distanceKm: Number,
        responseScore: Number,
        status: {
          type: String,
          enum: ["NOTIFIED", "ACCEPTED", "REJECTED", "TIMED_OUT"],
          default: "NOTIFIED",
        },
        notifiedAt: { type: Date, default: Date.now },
        respondedAt: Date,
        rejectionReason: String,
      },
    ],

    assignedVolunteerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },

    assignedVolunteerName: String,
    assignedVolunteerPhone: String,

    assignedAt: Date,
    acceptedAt: Date,
    respondingAt: Date,
    arrivedAt: Date,
    resolvedAt: Date,

    estimatedEtaMinutes: Number,

    responderLiveLocation: {
      latitude: Number,
      longitude: Number,
      updatedAt: Date,
    },

    aiRecommendation: String,

    escalationLevel: {
      type: String,
      enum: ["NONE", "ADMIN_ALERT", "HIGH_ESCALATION"],
      default: "NONE",
    },

    responseTimeline: [
      {
        timestamp: { type: Date, default: Date.now },
        event: String,
        description: String,
        actor: String,
      },
    ],

    resolutionSummary: {
      incidentType: String,
      priority: String,
      initialRisk: Number,
      mainFactors: [String],
      assignmentDurationSec: Number,
      totalResponseDurationSec: Number,
      responderName: String,
      resolvedAt: Date,
    },

    // Emergency Evidence & Reporting
    evidenceStatus: {
      type: String,
      enum: ["NONE", "RECORDING", "CAPTURED", "FAILED"],
      default: "NONE",
    },

    audioRecording: {
      url: String,
      durationSec: Number,
      recordedAt: Date,
      storageRef: String,
      mimeType: String,
      fileSize: Number,
    },

    videoRecording: {
      url: String,
      durationSec: Number,
      recordedAt: Date,
      storageRef: String,
      mimeType: String,
      fileSize: Number,
    },

    evidenceAccessLogs: [
      {
        adminId: { type: Schema.Types.ObjectId, ref: "User" },
        adminName: String,
        mediaType: { type: String, enum: ["AUDIO", "VIDEO", "ALL"] },
        action: { type: String, enum: ["VIEW", "DOWNLOAD", "STREAM"], default: "VIEW" },
        accessedAt: { type: Date, default: Date.now },
        ipAddress: String,
      },
    ],

    reportGeneratedAt: Date,
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<IAlert>("Alert", alertSchema);