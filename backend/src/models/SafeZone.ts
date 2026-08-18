import mongoose, { Schema, Document } from "mongoose";

export interface ISafeZone extends Document {
  name: string;
  type: string;
  address: string;
  latitude: number;
  longitude: number;
}

const safeZoneSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },

    type: {
      type: String,
      required: true,
    },

    address: {
      type: String,
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
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<ISafeZone>(
  "SafeZone",
  safeZoneSchema
);