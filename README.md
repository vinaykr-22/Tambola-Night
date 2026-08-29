# Tambola Night

Tambola Night is a private, mobile-first multiplayer Tambola game built for small groups who want a fast setup and a smooth realtime room experience.

The project uses a lightweight full-stack TypeScript architecture with a React frontend, an Express + Socket.IO backend, and shared types across the stack so the game stays simple, maintainable, and fast to iterate on.

## Highlights

- Realtime multiplayer rooms powered by Socket.IO
- Quick private room creation and join flow
- Server-generated Tambola tickets
- Live number board with animated draw feedback
- Server-side claim validation for fair gameplay
- Configurable winning conditions
- Two calling styles:
  - `Host calls` for classic host-controlled pacing
  - `Player turns` so each player can draw on their turn
- Live switching between calling modes by the host
- No database for V1, with in-memory room state

## Stack

- Frontend: React, Vite, TypeScript, Framer Motion
- Backend: Node.js, Express, Socket.IO
- Shared package: TypeScript types used by client and server
- Tooling: npm workspaces, TypeScript, tsx

## Project Structure

```text
tambola-night/
├── client/     # React + Vite frontend
├── server/     # Express + Socket.IO backend
├── shared/     # Shared TypeScript types
├── package.json
└── README.md
```

## Gameplay Flow

1. The host creates a room and selects the winning conditions.
2. Players join with the room code and receive generated tickets.
3. The host starts the game.
4. Numbers are drawn using either host-controlled calling or player-turn calling.
5. Players submit claims such as Early Five, Corners, Lines, or Full House.
6. The server validates every claim before awarding a win.

## Local Development

### Requirements

- Node.js 20 or newer
- npm 10 or newer

### Install

```bash
cd D:\tambola-night
npm install
```

### Run

```bash
npm run dev
```

This starts:

- Client on `http://localhost:5173`
- Server on `http://localhost:3001`

For phone testing on the same Wi-Fi network, use the Vite Network URL shown in the terminal after starting the client.

## Scripts

```bash
npm run dev
npm run build
npm test
```

## Why This Setup

This V1 deliberately avoids unnecessary complexity:

- No authentication
- No database
- No Redis
- No Docker requirement
- No microservices

Rooms live entirely in memory, which keeps the build lean and easy to deploy. If persistence, accounts, or horizontal scaling become useful later, those can be added from a clean foundation instead of being forced in too early.

## Server Responsibilities

The backend is the source of truth for:

- Room membership
- Ticket generation
- Called numbers
- Active calling mode
- Player turn order in turn-based calling
- Winning condition validation
- Prize locking when multiple winners are disabled

That keeps the client responsive without trusting the browser for actual game correctness.

## License

This project is licensed under the MIT License. See [LICENSE](D:\tambola-night\LICENSE) for details.
