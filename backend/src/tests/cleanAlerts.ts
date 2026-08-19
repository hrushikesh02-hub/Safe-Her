import mongoose from "mongoose";

async function clean() {
  await mongoose.connect("mongodb://127.0.0.1:27017/safeher");
  await mongoose.connection.db!.collection("alerts").deleteMany({});
  await mongoose.connection.db!.collection("users").updateMany({}, { $set: { volunteerStatus: "AVAILABLE", activeIncidentId: null } });
  console.log("✅ Alerts cleared & volunteers set to AVAILABLE");
  await mongoose.disconnect();
}

clean();
