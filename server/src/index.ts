import cors from "cors"; import express from "express"; import { createServer } from "node:http"; import { Server, Socket } from "socket.io"; import type { CallingMode, WinningCondition } from "@tambola/shared"; import { RoomManager } from "./rooms/RoomManager.js";
const app = express(); app.use(cors({ origin: process.env.CLIENT_ORIGIN ?? "http://localhost:5173" })); app.get("/health", (_, res) => res.json({ ok: true }));
const httpServer = createServer(app), io = new Server(httpServer, { cors: { origin: process.env.CLIENT_ORIGIN ?? "http://localhost:5173" } }), rooms = new RoomManager();
const broadcast = (id: string) => io.to(id).emit("room:state", rooms.get(id));
const safe = (socket: Socket, action: () => void) => { try { action(); } catch (error) { socket.emit("app:error", error instanceof Error ? error.message : "Something went wrong."); } };
io.on("connection", (socket) => {
  socket.on("room:create", (p: { nickname: string; name: string; conditions: WinningCondition[]; allowMultipleWinners: boolean }) => safe(socket, () => { const room = rooms.create(socket.id, p.nickname.trim(), p.name.trim(), p.conditions, p.allowMultipleWinners); socket.join(room.id); socket.emit("room:created", room.id); broadcast(room.id); }));
  socket.on("room:join", (p: { roomId: string; nickname: string }) => safe(socket, () => { const room = rooms.join(p.roomId.toUpperCase(), socket.id, p.nickname.trim()); socket.join(room.id); broadcast(room.id); }));
  socket.on("game:start", (id: string) => safe(socket, () => { const room = rooms.get(id); if (!room) throw new Error("Room not found."); rooms.start(room, socket.id); broadcast(id); }));
  socket.on("game:callNext", (id: string) => safe(socket, () => { const room = rooms.get(id); if (!room) throw new Error("Room not found."); rooms.callNext(room, socket.id); broadcast(id); }));
  socket.on("game:setCallingMode", (p: { roomId: string; mode: CallingMode }) => safe(socket, () => { const room = rooms.get(p.roomId); if (!room) throw new Error("Room not found."); rooms.setCallingMode(room, socket.id, p.mode); broadcast(p.roomId); }));
  socket.on("claim:submit", (p: { roomId: string; condition: WinningCondition }) => safe(socket, () => { const room = rooms.get(p.roomId); if (!room) throw new Error("Room not found."); const winner = rooms.claim(room, socket.id, p.condition); io.to(p.roomId).emit("claim:success", winner); broadcast(p.roomId); }));
}); httpServer.listen(Number(process.env.PORT ?? 3001), () => console.log("Tambola server listening on :3001"));
