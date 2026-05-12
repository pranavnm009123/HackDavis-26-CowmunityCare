# CowmunityCare

> Accessible intake for healthcare, housing, hunger, and everyday help — speak, sign, or type what you need.

CowmunityCare is a voice-first intake platform for people new to Davis who need help finding care, housing, food, or everyday support. Users can speak, sign, or type in their own language, and CowmunityCare turns the conversation into a structured record with urgency flags, appointment details, and local resources they can actually reach.

For staff, CowmunityCare becomes a live intake queue with real-time updates, urgency alerts, resource matching, and appointment management.

Built at **HackDavis 2026** for clinics, shelters, food programs, and community care teams.

---

## Demo

[![CowmunityCare Demo](https://img.youtube.com/vi/lDt9Liq3pP4/maxresdefault.jpg)](https://youtu.be/lDt9Liq3pP4)

**[Watch the demo →](https://youtu.be/lDt9Liq3pP4)**

---

## Features

- **Multi-modal intake**: Speak, sign (ASL/video), or type your way through intake
- **Conversational AI**: One question at a time, naturally guided flow
- **70+ languages**: Auto-detect and respond in patient's language
- **Resource matching**: Connect with local clinics, shelters, food banks, and services
- **Urgent situation detection**: Alert staff to high-priority cases instantly
- **Appointment booking**: Book and confirm appointments in real-time
- **Smart navigation**: Voice-activated map with mobility-aware routing
- **Patient profiles**: Save details once, faster visits next time
- **Staff dashboard**: Live queue with urgency flags and structured cards
- **Email confirmations**: Instant intake summaries and resource links
- **Accessibility-first**: WCAG AA compliant, keyboard navigable, screen reader friendly

---

## Tech Stack

- **Frontend**: React 19, Vite, React Router 6, Shadcn
- **Backend**: Node.js, Express, WebSockets
- **AI**: Google Gemini Live (voice/vision), Anthropic Claude (structured data)
- **Database**: MongoDB
- **Maps**: Google Places, Geoapify, OpenStreetMap
- **Auth**: JWT + bcryptjs

---

## Getting Started

### Prerequisites

- Node.js 20+ and npm
- MongoDB (local or Atlas)
- Gemini API key
- Anthropic API key

### Installation

```bash
# Clone the repo
git clone https://github.com/pranavnm009123/HackDavis-26-CowmunityCare.git
cd HackDavis-26-CowmunityCare

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your API keys and MongoDB URI

# Start MongoDB (if running locally)
mongod --dbpath ~/data/db

# Run in development mode
npm run dev
```

Client: `http://localhost:5173`  
Server: `http://localhost:3001`

---

## Environment Variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `GEMINI_API_KEY` | Yes | Google Gemini Live API key |
| `ANTHROPIC_API_KEY` | Yes | Anthropic Claude API key |
| `MONGODB_URI` | Yes | MongoDB connection string |
| `JWT_SECRET` | Yes | JWT signing secret |
| `GMAIL_USER` | No | Gmail for outbound email |
| `GMAIL_APP_PASSWORD` | No | Gmail app password |
| `GOOGLE_MAPS_API_KEY` | No | Google Maps (has free fallbacks) |

---

## Development

```bash
npm run dev:server      # Backend only
npm run dev:client      # Frontend only
npm run build           # Production build
cd client && npm run lint # Linting
```

---

## Supported Languages

70+ languages including English, Chinese, Spanish, Hindi, Vietnamese, Portuguese, Korean, Arabic, Russian, French, Japanese, Filipino, and more.

---

*Built with love at HackDavis 2026 — for communities that deserve better tools.*
