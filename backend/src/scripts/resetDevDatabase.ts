import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(__dirname, "../../.env") });

import User from "../models/User";
import Alert from "../models/Alert";
import Contact from "../models/Contact";
import SafetyEvent from "../models/SafetyEvent";
import AssistanceRequest from "../models/AssistanceRequest";

async function resetDatabase() {
  const mongoUri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/safeher";
  console.log(`\n======================================================`);
  console.log(`🗑️  SAFEHER DEVELOPMENT DATABASE RESET SCRIPT`);
  console.log(`Target Database: ${mongoUri}`);
  console.log(`======================================================\n`);

  try {
    await mongoose.connect(mongoUri);
    console.log(" Connected to MongoDB.");

    // Delete application users, volunteers, and admins
    const usersDeleted = await User.deleteMany({});
    console.log(` Deleted ${usersDeleted.deletedCount} Users/Volunteers/Admins.`);

    // Delete associated runtime alerts and test data
    const alertsDeleted = await Alert.deleteMany({});
    console.log(` Deleted ${alertsDeleted.deletedCount} Alerts.`);

    const contactsDeleted = await Contact.deleteMany({});
    console.log(` Deleted ${contactsDeleted.deletedCount} Contacts.`);

    const eventsDeleted = await SafetyEvent.deleteMany({});
    console.log(` Deleted ${eventsDeleted.deletedCount} Safety Events.`);

    const requestsDeleted = await AssistanceRequest.deleteMany({});
    console.log(` Deleted ${requestsDeleted.deletedCount} Assistance Requests.`);

    // Verification check
    const userCount = await User.countDocuments({ role: "user" });
    const volunteerCount = await User.countDocuments({ role: "volunteer" });
    const adminCount = await User.countDocuments({ role: "admin" });
    const totalUsers = await User.countDocuments({});

    console.log(`\n--- Verification Summary ---`);
    console.log(`Users count: ${userCount}`);
    console.log(`Volunteers count: ${volunteerCount}`);
    console.log(`Admins count: ${adminCount}`);
    console.log(`Total Users in DB: ${totalUsers}`);

    if (totalUsers === 0) {
      console.log(`\n✅ DATABASE RESET COMPLETE: 0 Users, 0 Volunteers, 0 Admins.\n`);
    } else {
      console.error(`\n❌ Warning: Found ${totalUsers} users remaining.\n`);
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error("❌ Database reset error:", error);
    process.exit(1);
  }
}

resetDatabase();
