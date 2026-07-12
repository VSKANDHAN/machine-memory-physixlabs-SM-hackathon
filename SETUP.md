# MachineMemory.io — Setup Guide

## Prerequisites

- Node.js v18+ (you have v20.19.0)
- Docker Desktop (you have it installed)
- Free accounts at: [console.groq.com](https://console.groq.com) and optionally [console.supermemory.ai](https://console.supermemory.ai)

---

## Step 1 — Get your Groq API key (2 minutes)

Groq is free. The key is used for TWO things:
- **Supermemory Local** uses it to extract memories from IIoT events
- **The Agent Chat** uses it to answer your Plant Manager queries

1. Go to [console.groq.com](https://console.groq.com)
2. Sign up / log in → **API Keys** → **Create API Key**
3. Copy the key (starts with `gsk_...`)

---

## Step 2 — Choose how to run Supermemory

### Option A: Docker Local (Recommended — data stays on your machine)

> **Why this works on Windows:** Docker Desktop runs the Linux binary in a Linux container. No WSL required.

**2a. Create the root `.env` file** (docker-compose loads this automatically):
```
GROQ_API_KEY=gsk_your_groq_key_here
```

**2b. Build and start Supermemory:**
```powershell
cd "e:\SAAS\Physix Labs\physixlabs-supermemory-hackathon"
docker compose up supermemory
```

The first boot takes ~30 seconds (downloads the binary, initializes the graph engine, warms up local embeddings).

**2c. Copy your generated API key** — look in the Docker logs for a line like:
```
Your API key: sm_xxxxxxxxxxxxxxxxxxxxxxxx
```
This key is generated once and stored in the Docker volume. **Copy it.**

**2d. Paste the key into both env files:**

In `backend/.env`:
```
SM_API_KEY=sm_xxxxxxxxxxxxxxxxxxxxxxxx
SM_BASE_URL=http://localhost:6767
SM_CONTAINER_TAG=factory_floor
PORT=3001
```

In `ui/.env.local`:
```
SM_API_KEY=sm_xxxxxxxxxxxxxxxxxxxxxxxx
SM_BASE_URL=http://localhost:6767
SM_CONTAINER_TAG=factory_floor
GROQ_API_KEY=gsk_your_groq_key_here
NEXT_PUBLIC_WS_URL=http://localhost:3001
```

---

### Option B: Supermemory Cloud (Fastest — 2 minutes, no Docker)

1. Go to [console.supermemory.ai](https://console.supermemory.ai)
2. Sign up free → **API Keys** → **Create key**
3. Copy the key (starts with `sm_...`)

In `backend/.env`:
```
SM_API_KEY=sm_your_supermemory_cloud_key
# SM_BASE_URL=https://api.supermemory.ai   ← this is the default, line optional
SM_CONTAINER_TAG=factory_floor
PORT=3001
```

In `ui/.env.local`:
```
SM_API_KEY=sm_your_supermemory_cloud_key
# SM_BASE_URL=https://api.supermemory.ai
SM_CONTAINER_TAG=factory_floor
GROQ_API_KEY=gsk_your_groq_key_here
NEXT_PUBLIC_WS_URL=http://localhost:3001
```

> Note: Remove or comment out `SM_BASE_URL` to use the cloud endpoint.

---

## Step 3 — Run the full stack

Open **3 terminals** in `e:\SAAS\Physix Labs\physixlabs-supermemory-hackathon`:

**Terminal 1 — Supermemory (if using Docker):**
```powershell
docker compose up supermemory
```
*(Skip if using cloud — the cloud server is always running)*

**Terminal 2 — Backend:**
```powershell
node backend/index.js
```
Expected output:
```
[boot] Supermemory client ready
[boot] Factory knowledge seeded
[boot] Simulator started
[server] MachineMemory backend on port 3001
```

**Terminal 3 — UI:**
```powershell
cd ui
npx next dev
```
Then open: http://localhost:3000

---

## Step 4 — Integration Test

1. Open **http://localhost:3000** — machine cards should show live data within 3 seconds
2. Click **"Trigger Conveyor Jam"** in the Scenario Panel
3. Watch the **Event Log** fill with memory events (`✓ Stored in Supermemory`)
4. In Agent Chat, click the pre-built query: *"Analyze our floor energy consumption..."*
5. The agent should reference historical faults seeded at boot (Jan 15, 2026 conveyor jam, Sept 3, 2025 feeder drain) + the live events you just triggered

---

## Architecture Notes (for demo/submission)

```
Factory Simulator (1.5s loop)
    ↓ Welford statistics (sliding window of 20)
    ↓ Anomaly detector (>3σ threshold)
    ↓ Correlator (main breaker surge detection)
    ↓ Supermemory Local (localhost:6767)  ← semantic episodic memory
    ↓ Socket.io broadcast
    ↓ Next.js UI (real-time machine cards + event log)
           ↕
    AI Plant Manager Agent
    ↓ Retrieves relevant memories from Supermemory
    ↓ Groq llama-3.3-70b-versatile (streaming)
    ↓ Temporal reasoning: "same fault 3 months ago..."
```

### Why only significant events are stored
Raw IIoT produces ~1 reading/1.5s per machine = **2.4 million readings/year** per machine. MachineMemory stores **only**:
- State transitions (NORMAL → WARNING → CRITICAL)
- >3σ statistical anomalies (Welford online algorithm)  
- Main breaker surge correlations (>20% above baseline)
- Idle energy waste (machine IDLE but drawing >85% baseline power)
- Maintenance threshold crossings

Estimated storage ratio: **~0.1% of raw data**, fully semantic and queryable.

---

## Hackathon Submission Checklist

- [ ] Supermemory running (Docker or Cloud)
- [ ] Groq API key set in `ui/.env.local`
- [ ] Backend starts without errors
- [ ] UI shows live machine data
- [ ] Scenario triggers appear in Event Log as Supermemory events
- [ ] Agent Chat answers temporal reasoning queries with memory context
- [ ] GitHub repo pushed (public)
- [ ] Demo video recorded (≤3 min)
- [ ] Google Form submitted: https://forms.gle/ARXHNpFY5VNfiNDBA
- [ ] Discord #project-showcase post with repo + video links
