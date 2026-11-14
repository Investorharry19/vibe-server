# Vibe — Backend

Real-time, location-based events. Node.js + Express + Socket.io + MongoDB.

## Setup

```bash
cp .env.example .env
# Fill in MONGODB_URI, JWT_SECRET, Twilio and Google credentials
npm install
npm run dev
```

## Project structure

```
src/
├── index.js          # Entry point — HTTP server, DB, socket, expiry watcher
├── app.js            # Express app — routes, middleware, rate limiting
├── config/
│   └── database.js   # MongoDB connection
├── middleware/
│   ├── auth.js       # JWT authenticate middleware
│   └── errorHandler.js
├── models/
│   ├── User.js       # Phone / Google auth, blocked users
│   ├── Vibe.js       # 2dsphere + TTL indexes
│   └── Message.js    # TTL = vibe.expiresAt
├── routes/
│   ├── auth.js       # /auth/*
│   ├── vibes.js      # /vibes/*
│   ├── requests.js   # /vibes/:id/request|approve|reject
│   └── moderation.js # /report, /block
├── services/
│   ├── authService.js     # OTP (Twilio) + Google OAuth
│   ├── vibeService.js     # Create, discover (geo), delete
│   ├── requestService.js  # Join request approval flow
│   └── expiryService.js   # Change stream watcher + polling fallback
└── socket/
    └── index.js      # Socket.io — auth middleware, rooms, chat, events
```

## API reference

### Auth
| Method | Path | Body | Notes |
|--------|------|------|-------|
| POST | /auth/phone/request-otp | `{ phone }` | Sends SMS via Twilio |
| POST | /auth/phone/verify | `{ phone, code }` | Returns JWT |
| POST | /auth/google | `{ idToken }` | Google ID token → JWT |
| GET | /auth/me | — | Requires Bearer token |

### Vibes
| Method | Path | Notes |
|--------|------|-------|
| POST | /vibes | `{ title, intent, coordinates, maxPeople, durationMinutes }` |
| GET | /vibes/nearby | `?lat=&lng=&radius=&intent=` |
| GET | /vibes/:id | Full vibe with participants |
| DELETE | /vibes/:id | Host only |

### Requests
| Method | Path | Body |
|--------|------|------|
| POST | /vibes/:id/request | — |
| POST | /vibes/:id/approve | `{ userId }` |
| POST | /vibes/:id/reject | `{ userId }` |

### Moderation
| Method | Path | Body |
|--------|------|------|
| POST | /report | `{ targetUserId, reason }` |
| POST | /block | `{ targetUserId }` |

## Socket.io events

**Client → server**
- `join_room` `{ vibeId }` — join a vibe room (receives message history)
- `leave_room` `{ vibeId }`
- `send_message` `{ vibeId, message }`

**Server → client**
- `message_history` — array of last 50 messages on join
- `receive_message` — new message payload
- `request_received` — host gets this when someone requests to join
- `request_approved` / `request_rejected` — requester gets this
- `vibe_created` — broadcast to all connected clients
- `vibe_expired` — room members get this when vibe is deleted/expired

## Running tests

```bash
npm test
```