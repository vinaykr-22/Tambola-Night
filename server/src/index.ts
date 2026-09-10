import cors from "cors";
import express from "express";
import { createServer } from "node:http";
import { Server, Socket } from "socket.io";
import type { CallingMode, WinningCondition } from "@tambola/shared";
import { RoomManager } from "./rooms/RoomManager.js";

const allowedOrigins = process.env.CLIENT_ORIGIN?.split(",")
  .map((origin) => origin.trim().replace(/\/$/, ""))
  .filter(Boolean);
const corsOrigin = allowedOrigins?.length ? allowedOrigins : true;

const app = express();
app.use(cors({ origin: corsOrigin }));
app.get("/health", (_, res) => res.json({ ok: true, uptime: process.uptime() }));

const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: corsOrigin } });
const rooms = new RoomManager();

const broadcast = (id: string) => io.to(id).emit("room:state", rooms.get(id));

const safe = (socket: Socket, action: () => void) => {
  try {
    action();
  } catch (error) {
    socket.emit("app:error", error instanceof Error ? error.message : "Something went wrong.");
  }
};

io.on("connection", (socket) => {
  socket.on(
    "room:create",
    (p: {
      nickname: string;
      name: string;
      resumeToken: string;
      conditions: WinningCondition[];
      allowMultipleWinners: boolean;
      ticketCount?: number;
    }) =>
      safe(socket, () => {
        const room = rooms.create(
          socket.id,
          p.resumeToken,
          p.nickname.trim(),
          p.name.trim(),
          p.conditions,
          p.allowMultipleWinners,
          p.ticketCount
        );
        socket.join(room.id);
        socket.emit("room:created", room.id);
        broadcast(room.id);
      })
  );

  socket.on(
    "room:join",
    (p: { roomId: string; nickname: string; resumeToken: string; ticketCount?: number }) =>
      safe(socket, () => {
        const room = rooms.join(
          p.roomId.toUpperCase(),
          socket.id,
          p.resumeToken,
          p.nickname.trim(),
          p.ticketCount
        );
        socket.join(room.id);
        broadcast(room.id);
      })
  );

  socket.on("room:reconnect", (p: { resumeToken: string }) =>
    safe(socket, () => {
      const room = rooms.reconnect(socket.id, p.resumeToken);
      socket.join(room.id);
      socket.emit("room:state", room);
      broadcast(room.id);
    })
  );

  socket.on("game:start", (id: string) =>
    safe(socket, () => {
      const room = rooms.get(id);
      if (!room) throw new Error("Room not found.");
      rooms.start(room, socket.id);
      broadcast(id);
    })
  );

  socket.on("game:callNext", (id: string) =>
    safe(socket, () => {
      const room = rooms.get(id);
      if (!room) throw new Error("Room not found.");
      rooms.callNext(room, socket.id);
      broadcast(id);
    })
  );

  socket.on("game:startAutoCall", (p: { roomId: string; interval: number }) =>
    safe(socket, () => {
      const room = rooms.get(p.roomId);
      if (!room) throw new Error("Room not found.");
      rooms.startAutoCall(room, socket.id, p.interval, () => broadcast(p.roomId));
      broadcast(p.roomId);
    })
  );

  socket.on("game:stopAutoCall", (id: string) =>
    safe(socket, () => {
      const room = rooms.get(id);
      if (!room) throw new Error("Room not found.");
      rooms.stopAutoCall(room, socket.id);
      broadcast(id);
    })
  );

  socket.on("game:pause", (id: string) =>
    safe(socket, () => {
      const room = rooms.get(id);
      if (!room) throw new Error("Room not found.");
      rooms.pause(room, socket.id);
      broadcast(id);
    })
  );

  socket.on("game:resume", (id: string) =>
    safe(socket, () => {
      const room = rooms.get(id);
      if (!room) throw new Error("Room not found.");
      rooms.resumeGame(room, socket.id);
      broadcast(id);
    })
  );

  socket.on("game:rematch", (id: string) =>
    safe(socket, () => {
      const room = rooms.get(id);
      if (!room) throw new Error("Room not found.");
      rooms.rematch(room, socket.id);
      broadcast(id);
    })
  );

  socket.on("game:setCallingMode", (p: { roomId: string; mode: CallingMode }) =>
    safe(socket, () => {
      const room = rooms.get(p.roomId);
      if (!room) throw new Error("Room not found.");
      rooms.setCallingMode(room, socket.id, p.mode);
      broadcast(p.roomId);
    })
  );

  socket.on("claim:submit", (p: { roomId: string; condition: WinningCondition }) =>
    safe(socket, () => {
      const room = rooms.get(p.roomId);
      if (!room) throw new Error("Room not found.");
      try {
        const winner = rooms.claim(room, socket.id, p.condition);
        io.to(p.roomId).emit("claim:success", winner);
        broadcast(p.roomId);
      } catch (claimErr) {
        const player = room.players.find((item) => item.id === socket.id);
        const nickname = player?.nickname ?? "A player";
        io.to(p.roomId).emit("claim:bogus", {
          playerId: socket.id,
          nickname,
          condition: p.condition,
          reason: claimErr instanceof Error ? claimErr.message : "Pattern incomplete",
        });
        throw claimErr;
      }
    })
  );

  socket.on("room:reaction", (p: { roomId: string; emoji: string; nickname: string }) => {
    io.to(p.roomId).emit("room:reaction", {
      id: Math.random().toString(36).slice(2),
      emoji: p.emoji,
      nickname: p.nickname,
    });
  });

  socket.on("disconnect", () => {
    const room = rooms.disconnect(socket.id);
    if (room) broadcast(room.id);
  });
});

const port = Number(process.env.PORT ?? 3001);
httpServer.listen(port, () => console.log(`Tambola server listening on :${port}`));
