const API_BASE = "http://127.0.0.1:5000/api";
const AI_BASE = "http://127.0.0.1:8000";

let userAToken = "";
let userBToken = "";
let adminToken = "";
let userAId = "";
let userBId = "";

const results = {
  apiTests: [],
  scenarios: [],
  security: [],
  regression: [],
  performance: {},
};

async function logResult(category, name, passed, details) {
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
  if (options.body && typeof options.body === "object" && !(options.body instanceof FormData)) {
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

async function setupAuth() {
  console.log("\n--- 1. Setting up Users and Authentication ---");

  const ts = Date.now();
  // 1. User A
  const emailA = `test_user_a_${ts}@safeher.test`;
  const phoneA = `98${Math.floor(10000000 + Math.random() * 90000000)}`;
  await request(`${API_BASE}/auth/register`, {
    method: "POST",
    body: { name: "User Alpha", email: emailA, password: "Password123!", phone: phoneA, role: "user" },
  });
  const loginA = await request(`${API_BASE}/auth/login`, {
    method: "POST",
    body: { email: emailA, password: "Password123!" },
  });
  userAToken = loginA.data?.token;
  userAId = loginA.data?.data?.id;

  // 2. User B
  const emailB = `test_user_b_${ts}@safeher.test`;
  const phoneB = `98${Math.floor(10000000 + Math.random() * 90000000)}`;
  await request(`${API_BASE}/auth/register`, {
    method: "POST",
    body: { name: "User Beta", email: emailB, password: "Password123!", phone: phoneB, role: "user" },
  });
  const loginB = await request(`${API_BASE}/auth/login`, {
    method: "POST",
    body: { email: emailB, password: "Password123!" },
  });
  userBToken = loginB.data?.token;
  userBId = loginB.data?.data?.id;

  // 3. Admin
  const adminEmail = `test_admin_${ts}@safeher.test`;
  const phoneAdmin = `98${Math.floor(10000000 + Math.random() * 90000000)}`;
  await request(`${API_BASE}/auth/register`, {
    method: "POST",
    body: { name: "Admin Test", email: adminEmail, password: "Password123!", phone: phoneAdmin, role: "admin" },
  });
  const loginAdmin = await request(`${API_BASE}/auth/login`, {
    method: "POST",
    body: { email: adminEmail, password: "Password123!" },
  });
  adminToken = loginAdmin.data?.token;

  // Seed a nearby test safe zone for Scenario 1
  await request(`${API_BASE}/admin/safe-zones`, {
    method: "POST",
    token: adminToken,
    body: {
      name: "Central Police Station & Safe Shelter",
      type: "POLICE_STATION",
      address: "123 MG Road",
      latitude: 12.9716,
      longitude: 77.5946,
    },
  });

  console.log(`Auth Ready: User A Token: ${!!userAToken} | User B Token: ${!!userBToken} | Admin Token: ${!!adminToken}`);
}

async function testPredictiveApi() {
  console.log("\n--- 2. Testing API Endpoints & Validation ---");

  // POST /api/predictive/evaluate - Valid
  const resValid = await request(`${API_BASE}/predictive/evaluate`, {
    method: "POST",
    token: userAToken,
    body: { latitude: 12.9716, longitude: 77.5946, recentMovementVolatility: 0.1, hourOverride: 14 },
  });
  logResult(
    "apiTests",
    "POST /api/predictive/evaluate (Valid)",
    resValid.status === 200 && resValid.data?.data?.predictive_safety_score !== undefined,
    { status: resValid.status, score: resValid.data?.data?.predictive_safety_score, confidence: resValid.data?.data?.confidence }
  );

  // POST /api/predictive/evaluate - Missing fields
  const resMissing = await request(`${API_BASE}/predictive/evaluate`, {
    method: "POST",
    token: userAToken,
    body: { latitude: 12.9716 }, // missing longitude
  });
  logResult("apiTests", "POST /api/predictive/evaluate (Missing longitude -> 400)", resMissing.status === 400, {
    status: resMissing.status,
    message: resMissing.data?.message,
  });

  // POST /api/predictive/evaluate - Invalid types
  const resInvalidType = await request(`${API_BASE}/predictive/evaluate`, {
    method: "POST",
    token: userAToken,
    body: { latitude: "not_a_number", longitude: 77.5946 },
  });
  logResult("apiTests", "POST /api/predictive/evaluate (Invalid type -> 400)", resInvalidType.status === 400, {
    status: resInvalidType.status,
    message: resInvalidType.data?.message,
  });

  // POST /api/predictive/evaluate - Boundary coordinates (> 90 lat)
  const resBoundaryLat = await request(`${API_BASE}/predictive/evaluate`, {
    method: "POST",
    token: userAToken,
    body: { latitude: 95.5, longitude: 77.5946 },
  });
  logResult("apiTests", "POST /api/predictive/evaluate (Latitude > 90 -> 400)", resBoundaryLat.status === 400, {
    status: resBoundaryLat.status,
    message: resBoundaryLat.data?.message,
  });

  // POST /api/predictive/evaluate - Unauthenticated
  const resNoAuth = await request(`${API_BASE}/predictive/evaluate`, {
    method: "POST",
    body: { latitude: 12.9716, longitude: 77.5946 },
  });
  logResult("apiTests", "POST /api/predictive/evaluate (No Token -> 401)", resNoAuth.status === 401, {
    status: resNoAuth.status,
  });

  // GET /api/predictive/trends - Valid
  const resTrends = await request(`${API_BASE}/predictive/trends`, {
    method: "GET",
    token: userAToken,
  });
  logResult("apiTests", "GET /api/predictive/trends (User A)", resTrends.status === 200 && Array.isArray(resTrends.data?.data?.history), {
    status: resTrends.status,
    totalEvaluations: resTrends.data?.data?.totalEvaluations,
  });

  // GET /api/predictive/trends - Unauthenticated
  const resTrendsNoAuth = await request(`${API_BASE}/predictive/trends`, {
    method: "GET",
  });
  logResult("apiTests", "GET /api/predictive/trends (No Token -> 401)", resTrendsNoAuth.status === 401, {
    status: resTrendsNoAuth.status,
  });

  // GET /api/predictive/admin-insights - Admin
  const resAdmin = await request(`${API_BASE}/predictive/admin-insights`, {
    method: "GET",
    token: adminToken,
  });
  logResult("apiTests", "GET /api/predictive/admin-insights (Admin Access -> 200)", resAdmin.status === 200, {
    status: resAdmin.status,
    data: resAdmin.data?.data,
  });

  // GET /api/predictive/admin-insights - Normal User Forbidden
  const resAdminForbidden = await request(`${API_BASE}/predictive/admin-insights`, {
    method: "GET",
    token: userAToken,
  });
  logResult("apiTests", "GET /api/predictive/admin-insights (Normal User Forbidden -> 403)", resAdminForbidden.status === 403, {
    status: resAdminForbidden.status,
  });
}

async function testUserIsolation() {
  console.log("\n--- 3. Testing User Data Isolation & Security ---");

  // User A evaluates safety twice
  await request(`${API_BASE}/predictive/evaluate`, {
    method: "POST",
    token: userAToken,
    body: { latitude: 12.9716, longitude: 77.5946, hourOverride: 14 },
  });
  await request(`${API_BASE}/predictive/evaluate`, {
    method: "POST",
    token: userAToken,
    body: { latitude: 12.9720, longitude: 77.5950, hourOverride: 15 },
  });

  // User B evaluates safety once
  await request(`${API_BASE}/predictive/evaluate`, {
    method: "POST",
    token: userBToken,
    body: { latitude: 13.0827, longitude: 80.2707, hourOverride: 10 },
  });

  // Check User A trends
  const trendsA = await request(`${API_BASE}/predictive/trends`, { method: "GET", token: userAToken });
  // Check User B trends
  const trendsB = await request(`${API_BASE}/predictive/trends`, { method: "GET", token: userBToken });

  const countA = trendsA.data?.data?.totalEvaluations;
  const countB = trendsB.data?.data?.totalEvaluations;

  logResult("security", "User Data Isolation (User A & B history strictly isolated)", countA >= 2 && countB === 1, {
    userAEvals: countA,
    userBEvals: countB,
  });
}

async function testPredictiveScenarios() {
  console.log("\n--- 4. Testing Predictive Safety Scenarios & SOS Safety Policy ---");

  // Check initial active alert count
  const initialAlerts = await request(`${API_BASE}/alerts/history`, { method: "GET", token: userAToken });
  const initialCount = Array.isArray(initialAlerts.data?.data) ? initialAlerts.data.data.length : 0;

  // Scenario 1: Daylight + Safe Zone Proximity
  const s1 = await request(`${API_BASE}/predictive/evaluate`, {
    method: "POST",
    token: userAToken,
    body: { latitude: 12.9716, longitude: 77.5946, hourOverride: 14, recentMovementVolatility: 0.05 },
  });
  const score1 = s1.data?.data?.predictive_safety_score;
  const level1 = s1.data?.data?.risk_level;
  logResult("scenarios", "Scenario 1: Daylight + Safe Zone (Low Risk)", score1 <= 35 && level1 === "SAFE", {
    score: score1,
    level: level1,
    warnings: s1.data?.data?.early_warnings,
  });

  // Scenario 2: Late Night (23:00)
  const s2 = await request(`${API_BASE}/predictive/evaluate`, {
    method: "POST",
    token: userAToken,
    body: { latitude: 12.9716, longitude: 77.5946, hourOverride: 23, recentMovementVolatility: 0.1 },
  });
  const score2 = s2.data?.data?.predictive_safety_score;
  const hasNightWarn = s2.data?.data?.early_warnings?.some((w) => w.type === "TEMPORAL_CAUTION");
  logResult("scenarios", "Scenario 2: Late Night (Temporal Caution Warning)", score2 > score1 && hasNightWarn, {
    score: score2,
    hasNightWarn,
  });

  // Scenario 3: High Movement Volatility / Rapid Directional Changes
  const s3 = await request(`${API_BASE}/predictive/evaluate`, {
    method: "POST",
    token: userAToken,
    body: { latitude: 12.9716, longitude: 77.5946, hourOverride: 20, recentMovementVolatility: 0.8 },
  });
  const score3 = s3.data?.data?.predictive_safety_score;
  const hasMoveWarn = s3.data?.data?.early_warnings?.some((w) => w.type === "MOVEMENT_VOLATILITY");
  logResult("scenarios", "Scenario 3: Movement Volatility (Proactive Warning)", hasMoveWarn === true, {
    score: score3,
    hasMoveWarn,
  });

  // Scenario 4: Combined Multi-factor Risk (Isolated Location + Night + Volatility)
  const s4 = await request(`${API_BASE}/predictive/evaluate`, {
    method: "POST",
    token: userAToken,
    body: { latitude: 12.8000, longitude: 77.4000, hourOverride: 2, recentMovementVolatility: 0.95 },
  });
  const score4 = s4.data?.data?.predictive_safety_score;
  logResult("scenarios", "Scenario 4: Combined Risk Factors (Strictly bounded 0-100 & Elevated)", score4 >= 0 && score4 <= 100 && score4 > 50, {
    score: score4,
    riskLevel: s4.data?.data?.risk_level,
  });

  // CRITICAL SAFETY POLICY CHECK: Verify NO automatic emergency alert was created
  const postAlerts = await request(`${API_BASE}/alerts/history`, { method: "GET", token: userAToken });
  const postCount = Array.isArray(postAlerts.data?.data) ? postAlerts.data.data.length : 0;
  const noSosTriggered = postCount === initialCount;
  logResult("scenarios", "CRITICAL SAFETY POLICY: Predictive Risk NEVER triggers Emergency SOS", noSosTriggered, {
    initialAlerts: initialCount,
    postAlerts: postCount,
  });
}

async function testFastAPIIntegration() {
  console.log("\n--- 5. Testing FastAPI Direct & Node Proxy ---");

  const fastApiDirect = await request(`${AI_BASE}/api/v1/predictive/evaluate`, {
    method: "POST",
    body: { latitude: 12.9716, longitude: 77.5946, safe_zones: [{ name: "Post", lat: 12.972, lng: 77.595 }] },
  });
  logResult("regression", "FastAPI Direct /api/v1/predictive/evaluate (200)", fastApiDirect.status === 200 && fastApiDirect.data?.status === "success", {
    status: fastApiDirect.status,
    score: fastApiDirect.data?.data?.predictive_safety_score,
  });

  const fastApiTemporal = await request(`${AI_BASE}/api/v1/predictive/temporal-factor?hour=23`, { method: "GET" });
  logResult("regression", "FastAPI Direct /api/v1/predictive/temporal-factor (200)", fastApiTemporal.status === 200 && fastApiTemporal.data?.data?.hour === 23, {
    temporalScore: fastApiTemporal.data?.data?.temporal_risk_score,
  });
}

async function testPhase1And2Regression() {
  console.log("\n--- 6. Testing Phase 1 & 2 Regression (Voice, Movement, Fusion) ---");

  // Phase 1: Voice AI Live Route (using demo scenario or parameters)
  const voiceRes = await request(`${API_BASE}/ai/voice/analyze`, {
    method: "POST",
    token: userAToken,
    body: {
      scenario: "screaming",
      latitude: 12.9716,
      longitude: 77.5946,
    },
  });
  logResult("regression", "Phase 1 Voice AI (/api/ai/voice/analyze)", voiceRes.status === 200, {
    status: voiceRes.status,
    riskScore: voiceRes.data?.data?.voice_risk_score ?? voiceRes.data?.data?.risk_score,
    riskLevel: voiceRes.data?.data?.risk_level,
  });

  // Phase 2: Movement AI
  const moveRes = await request(`${API_BASE}/ai/movement/analyze`, {
    method: "POST",
    token: userAToken,
    body: {
      accelerometer_samples: [
        { x: 0.1, y: 9.8, z: 0.2, timestamp: Date.now() },
        { x: 0.2, y: 9.7, z: 0.3, timestamp: Date.now() + 100 },
      ],
      scenario: "fall_detected",
      latitude: 12.9716,
      longitude: 77.5946,
    },
  });
  logResult("regression", "Phase 2 Movement AI (/api/ai/movement/analyze)", moveRes.status === 200, {
    status: moveRes.status,
    anomaly: moveRes.data?.data?.anomaly_detected ?? moveRes.data?.anomaly_detected,
  });

  // Phase 2: Multi-Modal Fusion
  const fusionRes = await request(`${API_BASE}/ai/fusion/analyze`, {
    method: "POST",
    token: userAToken,
    body: {
      voice_risk_score: 80,
      movement_risk_score: 75,
      gps_context_score: 60,
    },
  });
  logResult("regression", "Phase 2 Multi-Modal Fusion (/api/ai/fusion/analyze)", fusionRes.status === 200, {
    status: fusionRes.status,
    finalScore: fusionRes.data?.data?.final_risk_score,
    finalLevel: fusionRes.data?.data?.final_risk_level,
  });
}

async function testPerformance() {
  console.log("\n--- 7. Performance & Latency Benchmark ---");

  const start = Date.now();
  const promises = [];
  for (let i = 0; i < 10; i++) {
    promises.push(
      request(`${API_BASE}/predictive/evaluate`, {
        method: "POST",
        token: userAToken,
        body: { latitude: 12.9716 + i * 0.001, longitude: 77.5946 + i * 0.001, hourOverride: 14 },
      })
    );
  }
  const allRes = await Promise.all(promises);
  const duration = Date.now() - start;
  const avg = Math.round(duration / 10);
  const all200 = allRes.every((r) => r.status === 200);

  results.performance = {
    totalRequests: 10,
    totalDurationMs: duration,
    avgLatencyMs: avg,
    successRate: `${(allRes.filter((r) => r.status === 200).length / 10) * 100}%`,
  };

  console.log(`⚡ 10 Concurrent Requests Duration: ${duration}ms (Avg: ${avg}ms/req) | All 200 OK: ${all200}`);
}

async function run() {
  try {
    await setupAuth();
    await testPredictiveApi();
    await testUserIsolation();
    await testPredictiveScenarios();
    await testFastAPIIntegration();
    await testPhase1And2Regression();
    await testPerformance();

    console.log("\n=======================================================");
    console.log("             TEST SUITE EXECUTION SUMMARY              ");
    console.log("=======================================================");
    const totalTests = results.apiTests.length + results.scenarios.length + results.security.length + results.regression.length;
    const passedTests =
      results.apiTests.filter((t) => t.passed).length +
      results.scenarios.filter((t) => t.passed).length +
      results.security.filter((t) => t.passed).length +
      results.regression.filter((t) => t.passed).length;

    console.log(`Total Assertions: ${totalTests} | Passed: ${passedTests} | Failed: ${totalTests - passedTests}`);
    console.log(`Performance: ${JSON.stringify(results.performance)}`);
  } catch (err) {
    console.error("Test Suite Run Error:", err);
  }
}

run();
