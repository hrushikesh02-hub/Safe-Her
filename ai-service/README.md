# SafeHer AI Voice Distress Detection Service

Assistive AI Voice & Audio Distress Detection microservice for the SafeHer Women Safety System.

## Features
- **Audio Preprocessing**: Sample rate conversion (22050Hz mono), amplitude normalization via `librosa`.
- **Acoustic Feature Extraction**: MFCCs, Spectral Centroid, RMS Energy, Zero Crossing Rate (ZCR), Spectral Rolloff.
- **Voice Distress Classification**: Detects screaming, shouting, distress sounds, and normal speech.
- **Keyword Detection**: Scans for panic phrases ("help", "save me", "please help", "bachao", "mujhe bachao").
- **Voice Risk Engine**: Calculates a composite `voice_risk_score` (0–100) and `risk_level` (LOW, MEDIUM, HIGH, CRITICAL).
- **Demo Mode (`AI_DEMO_MODE=true`)**: Preset test audio scenarios for hackathon/demonstration reliability.

## Architecture
```
React Frontend (MediaRecorder)
       │
       ▼ (Audio Blob / Chunks)
Node.js Express Backend (/api/ai/voice/analyze)
       │
       ▼ (FormData Proxy)
Python FastAPI Service (http://localhost:8000/api/voice/analyze)
       │
  ┌────┴──────────────────────────┐
  │ AudioProcessor (librosa)      │
  │ DistressDetector (Classify)   │
  │ VoiceRiskCalculator (0-100)   │
  └────┬──────────────────────────┘
       │
       ▼ JSON Response
Node Backend -> React UI Display
```

## Installation & Setup

1. **Navigate to the AI service directory:**
   ```bash
   cd ai-service
   ```

2. **Create and activate a virtual environment (optional but recommended):**
   ```bash
   python -m venv venv
   # On Windows:
   venv\Scripts\activate
   # On Linux/macOS:
   source venv/bin/activate
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Start the FastAPI server:**
   ```bash
   python -m uvicorn app.main:app --reload --port 8000
   ```
   The API will be available at `http://localhost:8000`. Documentation is available at `http://localhost:8000/docs`.

## API Endpoints

### `POST /api/voice/analyze`
**Input:** `multipart/form-data` with `file` (WAV/WebM/MP3 audio blob) or `scenario` parameter for Demo Mode.

**Output:**
```json
{
  "success": true,
  "distress_detected": true,
  "distress_type": "scream",
  "confidence": 0.91,
  "voice_risk_score": 91,
  "risk_level": "CRITICAL",
  "detected_keywords": [],
  "details": {
    "rms_energy": 0.22,
    "spectral_centroid_hz": 3150.0,
    "demo_mode": false,
    "model_name": "Prototype Voice Distress Detection"
  }
}
```

### `GET /api/voice/demo-scenarios`
Returns available preset test scenarios for Demo Mode.

## Safety Notice
This module is an assistive prototype designed for research and testing. It does NOT replace official emergency 911/police response services.
