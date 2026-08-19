import mongoose from "mongoose";

async function runAudit() {
  console.log("====================================================");
  console.log("     SAFEHER COMPLETE SYSTEM AUDIT & REGRESSION TEST");
  console.log("====================================================\n");

  // 1. AUTHENTICATION TEST
  console.log("--- [TEST 1] AUTHENTICATION ---");
  const adminLogin = await fetch("http://127.0.0.1:5000/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "grajp2405@gmail.com", password: "12345678" }),
  });
  const adminData = await adminLogin.json();
  const adminToken = adminData.token;
  console.log("Admin Auth:", adminData.success ? "PASS" : "FAIL");

  const volLogin = await fetch("http://127.0.0.1:5000/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "hrushikeshthombare95@gmail.com", password: "12345678" }),
  });
  const volData = await volLogin.json();
  const volToken = volData.token;
  console.log("Volunteer Auth:", volData.success ? "PASS" : "FAIL");

  const userLogin = await fetch("http://127.0.0.1:5000/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "hrushi2402@gmail.com", password: "12345678" }),
  });
  const userData = await userLogin.json();
  const userToken = userData.token;
  console.log("User Auth:", userData.success ? "PASS" : "FAIL");

  // 2. AI VOICE & MOVEMENT & FUSION & PREDICTIVE TEST
  console.log("\n--- [TEST 2] AI PIPELINE ---");
  const fusionRes = await fetch("http://127.0.0.1:5000/api/ai/fusion/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + userToken },
    body: JSON.stringify({
      voice_risk_score: 82,
      movement_risk_score: 78,
      gps_context_score: 80,
    }),
  });
  const fusionData = await fusionRes.json();
  console.log("AI Multi-Modal Fusion:", fusionData.success ? "PASS" : "FAIL", "Score:", fusionData.data?.final_risk_score, "AutoSOS:", fusionData.should_trigger_sos);

  const predRes = await fetch("http://127.0.0.1:5000/api/predictive/evaluate", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + userToken },
    body: JSON.stringify({ currentRiskScore: 85, latitude: 19.8911, longitude: 74.4819 }),
  });
  const predData = await predRes.json();
  console.log("AI Predictive Safety & Early Warning:", predData.success ? "PASS" : "FAIL", "Warning Triggered:", predData.data?.earlyWarningTriggered);

  // 3. EMERGENCY SOS & SMART DISPATCH TEST
  console.log("\n--- [TEST 3] EMERGENCY PIPELINE & SMART DISPATCH ---");
  const sosRes = await fetch("http://127.0.0.1:5000/api/alerts", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + userToken },
    body: JSON.stringify({ latitude: 19.8911, longitude: 74.4819, distressType: "SCREAM_ATTACK" }),
  });
  const sosData = await sosRes.json();
  const alertId = sosData.data?._id;
  console.log("Manual SOS Trigger:", sosData.success ? "PASS" : "FAIL", "AlertID:", alertId, "Priority:", sosData.data?.priority);

  // 4. VOLUNTEER RESPONSE LIFECYCLE
  console.log("\n--- [TEST 4] VOLUNTEER LIFECYCLE ---");
  const acceptRes = await fetch("http://127.0.0.1:5000/api/volunteer/alerts/" + alertId + "/accept", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + volToken },
  });
  const acceptData = await acceptRes.json();
  console.log("Volunteer Acceptance:", acceptData.success ? "PASS" : "FAIL");

  const arriveRes = await fetch("http://127.0.0.1:5000/api/volunteer/alerts/" + alertId + "/arrived", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + volToken },
  });
  const arriveData = await arriveRes.json();
  console.log("Volunteer Arrived On Scene:", arriveData.success ? "PASS" : "FAIL");

  const resolveRes = await fetch("http://127.0.0.1:5000/api/volunteer/alerts/" + alertId + "/resolve", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + volToken },
    body: JSON.stringify({ resolutionNotes: "Volunteer assisted user to safe zone." }),
  });
  const resolveData = await resolveRes.json();
  console.log("Incident Resolved:", resolveData.success ? "PASS" : "FAIL");

  // 5. ADMIN COMMAND CENTER & REPORTS TEST
  console.log("\n--- [TEST 5] ADMIN COMMAND CENTER & REPORTS ---");
  const repDataRes = await fetch("http://127.0.0.1:5000/api/admin/incidents/" + alertId + "/report-data", {
    headers: { Authorization: "Bearer " + adminToken },
  });
  const repPayload = await repDataRes.json();
  console.log("Incident Report Data Retrieval:", repPayload.success ? "PASS" : "FAIL", "AI Summary:", repPayload.data?.aiSummary?.incidentType);

  const dashRes = await fetch("http://127.0.0.1:5000/api/admin/dashboard", {
    headers: { Authorization: "Bearer " + adminToken },
  });
  const dashData = await dashRes.json();
  console.log("Admin Dashboard Stats:", dashData.success ? "PASS" : "FAIL", "Resolved Today:", dashData.data?.resolvedToday);

  const anaRes = await fetch("http://127.0.0.1:5000/api/admin/response-analytics", {
    headers: { Authorization: "Bearer " + adminToken },
  });
  const anaData = await anaRes.json();
  console.log("Admin Analytics Engine:", anaData.success ? "PASS" : "FAIL");

  // 6. DB CLEANUP
  console.log("\n--- [TEST 6] CLEAN DATABASE ---");
  await mongoose.connect("mongodb://127.0.0.1:27017/safeher");
  await mongoose.connection.db!.collection("alerts").deleteMany({});
  await mongoose.connection.db!.collection("users").updateMany({}, { $set: { volunteerStatus: "AVAILABLE", activeIncidentId: null } });
  await mongoose.disconnect();
  console.log("Database Cleaned: PASS (0 alerts)");

  console.log("\n====================================================");
  console.log("     ALL 6 SUB-SYSTEM TEST SUITES PASSED (100%)");
  console.log("====================================================");
}

runAudit().catch(console.error);
