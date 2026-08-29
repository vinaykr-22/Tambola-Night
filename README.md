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

Copy the example environment files if you want explicit local config:

```bash
copy client\.env.example client\.env
copy server\.env.example server\.env
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

## Deployment

This project is prepared for a split deployment:

- Frontend on Vercel
- Backend on Render or Railway

### Backend

The server is production-ready with:

- `PORT` support from the hosting platform
- `/health` endpoint for uptime checks
- configurable `CLIENT_ORIGIN`
- Socket.IO CORS controlled through environment variables

Environment variables for the server:

```bash
PORT=3001
CLIENT_ORIGIN=https://your-frontend-domain.vercel.app
```

You can deploy the backend from the repo root with:

- Build command: `npm install && npm run build`
- Start command: `npm run start -w server`

A starter [render.yaml](D:\tambola-night\render.yaml) is included for Render.

Render quick setup:

1. Create a new `Web Service` from this Git repo.
2. Let Render detect the included `render.yaml`, or set the build and start commands manually.
3. Add `CLIENT_ORIGIN` with your Vercel frontend URL.
4. Deploy and confirm `https://your-service.onrender.com/health` returns `ok: true`.

### Frontend

The frontend build is production-ready and expects the backend URL through:

```bash
VITE_SERVER_URL=https://your-backend-domain.onrender.com
```

If `VITE_SERVER_URL` is not set, the client falls back to `window.location.hostname` on port `3001`, which is useful for local development on the same machine or LAN.

For Vercel:

- Framework preset: `Vite`
- Install command: `npm install`
- Build command: `npm --prefix shared run build && npm --prefix client run build`
- Output directory: `client/dist`
- Environment variable: `VITE_SERVER_URL`

A starter [vercel.json](D:\tambola-night\vercel.json) is included for root-level deployment.

Vercel quick setup:

1. Import the same Git repo into Vercel.
2. Keep the root directory as the repo root.
3. Add `VITE_SERVER_URL` with your Render backend URL.
4. Deploy once, copy the Vercel domain, then place that domain into Render's `CLIENT_ORIGIN`.
5. Redeploy the backend if needed so Socket.IO CORS uses the updated frontend origin.

### Recommended Deploy Order

1. Deploy the backend first and copy its public URL.
2. Set `VITE_SERVER_URL` in the frontend host.
3. Deploy the frontend.
4. Set `CLIENT_ORIGIN` on the backend to the frontend URL.
5. Redeploy the backend if your host does not apply env changes automatically.

## First Push

If this repo is not connected to GitHub yet, these are the usual commands from `D:\tambola-night`:

```bash
git add .
git commit -m "Prepare Tambola Night for deployment"
git branch -M main
git remote add origin https://github.com/YOUR-USER/YOUR-REPO.git
git push -u origin main
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
