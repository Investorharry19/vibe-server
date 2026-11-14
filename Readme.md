# Vibe — Backend

Real-time, location-based events. Node.js + Express + Socket.io + MongoDB.

## Setup

```bash
# Set MONGODB_URI, JWT_SECRET, and GOOGLE_CLIENT_ID in a local .env file first.
npm install
npm run dev
```

The backend listens on port `5000` by default. `CLIENT_ORIGIN` can be set to
the web app origin; `PORT`, `JWT_EXPIRES_IN`, and the `RATE_LIMIT_*` variables
are optional.

## Swagger documentation

With the backend running, open [http://localhost:5000/api-docs](http://localhost:5000/api-docs)
for the interactive Swagger UI. The raw OpenAPI document is available at
[http://localhost:5000/api-docs.json](http://localhost:5000/api-docs.json).

Use the **Authorize** control in Swagger UI to provide the JWT returned by
`POST /auth/google`. Protected REST endpoints expect it as a Bearer token.

## Project structure

```
src/
├── index.js          # Entry point — HTTP server, DB, socket, expiry watcher
├── app.js            # Express app — routes, middleware, rate limiting
├── docs/
│   └── openapi.js     # OpenAPI 3 specification
├── routes/
│   └── docs.js        # Swagger UI and raw spec endpoints
├── config/
│   └── database.js   # MongoDB connection
├── middleware/
│   ├── auth.js       # JWT authenticate middleware
│   └── errorHandler.js
├── models/
│   ├── user.js       # Google identity and blocked users
│   ├── vibe.js       # 2dsphere + TTL indexes
│   └── message.js    # Message TTL matches vibe expiry
├── routes/
│   ├── auth.js       # /auth/*
│   ├── vibes.js      # /vibes/*
│   └── moderation.js # /report, /block
├── services/
│   ├── authService.js     # Google OAuth and JWT creation
│   ├── vibeService.js     # Create, discover (geo), delete
│   ├── requestService.js  # Join request approval flow
│   └── expiryService.js   # Change stream watcher + polling fallback
└── socket/
    └── index.js      # Socket.io — auth middleware, rooms, chat, events
```

## API reference

The Swagger UI documents request fields, query parameters, authentication,
and response formats. Main routes:

- `GET /health`
- `POST /auth/google`, `GET /auth/me`
- `POST /vibes`, `GET /vibes/nearby`, `GET /vibes/mine`,
  `GET /vibes/requested`, `GET /vibes/:id`, `DELETE /vibes/:id`
- `POST /vibes/:id/request`, `/approve`, and `/reject`
- `POST /report`, `POST /block`

## Socket.io events

Connect to the same server with the JWT in `handshake.auth.token`.

**Client → server**
- `join_room` `{ vibeId }` — join a vibe room (receives message history)
- `leave_room` `{ vibeId }`
- `send_message` `{ vibeId, message }`

**Server → client**
- `message_history` — array of last 50 messages on join
- `receive_message` — new message payload
- `request_received` — emitted to the vibe room when someone requests to join
- `request_approved` / `request_rejected` — emitted to the vibe room
- `vibe_created` — broadcast to all connected clients
- `vibe_expired` — room members get this when vibe is deleted/expired

## Running tests

```bash
npm test
```