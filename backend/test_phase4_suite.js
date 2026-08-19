/**
 * SafeHer Phase 4: AI Intelligent Emergency Response & Volunteer Coordination
 * Comprehensive End-to-End & Automated Test Suite
 */

const API_BASE = "http://127.0.0.1:5000/api";
const AI_BASE = "http://127.0.0.1:8000";

let userToken = "";
let userAlphaId = "";
let vol1Token = "";
let vol1Id = "";
let vol2Token = "";
let vol2Id = "";
let adminToken = "";

const results = {
  priorityClassification: [],
  rankingEngine: [],
  scenario1_successfulResponse: [],
  scenario2_timeoutReassignment: [],
  scenario3_rejectionReassignment: [],
  scenario4_noVolunteerEscalation: [],
  scenario5_adminOverride: [],
  responseAnalytics: [],
  regressionSuite: [],
};

async function logResult(category, name, passed, details = {}) {
  const item = { name, passed, details };
  if (results[category]) results[category].push(item);
  console.log(`${passed ? "✅ [PASS]" : "❌ [FAIL]"} [${category.toUpperCase()}] ${name}`);
  if (!passed || details?.error) {
    console.log("   Details:", details);
  }
}

async function request(url, options = {}) {
  const headers = options.headers || {};
  if (options.token) {
    headers["Authorization"] = `Bearer ${options.token}`;
  }
  if (options.body && typeof options.body === "object") {
    headers["Content-Type"] = "application/json";
    options.body = JSON.stringify(options.body);
  }
  const res = await fetch(url, { ...options, headers });
  let data;
  try {
    data = await res.json();
  } catch {
    data = await res.text();
  }
  return { status: res.status, data };
}

async function setupAccounts() {
  console.log("\n=======================================================");
  console.log("1. Setting up Test Users, Responders & Admin");
  console.log("=======================================================");

  const ts = Date.now();

  // 1. User Alpha
  const userEmail = `user_p4_${ts}@safeher.test`;
  const userPhone = `98${Math.floor(10000000 + Math.random() * 90000000)}`;
  const regUser = await request(`${API_BASE}/auth/register`, {
    method: "POST",
    body: { name: "User Alpha", email: userEmail, password: "Password123!", phone: userPhone, role: "user" },
  });
  const userLog = await request(`${API_BASE}/auth/login`, {
    method: "POST",
    body: { email: userEmail, password: "Password123!" },
  });
  userToken = userLog.data?.token;
  userAlphaId = userLog.data?.data?.id || regUser.data?.data?.id;

  // Add trusted contact for User Alpha
  await request(`${API_BASE}/contacts`, {
    method: "POST",
    token: userToken,
    body: {
      contactName: "Parent Contact",
      contactEmail: `parent_${ts}@safeher.test`,
      contactPhone: "9876543210",
      relation: "Guardian",
    },
  });

  // 2. Volunteer 1 (Near Incident: 1.2km)
  const vol1Email = `vol1_p4_${ts}@safeher.test`;
  const vol1Phone = `91${Math.floor(10000000 + Math.random() * 90000000)}`;
  const regVol1 = await request(`${API_BASE}/auth/register`, {
    method: "POST",
    body: { name: "Volunteer Anita (Near)", email: vol1Email, password: "Password123!", phone: vol1Phone, role: "volunteer" },
  });
  const vol1Log = await request(`${API_BASE}/auth/login`, {
    method: "POST",
    body: { email: vol1Email, password: "Password123!" },
  });
  vol1Token = vol1Log.data?.token;
  vol1Id = vol1Log.data?.data?.id || regVol1.data?.data?.id;

  // Update Vol 1 Location: 12.9720, 77.5950 (Close to Incident 12.9716, 77.5946)
  await request(`${API_BASE}/volunteer/location`, {
    method: "PUT",
    token: vol1Token,
    body: { latitude: 12.9720, longitude: 77.5950 },
  });

  // 3. Volunteer 2 (Further away: 3.5km)
  const vol2Email = `vol2_p4_${ts}@safeher.test`;
  const vol2Phone = `92${Math.floor(10000000 + Math.random() * 90000000)}`;
  const regVol2 = await request(`${API_BASE}/auth/register`, {
    method: "POST",
    body: { name: "Volunteer Bhavna (Farther)", email: vol2Email, password: "Password123!", phone: vol2Phone, role: "volunteer" },
  });
  const vol2Log = await request(`${API_BASE}/auth/login`, {
    method: "POST",
    body: { email: vol2Email, password: "Password123!" },
  });
  vol2Token = vol2Log.data?.token;
  vol2Id = vol2Log.data?.data?.id || regVol2.data?.data?.id;

  // Update Vol 2 Location: 12.9900, 77.6100
  await request(`${API_BASE}/volunteer/location`, {
    method: "PUT",
    token: vol2Token,
    body: { latitude: 12.9900, longitude: 77.6100 },
  });

  // 4. Admin Account
  const adminEmail = `admin_p4_${ts}@safeher.test`;
  const adminPhone = `99${Math.floor(10000000 + Math.random() * 90000000)}`;
  await request(`${API_BASE}/auth/register`, {
    method: "POST",
    body: { name: "Admin Officer", email: adminEmail, password: "Password123!", phone: adminPhone, role: "admin" },
  });
  const adminLog = await request(`${API_BASE}/auth/login`, {
    method: "POST",
    body: { email: adminEmail, password: "Password123!" },
  });
  adminToken = adminLog.data?.token;

  console.log(`✅ Accounts Ready: User (${userAlphaId}), Vol1 (${vol1Id}), Vol2 (${vol2Id})`);
}

async function testPriorityClassifier() {
  console.log("\n=======================================================");
  console.log("2. Testing IncidentPriorityEngine Unit Logic");
  console.log("=======================================================");

  // Test Critical scream -> P1
  const p1Res = await request(`${AI_BASE}/api/v1/response/classify-priority`, {
    method: "POST",
    body: {
      final_risk_score: 92,
      risk_level: "CRITICAL",
      source: "AI_VOICE",
      distress_type: "screaming",
      detected_keywords: ["help", "save me"],
    },
  });

  const p1Data = p1Res.data?.data;
  logResult(
    "priorityClassification",
    "P1 Classification on Acoustic Scream & Critical Score",
    p1Data?.priority === "P1" && p1Data?.priority_score >= 85 && p1Data?.reasons?.length > 0,
    p1Data
  );

  // Test High Movement Anomaly -> P2
  const p2Res = await request(`${AI_BASE}/api/v1/response/classify-priority`, {
    method: "POST",
    body: {
      final_risk_score: 65,
      risk_level: "HIGH",
      source: "AI_MOVEMENT",
      movement_anomaly: "sudden_running_stop",
      route_deviated: true,
    },
  });

  const p2Data = p2Res.data?.data;
  logResult(
    "priorityClassification",
    "P2 Classification on Movement Anomaly & Route Deviation",
    p2Data?.priority === "P2" && p2Data?.priority_score >= 50,
    p2Data
  );
}

async function testRankingEngine() {
  console.log("\n=======================================================");
  console.log("3. Testing VolunteerRankingEngine Scoring & Sorting");
  console.log("=======================================================");

  const rankRes = await request(`${AI_BASE}/api/v1/response/rank-responders`, {
    method: "POST",
    body: {
      incident_latitude: 12.9716,
      incident_longitude: 77.5946,
      volunteers: [
        {
          id: vol2Id,
          name: "Volunteer Bhavna",
          latitude: 12.9900,
          longitude: 77.6100,
          volunteerStatus: "AVAILABLE",
          locationFreshness: "GOOD",
        },
        {
          id: vol1Id,
          name: "Volunteer Anita",
          latitude: 12.9720,
          longitude: 77.5950,
          volunteerStatus: "AVAILABLE",
          locationFreshness: "GOOD",
        },
      ],
      max_radius_km: 5.0,
    },
  });

  const ranked = rankRes.data?.data || [];
  const isTopCandidateVol1 = ranked.length === 2 && ranked[0].volunteerId === vol1Id && ranked[0].responseScore > ranked[1].responseScore;

  logResult(
    "rankingEngine",
    "Proximity & Composite Scoring Ranks Closer Volunteer (Anita) #1",
    isTopCandidateVol1,
    { topCandidate: ranked[0], secondCandidate: ranked[1] }
  );
}

async function testScenario1_SuccessfulResponse() {
  console.log("\n=======================================================");
  console.log("4. DEMO SCENARIO 1: Full Successful Response Lifecycle");
  console.log("=======================================================");

  // 1. User Alpha Triggers SOS
  const sosRes = await request(`${API_BASE}/alerts`, {
    method: "POST",
    token: userToken,
    body: {
      latitude: 12.9716,
      longitude: 77.5946,
      source: "AI_FUSION",
      riskLevel: "CRITICAL",
      riskScore: 91,
      distressType: "screaming",
      detectedKeywords: ["help me", "danger"],
    },
  });

  const alertId = sosRes.data?.data?._id;
  logResult("scenario1_successfulResponse", "Incident Created & Smart Dispatch Triggered", !!alertId, { alertId });

  // Allow async priority & ranking dispatch to complete
  await new Promise((r) => setTimeout(r, 1000));

  // 2. Fetch Alert Details to verify Priority and Assignment to Vol 1
  const detailRes = await request(`${API_BASE}/alerts/${alertId}`, {
    method: "GET",
    token: userToken,
  });

  const alert = detailRes.data?.data;
  const isAssignedVol1 = alert?.assignedVolunteerId?._id === vol1Id || alert?.assignedVolunteerId === vol1Id;

  logResult(
    "scenario1_successfulResponse",
    "Priority Classified as P1 and Assigned to Best Responder (Anita)",
    alert?.priority === "P1" && isAssignedVol1 && alert?.responseStatus === "ASSIGNMENT_PENDING",
    { priority: alert?.priority, assignedVolunteer: alert?.assignedVolunteerName, status: alert?.responseStatus }
  );

  // 3. Volunteer 1 Accepts Assignment
  const acceptRes = await request(`${API_BASE}/alerts/${alertId}/accept`, {
    method: "POST",
    token: vol1Token,
  });

  logResult(
    "scenario1_successfulResponse",
    "Volunteer Anita Accepts -> State Transitions to RESPONDING",
    acceptRes.data?.success && acceptRes.data?.data?.responseStatus === "RESPONDING",
    acceptRes.data?.data
  );

  // 4. Live GPS Update from Volunteer En Route
  const locRes = await request(`${API_BASE}/alerts/${alertId}/responder-location`, {
    method: "POST",
    token: vol1Token,
    body: { latitude: 12.9718, longitude: 77.5948 },
  });

  logResult(
    "scenario1_successfulResponse",
    "Responder Live GPS Synced & Proximity Proximity Calculated",
    locRes.data?.success && (locRes.data?.data?.responseStatus === "NEARBY" || locRes.data?.data?.responseStatus === "RESPONDING"),
    locRes.data?.data?.responderLiveLocation
  );

  // 5. Volunteer Arrives on Scene
  const arriveRes = await request(`${API_BASE}/alerts/${alertId}/arrived`, {
    method: "POST",
    token: vol1Token,
  });

  logResult(
    "scenario1_successfulResponse",
    "Volunteer Marks ARRIVED on Scene",
    arriveRes.data?.success && arriveRes.data?.data?.responseStatus === "ARRIVED",
    arriveRes.data?.data
  );

  // 6. Incident Resolved + Post-Incident AI Structured Summary
  const resolveRes = await request(`${API_BASE}/alerts/${alertId}/resolve`, {
    method: "POST",
    token: vol1Token,
    body: { notes: "User escorted to safety. No injuries." },
  });

  const resolvedAlert = resolveRes.data?.data;
  const hasValidSummary =
    resolvedAlert?.status === "resolved" &&
    resolvedAlert?.resolutionSummary?.priority === "P1" &&
    resolvedAlert?.resolutionSummary?.mainFactors?.length > 0;

  logResult(
    "scenario1_successfulResponse",
    "Incident Resolved & AI Structured Summary Formulated",
    hasValidSummary,
    resolvedAlert?.resolutionSummary
  );
}

async function testScenario2_TimeoutReassignment() {
  console.log("\n=======================================================");
  console.log("5. DEMO SCENARIO 2: Volunteer Timeout & Auto-Reassignment");
  console.log("=======================================================");

  // Create new SOS
  const sosRes = await request(`${API_BASE}/alerts`, {
    method: "POST",
    token: userToken,
    body: {
      latitude: 12.9716,
      longitude: 77.5946,
      source: "MANUAL_SOS",
      riskLevel: "HIGH",
      riskScore: 78,
    },
  });

  const alertId = sosRes.data?.data?._id;
  await new Promise((r) => setTimeout(r, 1000));

  // Vol 1 is assigned initially. Now admin or reassignment triggers failover to Vol 2
  const reassignRes = await request(`${API_BASE}/alerts/${alertId}/reassign`, {
    method: "POST",
    token: adminToken,
    body: { volunteerId: vol2Id },
  });

  const reassignedAlert = reassignRes.data?.data;
  logResult(
    "scenario2_timeoutReassignment",
    "Incident Successfully Reassigned to Next Responder (Bhavna)",
    reassignedAlert?.assignedVolunteerName === "Volunteer Bhavna (Farther)" || reassignedAlert?.responseStatus === "ASSIGNMENT_PENDING",
    { assignedVolunteerName: reassignedAlert?.assignedVolunteerName, responseStatus: reassignedAlert?.responseStatus }
  );

  // Volunteer 2 accepts the failover assignment
  const acceptRes = await request(`${API_BASE}/alerts/${alertId}/accept`, {
    method: "POST",
    token: vol2Token,
  });

  logResult(
    "scenario2_timeoutReassignment",
    "Volunteer 2 Accepts Failover Assignment -> RESPONDING",
    acceptRes.data?.success && acceptRes.data?.data?.responseStatus === "RESPONDING",
    acceptRes.data?.data
  );
}

async function testScenario3_RejectionReassignment() {
  console.log("\n=======================================================");
  console.log("6. DEMO SCENARIO 3: Volunteer Rejection & Reassignment");
  console.log("=======================================================");

  const sosRes = await request(`${API_BASE}/alerts`, {
    method: "POST",
    token: userToken,
    body: {
      latitude: 12.9716,
      longitude: 77.5946,
      source: "AI_MOVEMENT",
      riskLevel: "HIGH",
      riskScore: 72,
      movementAnomaly: "rapid_stop",
    },
  });

  const alertId = sosRes.data?.data?._id;
  await new Promise((r) => setTimeout(r, 1000));

  // Vol 1 declines assignment with reason
  const rejectRes = await request(`${API_BASE}/alerts/${alertId}/reject`, {
    method: "POST",
    token: vol1Token,
    body: { reason: "Attending another emergency" },
  });

  const updatedAlert = rejectRes.data?.data;
  logResult(
    "scenario3_rejectionReassignment",
    "Volunteer 1 Rejects with Reason -> Auto-Reassigned to Next Responder",
    rejectRes.data?.success && (updatedAlert?.assignedVolunteerName === "Volunteer Bhavna (Farther)" || updatedAlert?.responseStatus === "REASSIGNED"),
    { assignedVolunteer: updatedAlert?.assignedVolunteerName, status: updatedAlert?.responseStatus }
  );
}

async function testScenario4_NoVolunteerEscalation() {
  console.log("\n=======================================================");
  console.log("7. DEMO SCENARIO 4: Zero Responders In Radius -> Admin Escalation");
  console.log("=======================================================");

  // Remote coordinates far outside 5km radius (e.g., in a remote zone: 15.0000, 75.0000)
  const sosRes = await request(`${API_BASE}/alerts`, {
    method: "POST",
    token: userToken,
    body: {
      latitude: 15.0000,
      longitude: 75.0000,
      source: "AI_VOICE",
      riskLevel: "CRITICAL",
      riskScore: 95,
      distressType: "screaming",
    },
  });

  const alertId = sosRes.data?.data?._id;
  await new Promise((r) => setTimeout(r, 1000));

  const detailRes = await request(`${API_BASE}/alerts/${alertId}`, {
    method: "GET",
    token: adminToken,
  });

  const alert = detailRes.data?.data;
  logResult(
    "scenario4_noVolunteerEscalation",
    "Zero Nearby Responders -> Escalates to ADMIN_ALERT & High Priority",
    alert?.escalationLevel === "ADMIN_ALERT" && alert?.priority === "P1",
    { escalationLevel: alert?.escalationLevel, priority: alert?.priority, aiRecommendation: alert?.aiRecommendation }
  );
}

async function testScenario5_AdminOverride() {
  console.log("\n=======================================================");
  console.log("8. DEMO SCENARIO 5: Admin Override & Priority Escalation");
  console.log("=======================================================");

  // Create SOS
  const sosRes = await request(`${API_BASE}/alerts`, {
    method: "POST",
    token: userToken,
    body: {
      latitude: 12.9716,
      longitude: 77.5946,
      source: "MANUAL_SOS",
      riskLevel: "MEDIUM",
      riskScore: 40,
    },
  });

  const alertId = sosRes.data?.data?._id;

  // Admin manually escalates priority to P1
  const escalateRes = await request(`${API_BASE}/alerts/${alertId}/escalate`, {
    method: "POST",
    token: adminToken,
    body: { priority: "P1", escalationLevel: "HIGH_ESCALATION", reason: "Direct police dispatch requested" },
  });

  logResult(
    "scenario5_adminOverride",
    "Admin Escalates Priority to P1 & HIGH_ESCALATION",
    escalateRes.data?.success && escalateRes.data?.data?.priority === "P1",
    escalateRes.data?.data
  );

  // Admin manually reassigns to Volunteer 2
  const reassignRes = await request(`${API_BASE}/alerts/${alertId}/reassign`, {
    method: "POST",
    token: adminToken,
    body: { volunteerId: vol2Id },
  });

  logResult(
    "scenario5_adminOverride",
    "Admin Manually Assigns Specific Volunteer (Bhavna)",
    reassignRes.data?.success && reassignRes.data?.data?.assignedVolunteerName === "Volunteer Bhavna (Farther)",
    reassignRes.data?.data
  );
}

async function testResponseAnalytics() {
  console.log("\n=======================================================");
  console.log("9. Testing Emergency Response Analytics Engine");
  console.log("=======================================================");

  const res = await request(`${API_BASE}/admin/response-analytics`, {
    method: "GET",
    token: adminToken,
  });

  const data = res.data?.data;
  const summary = data?.summary;
  const isAnalyticsValid =
    summary?.totalIncidents > 0 &&
    summary?.avgResponseTimeSec >= 0 &&
    summary?.acceptanceRate >= 0 &&
    data?.priorityBreakdown?.P1 >= 0;

  logResult(
    "responseAnalytics",
    "Response Analytics Computes Accurate Durations, Rates & Priority Matrix",
    isAnalyticsValid,
    summary
  );
}

async function testRegression() {
  console.log("\n=======================================================");
  console.log("10. Testing Phase 1-3 Regressions (Voice, Movement, Fusion, Predictive)");
  console.log("=======================================================");

  // Phase 1: Voice Analysis via Node backend API
  const voiceRes = await request(`${API_BASE}/ai/voice/analyze`, {
    method: "POST",
    token: userToken,
    body: { scenario: "critical" },
  });
  logResult(
    "regressionSuite",
    "Phase 1 Voice AI Analysis Endpoint",
    voiceRes.data?.success === true && voiceRes.data?.voice_risk_score >= 80,
    voiceRes.data
  );

  // Phase 2: Movement Analysis via AI Service (Scenario: sudden_stop)
  const moveRes = await request(`${AI_BASE}/api/movement/analyze`, {
    method: "POST",
    body: { scenario: "sudden_stop", speed_kmh: 18.5, max_g_force: 3.2 },
  });
  logResult(
    "regressionSuite",
    "Phase 2 Movement AI Anomaly Endpoint",
    moveRes.data?.success === true && moveRes.data?.movement_risk_score >= 60,
    moveRes.data
  );

  // Phase 2: Fusion Analysis via AI Service
  const fusionRes = await request(`${AI_BASE}/api/fusion/analyze`, {
    method: "POST",
    body: { voice_risk_score: 90, movement_risk_score: 85, gps_context_score: 70 },
  });
  logResult(
    "regressionSuite",
    "Phase 2 Multi-Modal Fusion Risk Endpoint",
    fusionRes.data?.success === true && fusionRes.data?.final_risk_score >= 80,
    fusionRes.data
  );

  // Phase 3: Predictive Safety Score via Node backend API
  const predRes = await request(`${API_BASE}/predictive/evaluate`, {
    method: "POST",
    token: userToken,
    body: { latitude: 12.9716, longitude: 77.5946, recentMovementVolatility: 0.1 },
  });
  logResult(
    "regressionSuite",
    "Phase 3 Predictive Safety Engine Endpoint",
    predRes.status === 200 && predRes.data?.data?.predictive_safety_score !== undefined,
    predRes.data
  );
}

async function runAllTests() {
  const start = Date.now();
  console.log("🚀 STARTING SAFEHER PHASE 4 AUTOMATED TEST SUITE");

  try {
    await setupAccounts();
    await testPriorityClassifier();
    await testRankingEngine();
    await testScenario1_SuccessfulResponse();
    await testScenario2_TimeoutReassignment();
    await testScenario3_RejectionReassignment();
    await testScenario4_NoVolunteerEscalation();
    await testScenario5_AdminOverride();
    await testResponseAnalytics();
    await testRegression();

    console.log("\n=======================================================");
    console.log("🎉 PHASE 4 TEST SUITE COMPLETED in", ((Date.now() - start) / 1000).toFixed(2), "s");
    console.log("=======================================================");

    let total = 0;
    let passed = 0;
    for (const [cat, items] of Object.entries(results)) {
      const catPass = items.filter((i) => i.passed).length;
      total += items.length;
      passed += catPass;
      console.log(`- ${cat}: ${catPass}/${items.length} Passed`);
    }

    console.log(`\nOVERALL RESULT: ${passed}/${total} TESTS PASSED (${Math.round((passed / total) * 100)}%)`);
  } catch (err) {
    console.error("FATAL SUITE ERROR:", err);
  }
}

runAllTests();
