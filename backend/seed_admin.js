/**
 * Seed script: Create an admin user in MongoDB Atlas
 * Usage: node seed_admin.js
 */
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
require("dotenv").config();

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/safeher";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, required: true, unique: true, trim: true },
    profileImage: { type: String, default: "" },
    password: { type: String, required: true },
    role: { type: String, enum: ["user", "volunteer", "admin"], default: "user" },
    isBlocked: { type: Boolean, default: false },
    isVerified: { type: Boolean, default: false },
    isEmailVerified: { type: Boolean, default: false },
    emailOtpHash: String,
    emailOtpExpiresAt: Date,
    emailOtpAttempts: { type: Number, default: 0 },
    emailOtpLastSentAt: Date,
    lastKnownLatitude: Number,
    lastKnownLongitude: Number,
    lastLocationAt: Date,
    volunteerStatus: { type: String, enum: ["AVAILABLE", "BUSY", "OFFLINE"], default: "AVAILABLE" },
    volunteerStats: {
      totalAssignments: { type: Number, default: 0 },
      acceptedCount: { type: Number, default: 0 },
      rejectedCount: { type: Number, default: 0 },
      timedOutCount: { type: Number, default: 0 },
      resolvedCount: { type: Number, default: 0 },
      averageResponseTimeSec: { type: Number, default: 0 },
    },
    verificationStatus: { type: String, enum: ["PENDING", "APPROVED", "REJECTED"], default: "PENDING" },
    verifiedAt: Date,
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    rejectionReason: String,
    verificationNotificationStatus: { type: String, enum: ["NOT_SENT", "SENT", "FAILED"], default: "NOT_SENT" },
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);

async function seedAdmin() {
  try {
    console.log("Connecting to MongoDB:", MONGO_URI.split("@").pop());
    await mongoose.connect(MONGO_URI);
    console.log("✅ MongoDB Connected");

    const adminEmail = "grajp2405@gmail.com";
    const adminPassword = "12345678";

    // Check if admin already exists
    const existing = await User.findOne({ email: adminEmail });
    if (existing) {
      console.log("⚠️  Admin user already exists with this email. Updating role to admin...");
      existing.role = "admin";
      existing.isVerified = true;
      existing.isEmailVerified = true;
      existing.password = await bcrypt.hash(adminPassword, 10);
      await existing.save();
      console.log("✅ Admin user updated successfully!");
      console.log("   Email:", adminEmail);
      console.log("   Role:", existing.role);
    } else {
      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      const admin = new User({
        name: "Admin",
        email: adminEmail,
        phone: "0000000000",
        password: hashedPassword,
        role: "admin",
        isVerified: true,
        isEmailVerified: true,
      });
      await admin.save();
      console.log("✅ Admin user created successfully!");
      console.log("   Email:", adminEmail);
      console.log("   Password: 12345678");
      console.log("   Role: admin");
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB.");
  }
}

seedAdmin();
