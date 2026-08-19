import mongoose, { Document, Schema } from "mongoose";

export interface IUser extends Document {
  name: string;
  email: string;
  phone: string;
  password: string;
  role: "user" | "volunteer" | "admin";

  isBlocked: boolean;
  isVerified: boolean;
  profileImage: string;

  // Volunteer location tracking (for nearby volunteer search)
  lastKnownLatitude?: number;
  lastKnownLongitude?: number;
  lastLocationAt?: Date;

  // Phase 4 Volunteer Response metrics
  volunteerStatus?: "AVAILABLE" | "BUSY" | "OFFLINE";
  volunteerStats?: {
    totalAssignments: number;
    acceptedCount: number;
    rejectedCount: number;
    timedOutCount: number;
    resolvedCount: number;
    averageResponseTimeSec: number;
  };

  // Volunteer Verification Workflow
  verificationStatus?: "PENDING" | "APPROVED" | "REJECTED";
  verifiedAt?: Date;
  verifiedBy?: mongoose.Types.ObjectId;
  rejectionReason?: string;
  verificationNotificationStatus?: "NOT_SENT" | "SENT" | "FAILED";

  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    phone: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    profileImage: {
      type: String,
      default: "",
    },

    password: {
      type: String,
      required: true,
    },

    role: {
      type: String,
      enum: ["user", "volunteer", "admin"],
      default: "user",
    },

    isBlocked: {
      type: Boolean,
      default: false,
    },

    isVerified: {
      type: Boolean,
      default: false,
    },

    // Volunteer location fields
    lastKnownLatitude: {
      type: Number,
    },

    lastKnownLongitude: {
      type: Number,
    },

    lastLocationAt: {
      type: Date,
    },

    // Phase 4 fields
    volunteerStatus: {
      type: String,
      enum: ["AVAILABLE", "BUSY", "OFFLINE"],
      default: "AVAILABLE",
    },

    volunteerStats: {
      totalAssignments: { type: Number, default: 0 },
      acceptedCount: { type: Number, default: 0 },
      rejectedCount: { type: Number, default: 0 },
      timedOutCount: { type: Number, default: 0 },
      resolvedCount: { type: Number, default: 0 },
      averageResponseTimeSec: { type: Number, default: 0 },
    },

    // Verification Workflow
    verificationStatus: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED"],
      default: "PENDING",
    },
    verifiedAt: Date,
    verifiedBy: { type: Schema.Types.ObjectId, ref: "User" },
    rejectionReason: String,
    verificationNotificationStatus: {
      type: String,
      enum: ["NOT_SENT", "SENT", "FAILED"],
      default: "NOT_SENT",
    },
  },
  {
    timestamps: true,
  }
);

const User = mongoose.model<IUser>("User", userSchema);

export default User;