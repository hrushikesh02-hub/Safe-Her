# SafeHer — AI Voice SOS Integration (Phase 2)

## Architecture Overview

```
Browser Mic / Demo Scenario
        ↓
React Frontend (user.ai-voice.tsx)
        ↓ FormData (audio blob or scenario id)
Node.js Backend  POST /api/ai/voice/analyze
        ↓ FormData
FastAPI AI Service  POST /api/voice/analyze
        ↓ JSON (distress_detected, risk_level, risk_score …)
Node.js Backend
        ↓ result sent to frontend
Frontend evaluates confirmation logic
        ↓ (2× CRITICAL in 30s window)
10-second cancellation countdown
        ↓ (if not cancelled)
POST /api/ai/voice/trigger-sos  ← GPS + AI metadata
        ↓
Alert created in MongoDB (source: AI_VOICE)
        ↓ fire-and-forget
    ┌───────────┬────────────────────┐
    ↓           ↓                   ↓
Contact      Nearby Volunteer    Admin sees
Emails       Emails (Haversine)   alert with
             + dashboard badge    AI metadata
```

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Default | Description |
|---|---|---|
| `AI_SERVICE_URL` | `http://127.0.0.1:8000` | FastAPI AI service base URL |
| `VOICE_CRITICAL_THRESHOLD` | `76` | Minimum risk_score to count as critical |
| `REPEATED_DISTRESS_COUNT` | `2` | Consecutive critical events needed to confirm SOS |
| `REPEATED_DISTRESS_WINDOW` | `30` | Rolling window in seconds for confirmation |
| `VOLUNTEER_RADIUS_KM` | `5` | Radius in km to search for nearby volunteers |
| `BREVO_API_KEY` | *(required)* | Brevo (formerly Sendinblue) transactional email API key |
| `EMAIL_USER` | *(set)* | Sender email shown in outgoing emails |
| `MONGO_URI` | *(set)* | MongoDB Atlas connection string |
| `JWT_SECRET` | *(set)* | JWT signing secret |

---

## How to Start All Services

### 1. FastAPI AI Service
```bash
cd ai-service
# First time only:
python -m venv venv
venv\Scripts\activate        # Windows
pip install -r requirements.txt

# Start:
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

### 2. Node.js Backend
```bash
cd backend
npm install        # first time
npm run dev        # ts-node-dev with hot reload
# Runs on http://localhost:5000
```

### 3. React Frontend
```bash
# From project root
npm install        # first time
npm run dev        # Vite dev server
# Runs on http://localhost:5173 (or similar)
```

---

## API Endpoints Added

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/ai/voice/analyze` | User JWT | Analyze audio or demo scenario |
| `GET` | `/api/ai/voice/scenarios` | User JWT | List demo scenario IDs |
| `POST` | `/api/ai/voice/trigger-sos` | User JWT | Create AI Voice SOS incident |
| `PUT` | `/api/volunteer/location` | Volunteer JWT | Update volunteer GPS location |

### POST `/api/ai/voice/trigger-sos` body
```json
{
  "latitude": 18.5204,
  "longitude": 73.8567,
  "riskLevel": "CRITICAL",
  "riskScore": 92,
  "distressType": "scream",
  "confidence": 0.94,
  "detectedKeywords": []
}
```

### Response
```json
{
  "success": true,
  "message": "AI Voice SOS triggered successfully",
  "isDuplicate": false,
  "data": {
    "_id": "...",
    "source": "AI_VOICE",
    "status": "active",
    "riskLevel": "CRITICAL",
    "riskScore": 92,
    ...
  }
}
```

If a duplicate active AI_VOICE alert exists within 5 minutes, `isDuplicate: true` is returned with the existing alert.

---

## Automatic SOS Flow

1. User enables **AI Voice Monitoring** (explicit mic permission)
2. Audio captured in 5-second chunks via `MediaRecorder`
3. Each chunk sent to `POST /api/ai/voice/analyze` → FastAPI → result
4. Frontend confirmation logic:
   - Count `CRITICAL`/`HIGH` events where `voice_risk_score ≥ 76` within a 30-second window
   - At **1 event** → show amber warning banner ("Monitoring for confirmation…")
   - At **2 events** → start **10-second cancellation countdown**
5. If user presses **Cancel Emergency** → SOS aborted, monitoring continues
6. If countdown expires → `POST /api/ai/voice/trigger-sos` sent automatically
7. Backend creates `Alert` with `source: AI_VOICE`
8. Fire-and-forget notifications:
   - Emergency contacts receive email (with AI metadata: riskLevel, distressType)
   - Nearby available volunteers (within 5km with registered GPS) receive email
9. Volunteer dashboard shows alert with `AI VOICE` badge and risk info
10. Admin dashboard shows alert with `AI VOICE` badge and risk info

---

## GPS Flow

- Frontend (`user.ai-voice.tsx`) uses `navigator.geolocation.watchPosition` continuously
- Current location passed in the SOS payload when triggered
- If GPS unavailable → error shown, SOS not sent (user directed to manual SOS)
- Volunteers register location via `PUT /api/volunteer/location` (auto-called on dashboard load)

---

## Volunteer Email Alert

Sent to volunteers within `VOLUNTEER_RADIUS_KM` (default 5km) who have a registered GPS location.

**Subject:** `🚨 SAFEHER EMERGENCY ALERT — Immediate Assistance Required`

Contains: risk level, risk score, detection type, distance from volunteer, map link, incident ID.

> ⚠️ Volunteers without a registered GPS location are **excluded** from the proximity search. They still see all active alerts in their dashboard.

---

## Duplicate SOS Protection

- Server checks for any `AI_VOICE` alert for the same user with status `active/accepted` created within the last **5 minutes**
- If found → returns existing alert (`isDuplicate: true`) instead of creating a new one
- Frontend also disables re-triggering once `emergencyState === "active"`

---

## Manual SOS — Still Works

The manual SOS button at `/user/sos` sends `POST /api/alerts` which still works **exactly as before**.

Differences:
| | Manual SOS | AI Voice SOS |
|---|---|---|
| Endpoint | `POST /api/alerts` | `POST /api/ai/voice/trigger-sos` |
| `source` field | `MANUAL_SOS` | `AI_VOICE` |
| AI metadata | Not stored | Stored (riskScore, distressType…) |
| Trigger | User button press | Automatic confirmation logic |
| Volunteer email | Yes | Yes |
| Contact email | Yes | Yes |

---

## Demo Procedure

### Demo 1 — Normal Voice (No SOS)
1. Open `/user/ai-voice`
2. Click **Normal Speech** → Result: `LOW`, risk 12 — no SOS triggered

### Demo 2 — Automatic SOS via Scream
1. Click **Scream Sound (Critical Risk)** once → amber warning appears
2. Click **Scream Sound (Critical Risk)** again within 30s → countdown starts
3. Wait 10s (or click **Trigger Now**) → SOS created
4. Check volunteer dashboard → `AI VOICE` badge on new alert
5. Check admin dashboard → AI VOICE alert with riskScore/distressType

### Demo 3 — Help Keyword SOS
1. Click **Keyword: "Help / Save Me"** twice within 30s → SOS triggered with `detectedKeywords`

### Demo 4 — Cancel Emergency
1. Trigger scream twice → countdown appears
2. Click **Cancel Emergency** → no SOS created

### Demo 5 — Duplicate Protection
1. Trigger a scream SOS (it gets created)
2. Trigger another scream within 5 min → same incident returned, no duplicate created

### Demo 6 — Manual SOS still works
1. Go to `/user/sos` → press big SOS button → works exactly as before

---

## Files Created / Modified

### Backend
| File | Change |
|---|---|
| `backend/src/models/Alert.ts` | Added `source`, `riskLevel`, `riskScore`, `distressType`, `confidence`, `detectedKeywords` |
| `backend/src/models/User.ts` | Added `lastKnownLatitude`, `lastKnownLongitude`, `lastLocationAt` |
| `backend/src/controllers/alertController.ts` | Haversine proximity search, volunteer email, contact email updated, `notifyContactsAndVolunteers()` helper |
| `backend/src/routes/aiVoiceRoutes.ts` | Added `POST /trigger-sos` with duplicate protection |
| `backend/src/controllers/volunteerController.ts` | Added `updateVolunteerLocation()` |
| `backend/src/routes/volunteerRoutes.ts` | Added `PUT /location` route |
| `backend/.env` | Added AI/voice/volunteer env vars |

### Frontend
| File | Change |
|---|---|
| `src/services/voiceSosService.ts` | **NEW** — `triggerVoiceSOS()` + `updateVolunteerLocation()` |
| `src/routes/user.ai-voice.tsx` | Confirmation logic, emergency overlay, 10s countdown, auto-SOS, GPS, incident display |
| `src/routes/volunteer.dashboard.tsx` | Source badge, AI metadata, location sharing, maps link |
| `src/routes/admin.dashboard.tsx` | Source badge, AI metadata, maps link |
| `src/services/volunteerService.ts` | Added `updateVolunteerLocation()` |

---

## Known Limitations

1. **Volunteer location** must be registered via dashboard visit — no background tracking
2. **GPS required** for automatic SOS — if denied, manual SOS button must be used
3. **Brevo API key** must be configured for emails to be delivered
4. **AI service must be running** locally — if offline, demo fallback responses are used (correct behavior)
5. **5km radius** is configurable but volunteers without GPS registration are excluded from email
6. Audio is **not permanently stored** — only analysis metadata is saved
