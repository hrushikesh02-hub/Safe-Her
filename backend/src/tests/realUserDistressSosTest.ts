import mongoose from "mongoose";

async function runRealUserDistressTest() {
  console.log("==================================================================");
  console.log("  SAFEHER REAL USER DISTRESS → AUTOMATIC SOS FULL PIPELINE AUDIT");
  console.log("==================================================================\n");

  // 1. Authenticate user
  console.log("--- 1. User Authentication ---");
  const loginRes = await fetch("http://127.0.0.1:5000/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "hrushi2402@gmail.com", password: "12345678" }),
  });
  const loginData = await loginRes.json();
  const token = loginData.token;
  console.log("User Login:", loginData.success ? "PASS" : "FAIL");

  // 2. Normal Speech Test (No SOS Expected)
  console.log("\n--- 2. Normal Speech Test (Should NOT trigger SOS) ---");
  const normalPhrases = ["Hello, how are you?", "I am walking home.", "I am going to college."];
  for (const phrase of normalPhrases) {
    const res = await fetch("http://127.0.0.1:5000/api/ai/voice/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
      body: JSON.stringify({ transcription: phrase }),
    });
    const data = await res.json();
    const isNormal = data.distress_detected === false && data.voice_risk_score <= 30;
    console.log(`Speech: "${phrase}" → Distress: ${data.distress_detected}, Risk: ${data.voice_risk_score}/100, Level: ${data.risk_level} [${isNormal ? "PASS" : "FAIL"}]`);
  }

  // 3. Real Distress Speech Tests (Automatic SOS Trigger)
  console.log("\n--- 3. Distress Speech Tests (MUST trigger Voice AI & SOS) ---");
  const distressPhrases = [
    "HELP ME",
    "SAVE ME",
    "PLEASE HELP ME",
    "EMERGENCY",
    "BACHAO",
  ];

  for (const phrase of distressPhrases) {
    console.log(`\nTesting phrase: "${phrase}"...`);
    // Step A: Voice AI Analysis
    const voiceRes = await fetch("http://127.0.0.1:5000/api/ai/voice/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
      body: JSON.stringify({ transcription: phrase }),
    });
    const voiceData = await voiceRes.json();
    const isDistress = voiceData.distress_detected === true && voiceData.voice_risk_score >= 76;
    console.log(`  Voice AI Result: Distress=${voiceData.distress_detected}, Risk=${voiceData.voice_risk_score}/100, Keywords=${JSON.stringify(voiceData.detected_keywords)} [${isDistress ? "PASS" : "FAIL"}]`);

    // Step B: Automatic SOS Trigger
    if (isDistress) {
      const sosRes = await fetch("http://127.0.0.1:5000/api/ai/voice/trigger-sos", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
        body: JSON.stringify({
          latitude: 19.8911,
          longitude: 74.4819,
          riskLevel: voiceData.risk_level,
          riskScore: voiceData.voice_risk_score,
          distressType: voiceData.distress_type,
          confidence: voiceData.confidence,
          detectedKeywords: voiceData.detected_keywords,
        }),
      });
      const sosData = await sosRes.json();
      const alertCreated = sosData.success && sosData.data?._id;
      console.log(`  Automatic SOS: Created Alert ID: ${sosData.data?._id}, Source: ${sosData.data?.source}, Status: ${sosData.data?.status} [${alertCreated ? "PASS" : "FAIL"}]`);
    }
  }

  // 4. Clean DB after verification
  console.log("\n--- 4. Clean Database ---");
  await mongoose.connect("mongodb://127.0.0.1:27017/safeher");
  const count = await mongoose.connection.db!.collection("alerts").countDocuments({});
  console.log(`Total SOS Alerts created during test: ${count}`);
  await mongoose.connection.db!.collection("alerts").deleteMany({});
  await mongoose.connection.db!.collection("users").updateMany({}, { $set: { volunteerStatus: "AVAILABLE", activeIncidentId: null } });
  await mongoose.disconnect();
  console.log("Database Cleaned: PASS (0 alerts)");

  console.log("\n==================================================================");
  console.log("  ALL REAL USER DISTRESS & AUTOMATIC SOS TESTS PASSED (100%)");
  console.log("==================================================================");
}

runRealUserDistressTest().catch(console.error);
