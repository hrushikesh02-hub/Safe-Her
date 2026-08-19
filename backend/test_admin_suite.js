/**
 * SafeHer Admin Dashboard Redesign & Emergency Command Center Test Suite
 */

const API_BASE = "http://127.0.0.1:5000/api";

let adminToken = "";
let adminId = "";
let userToken = "";
let userId = "";
let volunteerToken = "";
let volunteerId = "";
let testAlertId = "";

const results = {
  commandCenterStats: [],
  volunteerVerification: [],
  emergencyEvidence: [],
  incidentReporting: [],
  accessControlAndSecurity: [],
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
  let body = options.body;
  if (body && typeof body === "object" && !(body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(body);
  }
  const res = await fetch(url, { ...options, headers, body });
  let data = null;
  try {
    const text = await res.text();
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  } catch {
    data = null;
  }
  return { status: res.status, data };
}

async function setup() {
  console.log("\n=======================================================");
  console.log("1. Setting Up Test Accounts & Baseline Incidents");
  console.log("=======================================================");

  const ts = Date.now();

  // 1. Admin
  const adminEmail = `admin_cc_${ts}@safeher.test`;
  const regAdmin = await request(`${API_BASE}/auth/register`, {
    method: "POST",
    body: { name: "Command Center Admin", email: adminEmail, password: "Password123!", phone: `99${Math.floor(10000000 + Math.random() * 90000000)}`, role: "admin" },
  });
  const adminLog = await request(`${API_BASE}/auth/login`, {
    method: "POST",
    body: { email: adminEmail, password: "Password123!" },
  });
  adminToken = adminLog.data?.token;
  adminId = adminLog.data?.data?.id || regAdmin.data?.data?.id;

  // 2. User
  const userEmail = `user_cc_${ts}@safeher.test`;
  const regUser = await request(`${API_BASE}/auth/register`, {
    method: "POST",
    body: { name: "User Radha", email: userEmail, password: "Password123!", phone: `98${Math.floor(10000000 + Math.random() * 90000000)}`, role: "user" },
  });
  const userLog = await request(`${API_BASE}/auth/login`, {
    method: "POST",
    body: { email: userEmail, password: "Password123!" },
  });
  userToken = userLog.data?.token;
  userId = userLog.data?.data?.id || regUser.data?.data?.id;

  // 3. Unverified Volunteer Applicant
  const volEmail = `vol_applicant_${ts}@safeher.test`;
  const regVol = await request(`${API_BASE}/auth/register`, {
    method: "POST",
    body: { name: "Volunteer Applicant Kavita", email: volEmail, password: "Password123!", phone: `97${Math.floor(10000000 + Math.random() * 90000000)}`, role: "volunteer" },
  });
  const volLog = await request(`${API_BASE}/auth/login`, {
    method: "POST",
    body: { email: volEmail, password: "Password123!" },
  });
  volunteerToken = volLog.data?.token;
  volunteerId = volLog.data?.data?.id || regVol.data?.data?.id;

  // 4. Create an active P1 Emergency Incident
  const sosRes = await request(`${API_BASE}/alerts`, {
    method: "POST",
    token: userToken,
    body: {
      latitude: 12.9716,
      longitude: 77.5946,
      source: "AI_FUSION",
      riskLevel: "CRITICAL",
      riskScore: 94,
      distressType: "scream",
      detectedKeywords: ["bachao", "emergency"],
    },
  });
  testAlertId = sosRes.data?.data?._id;

  console.log(`✅ Accounts Ready: Admin (${adminId}), User (${userId}), Volunteer (${volunteerId}), Alert (${testAlertId})`);
}

async function testCommandCenterStats() {
  console.log("\n=======================================================");
  console.log("2. Testing Emergency Command Center Top Statistics");
  console.log("=======================================================");

  const res = await request(`${API_BASE}/admin/dashboard`, {
    method: "GET",
    token: adminToken,
  });

  const stats = res.data?.data;
  const isValid =
    stats?.activeAlerts > 0 &&
    stats?.criticalIncidents >= 1 &&
    stats?.pendingVerifications >= 1 &&
    stats?.totalUsers >= 1;

  logResult(
    "commandCenterStats",
    "GET /api/admin/dashboard returns 5 real-time command metrics",
    res.status === 200 && isValid,
    stats
  );
}

async function testVolunteerVerification() {
  console.log("\n=======================================================");
  console.log("3. Testing Volunteer Verification, Emails & Retry Flow");
  console.log("=======================================================");

  // 1. Get Pending list
  const listRes = await request(`${API_BASE}/admin/volunteers?status=pending`, {
    method: "GET",
    token: adminToken,
  });
  const hasApplicant = listRes.data?.data?.some((v) => v._id === volunteerId);
  logResult("volunteerVerification", "Applicant appears in Pending Verifications list", hasApplicant);

  // 2. Approve Volunteer
  const approveRes = await request(`${API_BASE}/admin/volunteers/${volunteerId}/verify`, {
    method: "POST",
    token: adminToken,
  });
  const volApproved = approveRes.data?.data;
  logResult(
    "volunteerVerification",
    "Admin Approves Volunteer -> status APPROVED, isVerified = true",
    volApproved?.isVerified === true && volApproved?.verificationStatus === "APPROVED",
    { verificationStatus: volApproved?.verificationStatus, emailStatus: approveRes.data?.emailStatus }
  );

  // 3. Resend Verification Email
  const resendRes = await request(`${API_BASE}/admin/volunteers/${volunteerId}/resend-email`, {
    method: "POST",
    token: adminToken,
  });
  logResult("volunteerVerification", "Admin can Resend Verification Email on demand", resendRes.status === 200 && resendRes.data?.success);

  // 4. Reject Volunteer with Reason
  const rejectRes = await request(`${API_BASE}/admin/volunteers/${volunteerId}/reject`, {
    method: "POST",
    token: adminToken,
    body: { reason: "Incomplete address proof" },
  });
  const volRejected = rejectRes.data?.data;
  logResult(
    "volunteerVerification",
    "Admin Rejects Volunteer -> status REJECTED with specific reason",
    volRejected?.verificationStatus === "REJECTED" && volRejected?.rejectionReason === "Incomplete address proof",
    volRejected
  );
}

async function testEmergencyEvidence() {
  console.log("\n=======================================================");
  console.log("4. Testing Emergency Audio/Video Evidence Capture & Streaming");
  console.log("=======================================================");

  // Create multipart audio blob simulation
  const formData = new FormData();
  const dummyAudio = new Blob(["RIFFdummyWAVevidenceContent12345"], { type: "audio/wav" });
  formData.append("media", dummyAudio, "emergency_voice_test.wav");
  formData.append("mediaType", "AUDIO");
  formData.append("durationSec", "6");

  // Upload Evidence for Incident
  const uploadRes = await fetch(`${API_BASE}/alerts/${testAlertId}/evidence`, {
    method: "POST",
    headers: { Authorization: `Bearer ${userToken}` },
    body: formData,
  });
  const uploadJson = await uploadRes.json();

  logResult(
    "emergencyEvidence",
    "POST /api/alerts/:id/evidence records audio evidence & updates status to CAPTURED",
    uploadRes.status === 200 && uploadJson.data?.evidenceStatus === "CAPTURED" && !!uploadJson.data?.audioRecording?.url,
    uploadJson
  );

  // Admin accesses evidence metadata & creates audit log
  const getEvRes = await request(`${API_BASE}/alerts/${testAlertId}/evidence`, {
    method: "GET",
    token: adminToken,
  });
  const evData = getEvRes.data?.data;
  logResult(
    "emergencyEvidence",
    "GET /api/alerts/:id/evidence returns evidence metadata & records access audit log",
    getEvRes.status === 200 && evData?.evidenceStatus === "CAPTURED" && evData?.accessLogs?.length >= 1,
    evData
  );

  // Stream actual evidence file
  if (evData?.audioRecording?.url) {
    const streamRes = await request(`http://127.0.0.1:5000${evData.audioRecording.url}`, {
      method: "GET",
      token: adminToken,
    });
    logResult("emergencyEvidence", "Evidence streaming endpoint serves binary media stream", streamRes.status === 200);
  }
}

async function testIncidentReporting() {
  console.log("\n=======================================================");
  console.log("5. Testing Incident Report Data Compilation & History Filter");
  console.log("=======================================================");

  // 1. Get deep structured single incident report
  const repRes = await request(`${API_BASE}/admin/incidents/${testAlertId}/report-data`, {
    method: "GET",
    token: adminToken,
  });

  const rep = repRes.data?.data;
  const isReportValid =
    rep?.incidentId === testAlertId &&
    rep?.priority === "P1" &&
    rep?.detectionSummary?.voiceRisk !== undefined &&
    rep?.responseMetrics?.assignmentDelaySec !== undefined &&
    rep?.timeline !== undefined &&
    rep?.aiSummary !== undefined;

  logResult(
    "incidentReporting",
    "GET /api/admin/incidents/:id/report-data compiles deep structured report payload",
    isReportValid,
    { incidentType: rep?.incidentType, priority: rep?.priority, duration: rep?.responseMetrics?.formattedTotalDuration }
  );

  // 2. Filter incidents list
  const listRes = await request(`${API_BASE}/admin/incidents?priority=P1&status=active`, {
    method: "GET",
    token: adminToken,
  });

  logResult(
    "incidentReporting",
    "GET /api/admin/incidents supports multi-criteria filtering for master table",
    listRes.status === 200 && listRes.data?.data?.incidents?.length >= 1,
    { total: listRes.data?.data?.total }
  );
}

async function testAccessControlAndSecurity() {
  console.log("\n=======================================================");
  console.log("6. Testing Access Control & Sensitive Evidence Protection");
  console.log("=======================================================");

  // Normal user attempting to access admin evidence audit logs -> Should be blocked 403
  const userBlocked = await request(`${API_BASE}/alerts/${testAlertId}/evidence/logs`, {
    method: "GET",
    token: userToken,
  });
  logResult(
    "accessControlAndSecurity",
    "Normal User is FORBIDDEN (403) from accessing sensitive evidence logs",
    userBlocked.status === 403
  );

  // Normal user attempting to access admin dashboard stats -> Should be blocked 403
  const dashBlocked = await request(`${API_BASE}/admin/dashboard`, {
    method: "GET",
    token: userToken,
  });
  logResult(
    "accessControlAndSecurity",
    "Normal User is FORBIDDEN (403) from accessing admin command center endpoints",
    dashBlocked.status === 403
  );
}

async function run() {
  const start = Date.now();
  console.log("🚀 STARTING SAFEHER ADMIN COMMAND CENTER AUTOMATED TEST SUITE");

  try {
    await setup();
    await testCommandCenterStats();
    await testVolunteerVerification();
    await testEmergencyEvidence();
    await testIncidentReporting();
    await testAccessControlAndSecurity();

    console.log("\n=======================================================");
    console.log("🎉 ADMIN COMMAND CENTER TEST SUITE COMPLETED in", ((Date.now() - start) / 1000).toFixed(2), "s");
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

run();
