import mongoose from "mongoose";

const connectDB = async (): Promise<void> => {
  const uri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/safeher";
  try {
    console.log("Connecting to MongoDB:", uri.split("@").pop());
    await mongoose.connect(uri);
    console.log("✅ MongoDB Connected Successfully");
  } catch (error: any) {
    console.error("❌ Primary MongoDB Connection Failed:", error?.message || error);
    if (uri !== "mongodb://127.0.0.1:27017/safeher") {
      try {
        console.log("🔄 Attempting fallback to local MongoDB (mongodb://127.0.0.1:27017/safeher)...");
        await mongoose.connect("mongodb://127.0.0.1:27017/safeher");
        console.log("✅ Fallback to Local MongoDB Connected Successfully");
        return;
      } catch (fallbackError: any) {
        console.error("❌ Fallback MongoDB Connection Failed:", fallbackError?.message || fallbackError);
      }
    }
    console.error("Server continuing with limited database features or will retry on next operation.");
  }
};

export default connectDB;