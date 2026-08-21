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
| **AI Intelligence Engine** | Python 3.10+, FastAPI, Uvicorn, NumPy, SciPy, Librosa / Soundfile audio processing |
| **Cloud & Communications** | Brevo (Sendinblue) Transactional Email API, Cloudinary Media Storage |

---

## 📁 Project Structure

```text
SafeHer-main/
├── frontend/                          # React + TanStack Router/Start Web Client
│   ├── src/
│   │   ├── components/                # UI Components (shadcn/ui, layout, map, cards)
│   │   ├── routes/                    # File-based page routes (User, Volunteer, Admin)
│   │   ├── services/                  # Client API connectors
│   │   ├── context/                   # Auth and global state
│   │   └── styles.css                 # Design system tokens & Tailwind CSS
│   ├── package.json                   # Frontend dependencies & build scripts
│   ├── vite.config.ts                 # Vite + React configuration
│   ├── tsconfig.json                  # Frontend TypeScript configuration
│   └── .env.example                   # Frontend environment template
│
├── backend/                           # Node.js / Express TypeScript API
│   ├── src/
│   │   ├── config/                    # MongoDB (db.ts) & Cloudinary configuration
│   │   ├── controllers/               # Auth, Alert, Incident, Volunteer, Admin controllers
│   │   ├── middleware/                # Auth tokens & Role-based guards
│   │   ├── models/                    # Mongoose schemas (User, Alert, Contact, Event)
│   │   ├── routes/                    # Express REST endpoints
│   │   ├── services/                  # Brevo email, volunteer ranking, incident priority
│   │   └── server.ts                  # Server entry point
│   ├── package.json                   # Backend dependencies
│   ├── tsconfig.json                  # Backend TypeScript configuration
│   └── .env.example                   # Backend environment template
│
└── ai-service/                        # Python / FastAPI Machine Learning Microservice
    ├── app/
    │   ├── routes/                    # Voice, Movement, Fusion, Predictive endpoints
    │   ├── services/                  # Distress detector, audio feature extractor
    │   └── main.py                    # FastAPI application entry
    ├── requirements.txt               # Python dependencies (fastapi, uvicorn, librosa, numpy)
    └── README.md                      # AI service documentation
```

---

## ⚙️ Local Installation & Development

### Prerequisites
- **Node.js**: v18.17.0 or v20.x+
- **npm**: v9.x+
- **Python**: v3.10+
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
*Health Check*: Open `http://127.0.0.1:8000/` or `http://127.0.0.1:8000/docs` in your browser.

---

### 2. Backend Server Setup (Terminal 2)

```bash
cd backend

# Install dependencies
npm install

# Start Express server with auto-reload on port 5000
npm run dev
```
*Health Check*: Open `http://127.0.0.1:5000/` in your browser.

---

### 3. Frontend Web Client Setup (Terminal 3)

```bash
cd frontend

# Install dependencies
npm install

# Start Vite dev server on port 8080
npm run dev
```
*Application Access*: Open [http://localhost:8080/](http://localhost:8080/) in your browser.

---

## 🌐 Production Deployment Guide

Deploy the three microservices in the following order:

```text
[ Step 1: Deploy AI Service on Render ]
                 │ (e.g. https://safeher-ai.onrender.com)
                 ▼
[ Step 2: Deploy Backend on Render ]
                 │ (e.g. https://safeher-backend.onrender.com)
                 ▼
[ Step 3: Deploy Frontend on Vercel ]
```

### 1. Deploy `ai-service` on Render
1. Create a new **Web Service** on [Render](https://dashboard.render.com/).
2. Select your GitHub repository.
3. Settings:
   - **Root Directory**: `ai-service`
   - **Environment**: `Python 3`
   - **Build Command**: `pip install --upgrade pip && pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
4. Copy the assigned URL (e.g., `https://safeher-ai-service.onrender.com`).

### 2. Deploy `backend` on Render
1. Create a new **Web Service** on [Render](https://dashboard.render.com/).
2. Select your GitHub repository.
3. Settings:
   - **Root Directory**: `backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
4. Add Environment Variables:
   - `PORT` = `5000`
   - `MONGO_URI` = `mongodb+srv://<user>:<password>@cluster.mongodb.net/safeher?retryWrites=true&w=majority`
   - `JWT_SECRET` = `<your-jwt-secret>`
   - `AI_SERVICE_URL` = `https://safeher-ai-service.onrender.com`
   - `GOOGLE_MAPS_API_KEY` = `<your-google-maps-api-key>`
   - `CLOUDINARY_CLOUD_NAME` = `<your-cloudinary-name>`
   - `CLOUDINARY_API_KEY` = `<your-cloudinary-api-key>`
   - `CLOUDINARY_API_SECRET` = `<your-cloudinary-secret>`
   - `BREVO_API_KEY` = `<your-brevo-api-key>`
   - `BREVO_SENDER_EMAIL` = `<your-verified-sender-email>`
   - `BREVO_SENDER_NAME` = `SafeHer Emergency System`
5. Copy the assigned backend URL (e.g., `https://safeher-backend.onrender.com`).

### 3. Deploy `frontend` on Vercel
1. Import your GitHub repository in [Vercel](https://vercel.com/dashboard).
2. Settings:
   - **Root Directory**: `frontend`
   - **Framework Preset**: `Vite`
   - **Build Command**: `npm run build`
   - **Output Directory**: `.output/public` or `dist`
3. Add Environment Variables:
   - `VITE_API_URL` = `https://safeher-backend.onrender.com/api`
   - `VITE_AI_SERVICE_URL` = `https://safeher-ai-service.onrender.com`
4. Deploy!

---

## 🔐 Environment Variables Summary

Refer to [`backend/.env.example`](backend/.env.example) and [`frontend/.env.example`](frontend/.env.example) for exact configuration keys.

---

## 👥 User Roles & Access Control

1. **User (`USER`)**:
   - Access to User Dashboard, Safety Shield, Manual SOS, Voice AI, Movement AI, Predictive Safety, and Emergency Contacts.
2. **Volunteer (`VOLUNTEER`)**:
   - Access to Volunteer Responder Feed, Incident Acceptance, Navigation Coordinates, and Responder Profile.
3. **Admin (`ADMIN`)**:
   - Access to Admin Incident Command Center, Volunteer Verification Management, Live Evidence Playback, Incident Resolution, and Exportable Reports.

---

## 🔒 Security & Privacy Practices

- **Zero Hardcoded Secrets**: Secrets and API tokens are loaded strictly from environment files.
- **Strict Role Isolation**: API middleware verifies JWT role claims before granting access to volunteer feeds or admin command endpoints.
- **Scoped Location Transmission**: Geolocation is transmitted only during active safety monitoring or active incident states.
- **Protected Evidence Records**: Incident evidence is linked directly to unique incident IDs and stored in secure Cloudinary storage.

---

## 📄 License & Important Notice

SafeHer is an assistive personal safety and emergency coordination platform. AI evaluations are assistive and situational. In an immediate life-threatening crisis, users should always dial official local emergency services directly (Police: 112 / 100, Women Helpline: 1091).
