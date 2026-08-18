import mongoose, { Schema, Document } from "mongoose";

export interface IAssistanceRequest extends Document {
  user: mongoose.Types.ObjectId;
  volunteer: mongoose.Types.ObjectId;
  status: "pending" | "accepted" | "rejected" | "completed";
}

const assistanceRequestSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    volunteer: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    status: {
      type: String,
      enum: [
        "pending",
        "accepted",
        "rejected",
        "completed",
      ],
      default: "pending",
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model(
  "AssistanceRequest",
  assistanceRequestSchema
);