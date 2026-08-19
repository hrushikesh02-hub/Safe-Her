# SafeHer — AI-Assisted Women's Safety & Emergency Response Platform

SafeHer is a comprehensive, multi-layered women's safety platform that integrates real-time voice distress detection, movement anomaly intelligence, location awareness, predictive risk analytics, and coordinated community emergency response. Built to operate seamlessly under extreme stress, SafeHer detects critical threat signals, synthesizes multi-sensor inputs into a dynamic risk index, and dispatches automated alerts with live GPS tracking to emergency contacts and nearby verified volunteers.

---

## 📌 Project Objective

Women often face sudden, high-risk situations where manually reaching for a phone, unlocking it, and typing for help is impossible or dangerous. SafeHer addresses this critical vulnerability by combining continuous client-side sensory awareness with server-side AI intelligence:

- **Detect Danger Passively**: Listens for distress keywords and acoustic screams, and monitors accelerometer movement for sudden falls or physical struggles.
- **Understand Risk Dynamically**: Synthesizes sensor telemetry with environmental and temporal context to compute actionable risk scores (0–100).
- **Automate Emergency Dispatch**: Eliminates critical delay by triggering automated SOS sequences with audio/video evidence capture.
- **Coordinate Community Responders**: Mobilizes verified nearby volunteers and provides administrative incident oversight to track incidents through resolution.

---

## 🚀 Key Features by Phase

### Phase 1 — Voice AI Distress Detection
- **Acoustic Energy Analysis**: Analyzes root-mean-square (RMS) energy, spectral centroid frequency (>1800 Hz), and zero-crossing rate to identify loud screams and distress shouts.
- **Spoken Keyword Recognition**: Client-side Web Speech Recognition and backend FastAPI audio processing for emergency phrases (*"HELP ME"*, *"SAVE ME"*, *"EMERGENCY"*, *"BACHAO"*, *"CALL POLICE"*).
- **Fast Automatic SOS Trigger**: Immediately escalates to Critical Risk (95–100) and triggers the emergency countdown.

### Phase 2 — Movement AI, GPS & Multi-Modal Risk Fusion
- **3-Axis Movement Telemetry**: Tracks accelerometer acceleration, rotation, and jerk to detect falls, impact spikes, and abnormal physical agitation.
- **GPS Context Intelligence**: Continuously streams user coordinates, evaluates speed/heading, and calculates proximity to known safe zones.
- **Multi-Modal Risk Fusion Engine**: Mathematical weighted aggregation combining Voice (0.50), Movement (0.30), and GPS Context (0.20) into a unified risk metric.

### Phase 3 — Predictive Safety & Early Warning
- **Temporal & Route Risk Forecasting**: Evaluates situational risk levels based on time of day (late night vs. daytime) and route characteristics.
- **Safe Zones Directory**: Integrated mapping of nearby verified police stations, hospitals, transit hubs, and emergency shelters.
- **Proactive Early Warning**: Alerts users when entering areas with elevated risk profiles before an emergency escalates.

### Phase 4 — Intelligent Emergency Response & Dispatch
- **Incident Priority Engine**: Automatically classifies incidents into priority tiers (`P1 Critical`, `P2 High`, `P3 Moderate`, `P4 Low`) based on distress signals.
- **Volunteer Scoring & Matching**: Calculates proximity, availability, response rating, and transport mode to alert the top-matched local volunteers.
- **Interactive Volunteer Incident Dashboard**: Provides one-tap incident acceptance, turn-by-turn navigation coordinates, victim contact details, and status updates.
- **Incident Timeline & Resolution Audit**: Permanent chronological audit log recording every assignment, location ping, status transition, and resolution note.

### Core Safety & Platform Capabilities
- **One-Tap Panic SOS**: Prominent 1-tap manual emergency button with a 5-second cancel buffer.
- **Emergency Contacts Network**: Manages trusted contacts who automatically receive Brevo-powered emergency alert emails containing live GPS tracking links.
- **Evidence Recording**: Automatically records camera video and microphone audio upon SOS activation, uploading evidence securely to Cloudinary.
- **Admin Command Center**: Real-time map monitoring, volunteer verification approval portal, live incident resolution, and downloadable PDF/CSV incident audit reports.

---

## 🏗️ System Architecture

```text
                               +----------------------------------------+
                               |        User Browser / Mobile PWA       |
                               |    (React 18 / Vite / TailwindCSS)     |
                               +-------------------+--------------------+
                                                   |
                        +--------------------------+--------------------------+
                        | HTTP / REST API                                     | Audio / Telemetry
                        v                                                     v
       +--------------------------------+                    +--------------------------------+
       |     Node.js / Express Server   |                    |       FastAPI AI Service       |
       |          (Port 5000)           |<--- Internal ----->|          (Port 8000)           |
       +----------------+---------------+     REST Proxy     +----------------+---------------+
                        |                                                     |
         +--------------+--------------+                        +-------------+-------------+
         |                             |                        |             |             |
         v                             v                        v             v             v
+------------------+         +-------------------+         +---------+   +---------+   +---------+
|  MongoDB Cluster |         |   Brevo Email API |         | Voice AI|   |Motion AI|   | Fusion  |
|  (Data / State)  |         | (Emergency Alerts)|         | Engine  |   | Engine  |   | Engine  |
+------------------+         +-------------------+         +---------+   +---------+   +---------+
         |                             |
         v                             v
+------------------+         +-------------------+
| Cloudinary CDN   |         | Admin & Volunteer |
| (Media Evidence) |         |  Command Portals  |
+------------------+         +-------------------+
```

---

## 💻 Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 18, TypeScript, Vite, TanStack Router/Start, Tailwind CSS, Lucide Icons, Leaflet / React-Leaflet, Sonner, Recharts |
| **Backend API** | Node.js (v18+ / v20+), Express.js, TypeScript, Mongoose / MongoDB, JSON Web Tokens (JWT), Bcrypt.js, Multer |
| **AI Intelligence Engine** | Python 3.10+, FastAPI, Uvicorn, PyTorch, NumPy, Librosa / Wave native audio processing |
| **Cloud & Communications** | Brevo (Sendinblue) Transactional Email API, Cloudinary Media Storage |

---

## 📁 Project Structure

```text
SafeHer-main/
│
├── src/                               # Frontend React Application
│   ├── components/                    # UI Components (shadcn/ui, layout, cards)
│   │   ├── layout/                    # PublicHeader, PublicFooter, DashboardLayout
│   │   └── ui/                        # Reusable Radix / Tailwind primitives
│   ├── routes/                        # TanStack Router File-Based Pages
│   │   ├── index.tsx                  # Trust-First Public Landing Page
│   │   ├── login.tsx                  # User / Volunteer / Admin Login
│   │   ├── register.tsx               # Account Registration
│   │   ├── user.ai-fusion.tsx         # Safety Shield Multi-Modal Monitoring
│   │   ├── user.ai-voice.tsx          # Voice AI Distress Detector
│   │   ├── user.ai-movement.tsx       # Movement AI & Fall Detection
│   │   ├── user.predictive-safety.tsx # Predictive Safety & Route Trends
│   │   ├── user.sos.tsx               # Emergency SOS & Evidence Capture
│   │   ├── user.contacts.tsx          # Emergency Contacts Management
│   │   ├── volunteer.dashboard.tsx    # Volunteer Responder Feed
│   │   ├── volunteer.incidents.$id.tsx# Incident Response & Navigation
│   │   ├── admin.monitoring.tsx       # Admin Live Incident Command Center
│   │   └── admin.reports.tsx          # Incident PDF Reports & Audit Logs
│   ├── services/                      # Client API Service Connectors
│   ├── lib/                           # Utility functions & audio PCM encoders
│   └── styles.css                     # Global Tailwind & Design System Tokens
│
├── backend/                           # Node.js / Express Backend Server
│   ├── src/
│   │   ├── config/                    # Database (db.ts) & Cloudinary config
│   │   ├── controllers/               # Auth, Incident, Volunteer, Admin controllers
│   │   ├── middleware/                # Auth verification & Role guards (requireAdmin)
│   │   ├── models/                    # Mongoose Schemas (User, Alert, Incident, Contact)
│   │   ├── routes/                    # API Route Handlers
│   │   ├── services/                  # Brevo Email, Incident Priority & Volunteer Ranking
│   │   └── server.ts                  # Express Server Entry Point
│   ├── package.json                   # Backend Dependencies
│   └── tsconfig.json                  # Backend TypeScript Configuration
│
├── ai-service/                        # Python / FastAPI AI Microservice
│   ├── app/
│   │   ├── routers/                   # AI API Endpoints (voice, movement, fusion, predictive)
│   │   ├── services/                  # Distress detector, audio processor, fusion engine
│   │   └── main.py                    # FastAPI Application Entry
│   └── requirements.txt               # Python Dependencies
│
├── vite.config.ts                     # Standard Vite + React Configuration
├── package.json                       # Frontend Dependencies & Scripts
└── README.md                          # Project Documentation
```

---

## ⚙️ Installation & Setup

### Prerequisites
- **Node.js**: v18.17.0 or v20.x+
- **npm**: v9.x+
- **Python**: v3.10 or v3.11+
- **MongoDB**: Local MongoDB instance (`mongodb://127.0.0.1:27017/safeher`) or MongoDB Atlas URI

---

### 1. AI Service Setup (Terminal 1)

```bash
cd ai-service

# Create and activate Python virtual environment
python -m venv venv

# Windows:
.\venv\Scripts\activate

# macOS / Linux:
# source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start FastAPI server on port 8000
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```
*Health Check*: Open `http://127.0.0.1:8000/health` in your browser (should return `{"status":"healthy"}`).

---

### 2. Backend Server Setup (Terminal 2)

```bash
cd backend

# Install dependencies
npm install

# Compile TypeScript and start Express API server on port 5000
npm run dev
```
*Health Check*: Open `http://127.0.0.1:5000/` in your browser.

---

### 3. Frontend Web Client Setup (Terminal 3)

```bash
# In the root SafeHer-main directory:
npm install

# Start Vite dev server on port 8080
npm run dev
```
*Application Access*: Open [http://localhost:8080/](http://localhost:8080/) in your browser.

---

## 🔐 Environment Variables

Create `.env` files in their respective folders using the templates below.

### Backend (`backend/.env`)
```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://127.0.0.1:27017/safeher
JWT_SECRET=your_jwt_secret_key_here
AI_SERVICE_URL=http://127.0.0.1:8000

# Brevo (Sendinblue) Transactional Email
BREVO_API_KEY=your_brevo_api_key_here
EMAIL_FROM=alerts@safeher.org
EMAIL_FROM_NAME=SafeHer Emergency System

# Cloudinary (Evidence Video & Audio Uploads)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
```

### AI Service (`ai-service/.env`)
```env
PORT=8000
HOST=127.0.0.1
DEBUG=True
MODEL_DIR=app/models
```

---

## 📡 API Reference

### Backend Endpoints (`http://127.0.0.1:5000`)

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :---: |
| `POST` | `/api/auth/register` | Register a new User or Volunteer account | No |
| `POST` | `/api/auth/login` | Authenticate user and receive JWT bearer token | No |
| `GET` | `/api/auth/me` | Fetch profile of current authenticated user | User / Vol / Admin |
| `POST` | `/api/alerts/sos` | Trigger manual emergency SOS incident | User |
| `POST` | `/api/ai/voice/analyze` | Process audio file or transcript for distress | User |
| `POST` | `/api/ai/voice/trigger-sos` | Automatically create SOS incident from voice AI | User |
| `POST` | `/api/ai/fusion/analyze` | Calculate Multi-Modal Risk Fusion score | User |
| `POST` | `/api/ai/fusion/trigger-sos`| Create emergency incident from Safety Shield | User |
| `GET` | `/api/contacts` | Retrieve user's configured emergency contacts | User |
| `POST` | `/api/contacts` | Add a new emergency contact | User |
| `GET` | `/api/volunteer/incidents` | Fetch active emergency alerts for volunteers | Volunteer |
| `POST` | `/api/volunteer/incidents/:id/accept` | Accept and respond to an emergency alert | Volunteer |
| `GET` | `/api/admin/incidents` | Fetch all system alerts and live locations | Admin |
| `PUT` | `/api/admin/incidents/:id/resolve` | Mark an active incident as resolved | Admin |
| `POST` | `/api/admin/incidents/:id/evidence` | Upload recorded audio/video evidence | User / Admin |
| `GET` | `/api/admin/reports` | Generate incident audit logs & summary stats | Admin |

### AI Microservice Endpoints (`http://127.0.0.1:8000`)

| Method | Endpoint | Input | Output |
| :--- | :--- | :--- | :--- |
| `GET` | `/health` | None | `{"status": "healthy"}` |
| `POST` | `/api/voice/analyze` | Audio WAV file or transcript string | Distress classification, keyword matches, voice risk score (0–100) |
| `POST` | `/api/movement/analyze` | Accelerometer `{x, y, z}` arrays | Anomaly classification, movement risk score (0–100) |
| `POST` | `/api/fusion/analyze` | `{voice_risk_score, movement_risk_score, gps_context_score}` | Synthesized final risk score, risk level, recommendation |
| `POST` | `/api/predictive/evaluate`| `{lat, lng, hour, route_type}` | Risk trend forecast, early warning alert level |

---

## 👥 User Roles & Access Control

1. **User (`USER`)**:
   - Access to User Dashboard, Safety Shield, Manual SOS, Voice AI, Movement AI, Predictive Safety, and Emergency Contacts.
2. **Volunteer (`VOLUNTEER`)**:
   - Access to Volunteer Responder Feed, Incident Acceptance, Navigation Coordinates, and Responder Profile.
3. **Admin (`ADMIN`)**:
   - Access to Admin Incident Command Center, Volunteer Verification Management, Live Evidence Playback, Incident Resolution, and Exportable Reports.

---

## 🧪 Testing & Verification

```bash
# Run Frontend Typecheck & Production Build
npm run build

# Run Backend TypeScript Compilation
cd backend && npm run build

# Clean Active Alerts Database (for Fresh Testing)
cd backend && npx ts-node src/tests/cleanAlerts.ts
```

### Pre-Configured Test Accounts

| Role | Email | Password |
| :--- | :--- | :--- |
| **User** | `hrushi2402@gmail.com` | `12345678` |
| **Volunteer** | `hrushikeshthombare95@gmail.com` | `12345678` |
| **Admin** | `grajp2405@gmail.com` | `12345678` |

---

## 🔒 Security & Privacy Practices

- **Zero Hardcoded Secrets**: Secrets and API tokens are loaded strictly from environment files.
- **Strict Role Isolation**: API middleware verifies JWT role claims before granting access to volunteer feeds or admin command endpoints.
- **Scoped Location Transmission**: Geolocation is transmitted only during active safety monitoring or active incident states.
- **Protected Evidence Records**: Incident evidence is linked directly to unique incident IDs and stored in secure Cloudinary storage.

---

## 📄 License & Important Notice

SafeHer is an assistive personal safety and emergency coordination platform. AI evaluations are assistive and situational. In an immediate life-threatening crisis, users should always dial official local emergency services directly (Police: 112 / 100, Women Helpline: 1091).
