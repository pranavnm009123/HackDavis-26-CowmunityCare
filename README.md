# CowmunityCare

> Accessible intake for healthcare, housing, hunger, and everyday help — speak, sign, or type what you need.

CowmunityCare is a community intake assistant for people who should not have to fight a form before they can ask for help. A patient or community member can speak, use ASL/sign language through video, or type in a chat-style flow. The AI asks one question at a time, gathers the important details, and turns the conversation into a structured record for staff.

For staff, CowmunityCare becomes a live intake queue. Each request arrives with an English summary, urgency level, accessibility needs, recommended next step, matched local resources, and appointment details when a booking is made.

Built at **HackDavis 2026** for clinics, shelters, food programs, and community care teams.

---

## Live Routes

| URL | Who uses it |
|-----|-------------|
| `http://localhost:5173/` | Landing page |
| `http://localhost:5173/user` | User intake |
| `http://localhost:5173/staff` | Staff live queue |
| `http://localhost:5173/staff/appointments` | Appointment management |
| `http://localhost:5173/staff/analytics` | Analytics dashboard |
| `http://localhost:5173/navigate` | Standalone map & route planner |
| `http://localhost:5173/settings` | User profile settings |
| `http://localhost:3001/health` | Server health check |

---

## What CowmunityCare Can Do

- Help someone start an intake by **voice, ASL/sign language, or text**.
- Ask for name, email, phone, and service needs conversationally instead of making the user fill out a long form.
- Support healthcare, housing, food aid, and general community support requests.
- Detect urgent situations and alert staff when something may need fast attention.
- Match people with local resources such as clinics, shelters, food banks, housing links, pharmacy help, and support services.
- Open a map when someone says they need to go somewhere, then recommend a route based on mobility and access needs.
- Book appointments from available doctor slots and email the confirmation.
- Email the final summary and useful resource links at the end of the conversation.
- Save returning patient profiles so people do not have to repeat basic details every visit.
- Give staff a live queue, analytics, appointment management, and structured cards they can act on quickly.

### Intake Modes
- **Healthcare** (`clinic`) — symptoms, duration, urgency, insurance, allergies, accessibility, and next steps.
- **Housing** (`shelter`) — current housing status, safety, family size, pets, mobility, timeline, and shelter/resource needs.
- **Hunger** (`food_aid`) — household size, dietary needs, ZIP code, transport limits, and supply needs.
- **Here-to-Help** (`support_services`) — everyday support with access-first matching for language, mobility, transportation, cost, and known barriers.

### AI Voice Pipeline
- Real-time PCM audio streaming to **Google Gemini Live** (`gemini-3.1-flash-live-preview`)
- Bi-directional audio — Gemini speaks back in voice (Aoede voice)
- Full input + output transcription shown in real time
- Text input mode for users who prefer typing or cannot use audio/video
- **ASL / sign language** mode: video frames captured every 7 s, interpreted by Gemini vision, one question per turn with a signing window
- Translate-to-English toggle for any non-English conversation

### Returning Patient Profiles
- Create a free account (JWT auth, 7-day token)
- Save: name, email, phone, blood group, insurance, allergies, date of birth, emergency contact, mobility, language preference
- On next visit the AI greets you by name and skips fields it already knows — confirmation required before re-use

### Navigation
- Say "take me to the nearest pharmacy" and a map opens in a new tab pre-loaded with the destination
- Multi-provider place search: **Google Places → Geoapify → Photon/Komoot** (free fallback)
- Routing: **Google Directions → OSRM** (free fallback)
- Wheelchair accessibility flags from OpenStreetMap
- Mobility-aware transport recommendation (walk / wheelchair / transit / rideshare)
- Uber deeplink for rideshare

### Appointment Booking
- AI fetches available doctor slots sorted by proximity (`get_available_slots`)
- Patient picks a slot by voice — AI confirms and books it (`book_appointment`)
- Appointment confirmation email sent instantly
- Booked appointments appear live on the staff `/appointments` board

### Email Notifications
- **Welcome** email on first sign-up
- **Intake confirmation** after every session (includes urgency banner, resources, appointment)
- **Appointment confirmation** with provider, location, time
- **Resource email** on demand — patient asks "email me those links" and AI sends them
- Transport: Gmail SMTP → Custom SMTP → Ethereal test (auto fallback, zero config required for dev)

### Staff Dashboard
- Live WebSocket push — no polling
- Urgency alert banner for CRITICAL / HIGH intakes
- Filter by mode, status, urgency
- One-click status updates (new → reviewed → actioned)
- Analytics: intake volume, mode breakdown, urgency distribution

### Accessibility
- WCAG AA contrast (Aggie Blue `#0d274e` / Aggie Gold `#f5c242`)
- Keyboard navigable — skip links, focus-visible outlines
- `aria-live` regions for real-time transcript updates
- `prefers-reduced-motion` respected globally
- Screen-reader-only helper text throughout

---

## Architecture

### Data Flow

```
User Browser (/user)
  │  PCM audio @ 16 kHz (base64 chunks)
  ▼
Server WebSocket (/ws/patient)
  │
  └─► Gemini Live session (gemini-3.1-flash-live-preview)
        │
        ├─ tag_urgency ──────────────────────────► Staff WS → URGENCY_ALERT
        │
        ├─ lookup_resources ─────────────────────► static data / Backboard RAG
        ├─ find_nearest_facility ────────────────► facility DB (MongoDB)
        ├─ check_resource_access ────────────────► access score (support_services)
        │
        ├─ get_available_slots ──────────────────► doctor DB (MongoDB)
        ├─ book_appointment ─────────────────────► MongoDB + Staff WS → NEW_APPOINTMENT
        │
        ├─ search_housing ───────────────────────► Craigslist scrape / static listings
        ├─ request_navigation ───────────────────► User WS → map opens in new tab
        ├─ send_email ───────────────────────────► Nodemailer (Gmail / SMTP / Ethereal)
        │
        ├─ finalize_intake
        │     └─► Claude (claude-sonnet-4-6)
        │               └─► normalized JSON card
        │                       └─► MongoDB save
        │                               └─► Staff WS → NEW_INTAKE
        │
        └─ end_session ──────────────────────────► session.close()

  │  Audio response @ 24 kHz (base64)
  ▼
User Browser (plays audio + shows transcript)

Staff Browser (/staff)  ←──  WebSocket /ws/staff
  Receives: INTAKE_SNAPSHOT, NEW_INTAKE, INTAKE_UPDATED,
            URGENCY_ALERT, NEW_APPOINTMENT, SLOT_ADDED
```

### Server Components

| File | Role |
|------|------|
| `server/index.js` | Express + two WebSocket servers (`patientWss`, `staffWss`); mounts all routes; JWT verification on `start_session` |
| `server/geminiSession.js` | Creates and manages a Gemini Live session; routes audio/video/text in, routes audio/transcripts/tool calls out |
| `server/functions.js` | Implements all 11 tool functions; dispatches Gemini tool calls |
| `server/claude.js` | Calls Anthropic SDK to convert raw intake args into a normalized JSON card |
| `server/intakeTemplates.js` | Four intake modes with required fields, urgency rules, and `buildSystemInstruction(mode, lang, userProfile)` |
| `server/navigate.js` | Place autocomplete + directions with Google → Geoapify → Photon/OSRM fallback chain |
| `server/storage.js` | Mongoose `Intake` model + CRUD helpers |
| `server/models/User.js` | Mongoose `AuthUser` model (profile, credentials) |
| `server/middleware/authMiddleware.js` | `verifyToken` — reads `Authorization: Bearer` header |
| `server/routes/auth.js` | `POST /auth/register`, `POST /auth/login`, `GET /auth/me` |
| `server/routes/profile.js` | `GET/PUT /api/profile`, password & email change — JWT-protected |
| `server/routes/navigate.js` | `GET /api/places/autocomplete`, `GET /api/places/details`, `POST /api/directions` |
| `server/email.js` | Nodemailer helpers — welcome, intake confirmation, appointment confirmation, resource email |
| `server/appointments.js` | Appointment CRUD + seeding |
| `server/doctors.js` | Doctor & slot management |
| `server/facilities.js` | Facility data + seeding |
| `server/supportServices.js` | Access scoring for `support_services` mode |
| `server/backboardRag.js` / `backboardMatch.js` | Optional Backboard SDK integration for semantic resource matching |

### Client Components

| File | Role |
|------|------|
| `client/src/App.jsx` | Router + `AuthProvider` wrapper; all global CSS and design tokens |
| `client/src/useAuth.jsx` | Auth context — login, signup, logout, updateProfile; rehydrates from localStorage |
| `client/src/LandingPage.jsx` | Hero with park background, language chip row, feature cards |
| `client/src/AuthPage.jsx` | Combined login/signup with password strength bar |
| `client/src/PatientView.jsx` | Mode picker, mic/camera controls, live transcript, intake draft panel, map banner |
| `client/src/SettingsPage.jsx` | Six-section profile form (personal, insurance, health, emergency contact, email, password) |
| `client/src/StaffView.jsx` | Live intake card queue with urgency alert banner |
| `client/src/IntakeCard.jsx` | Single intake card (urgency badge, structured fields, resources, next step) |
| `client/src/NavigateView.jsx` | Standalone `/navigate` page — reads `?q=` param for pre-filled destination |
| `client/src/NavigatePanel.jsx` | Place search, map, turn-by-turn directions, mobility questions |
| `client/src/AnalyticsView.jsx` | Intake analytics dashboard |
| `client/src/AppointmentsView.jsx` | Staff appointment management board |
| `client/src/useSocket.js` | WebSocket hook — auto-reconnect, `send` + `lastMessage` |
| `client/src/useAudio.js` | Mic capture via `AudioWorkletNode`, PCM→base64, playback queue |
| `client/src/useGeolocation.js` | Browser geolocation hook |

---

## AI Tool Functions

Gemini calls these tools during the conversation. Each triggers server-side logic and may broadcast to staff.

| Tool | Purpose |
|------|---------|
| `tag_urgency` | Immediately flags a warning sign (LOW / MEDIUM / HIGH / CRITICAL) and broadcasts `URGENCY_ALERT` to all staff |
| `finalize_intake` | Sends collected fields to Claude for normalization, saves to MongoDB, broadcasts `NEW_INTAKE`, emails patient |
| `lookup_resources` | Returns local resources by category (clinic, shelter, food, pharmacy, housing, etc.) from static data or Backboard RAG |
| `find_nearest_facility` | Finds the 3 nearest facilities of a given type (hospital, free_clinic, urgent_care, shelter, food_bank, pharmacy) |
| `check_resource_access` | Scores facilities against patient accessibility needs — wheelchair, language, transport, known barriers |
| `get_available_slots` | Fetches doctor appointment slots by specialization, sorted by patient proximity |
| `book_appointment` | Books a confirmed slot, saves to MongoDB, broadcasts `NEW_APPOINTMENT`, sends confirmation email |
| `search_housing` | Returns live Craigslist listings or static UC Davis housing options |
| `request_navigation` | Sends `NAVIGATE_REQUEST` to patient browser — map opens in a new tab pre-filled with the destination |
| `send_email` | Emails the patient resource links, apartment listings, or any other requested information |
| `end_session` | Closes the Gemini session gracefully after a brief closing message |

---

## Intake Modes

### Healthcare (`clinic`)
Collects: chief complaint, symptom duration, severity, red flags, insurance/cost, allergies, interpreter need, accessibility.  
Urgency escalated to CRITICAL for: chest pain, difficulty breathing, severe bleeding, stroke signs, unsafe home situation.

### Housing (`shelter`)
Collects: housing status (unsheltered / at-risk / eviction), safety, timeline, family size, pets, mobility, location, contact.  
CRITICAL if: danger present, sleeping outside with minors, no shelter tonight.

### Hunger (`food_aid`)
Collects: household size, ZIP code, dietary restrictions (vegan / halal / kosher / gluten-free), transport limits, supply type.  
HIGH if: no food today, infants in household, medically fragile member.

### Here-to-Help (`support_services`)
Collects: help type, mobility (wheelchair / limited / walking limit), language, transport, cost concern.  
Access-first: `check_resource_access` scores each facility against the patient's needs before any recommendation. Urgency driven by access gaps — all reachable options exhausted = HIGH.

---

## Tech Stack

| Layer | What we use |
|-------|-------------|
| Frontend | React 19, Vite 8, React Router 6 |
| UI system | Local shadcn-style primitives in `client/src/components/ui.jsx`, plus CowmunityCare blue/gold tokens in `App.jsx` |
| Maps & routing UI | `@react-google-maps/api`, Leaflet, React Leaflet |
| Charts | Recharts for staff analytics |
| Backend | Node.js, Express 5, `ws` WebSockets |
| Voice / vision AI | Google Gemini Live (`gemini-3.1-flash-live-preview`) |
| Intake normalization | Anthropic Claude (`claude-sonnet-4-6`) |
| Database | MongoDB + Mongoose |
| Auth | bcryptjs password hashing + JWT session tokens |
| Email | Nodemailer with Gmail, custom SMTP, or Ethereal dev fallback |
| Resource search | Static Yolo County resources, Backboard RAG, Google Places, Geoapify, Photon/Komoot |
| Directions | Google Directions API with OSRM fallback |
| Dev workflow | npm workspaces + concurrently |

### Main Libraries

**Client**
- `react`, `react-dom` — app rendering and UI state.
- `react-router-dom` — routes for landing, `/user`, staff, settings, and navigation.
- `@react-google-maps/api`, `leaflet`, `react-leaflet` — maps, places, and route display.
- `recharts` — staff analytics charts.
- `vite`, `eslint` — local dev server, production build, and linting.

**Server**
- `express` — REST API and route mounting.
- `ws` — real-time patient and staff WebSocket channels.
- `@google/genai` — Gemini Live audio, video, and tool-calling session.
- `@anthropic-ai/sdk` — turns raw conversation fields into structured intake cards.
- `mongoose` — MongoDB models for users, intakes, doctors, appointments, facilities, and barriers.
- `jsonwebtoken`, `bcryptjs` — login, signup, protected profile flow.
- `nodemailer` — summary, resource, welcome, and appointment emails.
- `backboard-sdk` — optional semantic resource matching from `server/data/yolo_resources.md`.

---

## Environment Variables

Copy `.env.example` to `.env` in the repo root:

| Variable | Required | Purpose |
|----------|----------|---------|
| `GEMINI_API_KEY` | **Yes** | Google Gemini Live voice AI |
| `ANTHROPIC_API_KEY` | **Yes** | Claude for structured card normalization |
| `MONGODB_URI` | **Yes** | MongoDB connection string |
| `JWT_SECRET` | Yes (prod) | JWT signing secret — any long random string |
| `GMAIL_USER` | No | Gmail address for outbound email |
| `GMAIL_APP_PASSWORD` | No | Gmail app-specific password |
| `SMTP_HOST` | No | Custom SMTP host |
| `SMTP_PORT` | No | Custom SMTP port (default 587) |
| `SMTP_USER` | No | Custom SMTP username |
| `SMTP_PASS` | No | Custom SMTP password |
| `GOOGLE_MAPS_API_KEY` | No | Google Places autocomplete + Directions |
| `GEOAPIFY_API_KEY` | No | Geoapify place search (fallback if no Google key) |
| `BACKBOARD_API_KEY` | No | Backboard RAG for richer resource matching |
| `BACKBOARD_ASSISTANT_ID` | No | Backboard assistant ID |

> **Email fallback:** If no SMTP vars are set, the server auto-creates an [Ethereal](https://ethereal.email/) test account and logs a preview URL to the console — no config needed for development.

> **Navigation fallback:** If no map API keys are set, place search falls back to free Photon/Komoot (OpenStreetMap) and routing falls back to free OSRM. The navigate feature works out of the box.

---

## Setup & Running

### Prerequisites

- Node.js 20+ and npm
- MongoDB running locally or a MongoDB Atlas connection string
- Gemini and Anthropic API keys for the full AI flow
- Optional: Google Maps, Geoapify, Gmail/SMTP, and Backboard keys

```bash
# 1. Clone
git clone https://github.com/pranavnm009123/HackDavis-26-CowmunityCare.git
cd HackDavis-26-CowmunityCare

# 2. Install all dependencies (root + client + server)
npm install

# 3. Set up environment
cp .env.example .env
# Edit .env — at minimum set GEMINI_API_KEY, ANTHROPIC_API_KEY, MONGODB_URI

# 4. Start MongoDB (if running locally)
mongod --dbpath ~/data/db

# 5. Run both server and client in dev mode
npm run dev
```

Client → `http://localhost:5173`  
Server → `http://localhost:3001`

Open these first:

| Route | Purpose |
|-------|---------|
| `http://localhost:5173/` | Landing page |
| `http://localhost:5173/user` | User/community intake |
| `http://localhost:5173/staff` | Staff queue |
| `http://localhost:5173/navigate` | Map and route planner |
| `http://localhost:3001/health` | Backend health check |

If port `5173` is busy, Vite may choose the next available port and print it in the terminal.

### Individual commands

```bash
npm run dev:server        # Server only (port 3001)
npm run dev:client        # Client only (Vite, usually port 5173)
npm run build             # Production build of the client
npm run start -w server   # Start the server package directly
cd client && npm run lint # Lint the frontend
```

### Test individual server modules

```bash
cd server
node storage.js        # Write a demo record to MongoDB
node claude.js         # Call Claude with a demo intake
node functions.js      # Test tag_urgency + lookup_resources
```

---

## API Reference

### REST Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Server health, DB status, intake count |
| `GET` | `/intakes` | All intake records |
| `POST` | `/auth/register` | Create account |
| `POST` | `/auth/login` | Login, returns JWT |
| `GET` | `/auth/me` | Get current user (JWT required) |
| `GET` | `/api/profile` | Get user profile (JWT required) |
| `PUT` | `/api/profile` | Update user profile (JWT required) |
| `PUT` | `/api/profile/password` | Change password (JWT required) |
| `PUT` | `/api/profile/email` | Change email (JWT required) |
| `GET` | `/api/places/autocomplete?q=&near=` | Place search |
| `GET` | `/api/places/details?placeId=` | Place details + accessibility |
| `POST` | `/api/directions` | Turn-by-turn route |
| `GET` | `/appointments` | All appointments |
| `POST` | `/appointments` | Create appointment |
| `PATCH` | `/appointments/:id` | Update appointment status |
| `GET` | `/doctors` | All doctors with slots |
| `POST` | `/doctors` | Add doctor |
| `POST` | `/doctors/:id/slots` | Add availability slot |
| `GET` | `/facilities` | All facilities with access scores |
| `POST` | `/facilities` | Add facility |
| `GET` | `/barriers` | Accessibility barrier reports |
| `POST` | `/barriers` | Report a barrier |
| `POST` | `/users` | Create or look up a user (guest flow) |
| `GET` | `/users/:userId` | Look up user by ID |
| `POST` | `/translate` | Translate text to English (Claude) |

### WebSocket Protocol

**User ↔ Server** (`/ws/patient`)

| Direction | Message | Fields |
|-----------|---------|--------|
| Client → Server | `start_session` | `mode`, `languagePreference`, `token?` |
| Client → Server | `audio` | `data` (base64 PCM 16 kHz) |
| Client → Server | `video` | `data` (base64 JPEG frame) |
| Client → Server | `text` | `text` |
| Server → Client | `session` | `status` (ready / connected / error / closed), `mode?` |
| Server → Client | `audio` | `data` (base64 PCM 24 kHz), `sampleRate` |
| Server → Client | `audio_interrupted` | — |
| Server → Client | `transcript` | `role` (user / model), `text` |
| Server → Client | `NAVIGATE_REQUEST` | `query`, `reason?` |

**Staff ↔ Server** (`/ws/staff`)

| Direction | Message | Fields |
|-----------|---------|--------|
| Client → Server | `UPDATE_STATUS` | `id`, `status` |
| Server → Client | `INTAKE_SNAPSHOT` | `cards[]` |
| Server → Client | `NEW_INTAKE` | `card` |
| Server → Client | `INTAKE_UPDATED` | `card` |
| Server → Client | `URGENCY_ALERT` | `level`, `reason`, `symptoms[]`, `mode` |
| Server → Client | `NEW_APPOINTMENT` | `appointment` |
| Server → Client | `SLOT_ADDED` | `slot` |

---

## Supported Languages

Gemini Live natively supports **70+ languages** including but not limited to:

🇺🇸 English · 🇨🇳 中文 · 🇪🇸 Español · 🇮🇳 हिन्दी · 🇻🇳 Tiếng Việt · 🇵🇹 Português · 🇰🇷 한국어 · 🇸🇦 العربية · 🇷🇺 Русский · 🇫🇷 Français · 🇯🇵 日本語 · 🇵🇭 Filipino · 🇮🇳 ਪੰਜਾਬੀ · 🇮🇳 বাংলা · 🇮🇩 Bahasa Indonesia · and many more

Language is auto-detected from the patient's speech. The AI responds in the same language. Staff always receive an English summary regardless of the intake language.

---

## Project Structure

```
HackDavis-26-CowmunityCare/
├── client/                    # React + Vite frontend
│   ├── public/
│   │   └── landing-bg.png
│   └── src/
│       ├── App.jsx             # Router, AuthProvider, global CSS and design tokens
│       ├── LandingPage.jsx     # Public landing page
│       ├── AuthPage.jsx        # Login and signup flow
│       ├── PatientView.jsx     # /user intake: speech, ASL/video, text, transcript
│       ├── StaffView.jsx       # Live queue for staff
│       ├── IntakeCard.jsx      # Structured intake card UI
│       ├── AppointmentsView.jsx
│       ├── AnalyticsView.jsx
│       ├── NavigateView.jsx
│       ├── NavigatePanel.jsx
│       ├── SettingsPage.jsx
│       ├── useAuth.jsx
│       ├── useSocket.js
│       ├── useAudio.js
│       ├── useGeolocation.js
│       ├── audioWorklet.js
│       ├── assets/
│       │   └── hero.png
│       └── components/
│           └── ui.jsx          # Local shadcn-style Button/Card/Input/Select/Badge primitives
├── server/                    # Node.js + Express backend
│   ├── index.js               # REST API, WebSockets, startup, route mounting
│   ├── geminiSession.js       # Gemini Live session manager
│   ├── functions.js           # AI tool function implementations
│   ├── claude.js              # Claude structured intake normalization
│   ├── intakeTemplates.js     # Mode prompts, required fields, urgency rules
│   ├── navigate.js            # Place search and directions fallback chain
│   ├── email.js               # Email templates and transport fallback
│   ├── storage.js             # Intake model and persistence helpers
│   ├── users.js
│   ├── appointments.js
│   ├── doctors.js
│   ├── facilities.js
│   ├── supportServices.js
│   ├── backboardRag.js
│   ├── backboardMatch.js
│   ├── models/
│   │   └── User.js
│   ├── middleware/
│   │   └── authMiddleware.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── profile.js
│   │   └── navigate.js
│   ├── scripts/
│   │   └── sync-backboard-rag.mjs
│   └── data/
│       └── yolo_resources.md
├── .env.example
├── package.json               # npm workspaces and root dev scripts
├── client/package.json
├── server/package.json
└── README.md
```

---

*Built with love at HackDavis 2026 — for communities that deserve better tools.*
