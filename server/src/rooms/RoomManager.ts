import type { CallingMode, RoomState, WinningCondition } from "@tambola/shared";
import { generateTicket } from "../game/ticket.js";
import { isWinningTicket } from "../game/validation.js";

const code = () => Math.random().toString(36).slice(2, 7).toUpperCase();

export class RoomManager {
  private rooms = new Map<string, RoomState>();
  private resumeTokens = new Map<string, { roomId: string; playerId: string }>();
  private autoCallTimers = new Map<string, NodeJS.Timeout>();

  create(
    hostId: string,
    resumeToken: string,
    nickname: string,
    name: string,
    winningConditions: WinningCondition[],
    allowMultipleWinners: boolean,
    ticketCount = 1
  ) {
    let id = code();
    while (this.rooms.has(id)) id = code();
    const count = Math.min(3, Math.max(1, ticketCount || 1));
    const tickets = Array.from({ length: count }, () => generateTicket());
    const room: RoomState = {
      id,
      name,
      hostId,
      status: "lobby",
      players: [
        {
          id: hostId,
          nickname,
          ticket: tickets[0],
          tickets,
          connected: true,
        },
      ],
      calledNumbers: [],
      currentNumber: null,
      callingMode: "host",
      currentCallerId: hostId,
      winningConditions,
      winners: [],
      allowMultipleWinners,
      autoCallInterval: null,
    };
    this.rooms.set(id, room);
    this.resumeTokens.set(resumeToken, { roomId: id, playerId: hostId });
    return room;
  }

  get(id: string) {
    return this.rooms.get(id);
  }

  join(id: string, playerId: string, resumeToken: string, nickname: string, ticketCount = 1) {
    const room = this.rooms.get(id);
    if (!room) throw new Error("Room not found. Check the code and try again.");
    if (room.status !== "lobby") throw new Error("This game has already started.");
    if (room.players.length >= 30) throw new Error("This room has reached its player limit.");
    if (room.players.some((player) => player.nickname.toLowerCase() === nickname.toLowerCase())) {
      throw new Error("That nickname is already being used.");
    }
    const count = Math.min(3, Math.max(1, ticketCount || 1));
    const tickets = Array.from({ length: count }, () => generateTicket());
    room.players.push({
      id: playerId,
      nickname,
      ticket: tickets[0],
      tickets,
      connected: true,
    });
    this.resumeTokens.set(resumeToken, { roomId: id, playerId });
    return room;
  }

  disconnect(playerId: string) {
    for (const room of this.rooms.values()) {
      const player = room.players.find((item) => item.id === playerId);
      if (player) {
        player.connected = false;
        if (!room.players.some((p) => p.connected)) {
          this.clearAutoCall(room.id);
        }
        return room;
      }
    }
  }

  reconnect(playerId: string, resumeToken: string) {
    const session = this.resumeTokens.get(resumeToken);
    const room = session && this.rooms.get(session.roomId);
    if (!room || !session) throw new Error("We could not resume that player. Join the room again.");
    const player = room.players.find((item) => item.id === session.playerId);
    if (!player || player.connected) throw new Error("This player session is already active.");
    const previousId = player.id;
    player.id = playerId;
    player.connected = true;
    session.playerId = playerId;
    if (room.hostId === previousId) room.hostId = playerId;
    if (room.currentCallerId === previousId) room.currentCallerId = playerId;
    for (const winner of room.winners) {
      if (winner.playerId === previousId) winner.playerId = playerId;
    }
    return room;
  }

  start(room: RoomState, actor: string) {
    this.host(room, actor);
    room.status = "playing";
  }

  callNext(room: RoomState, actor: string) {
    if (room.callingMode === "host") {
      this.host(room, actor);
    } else if (room.currentCallerId !== actor) {
      throw new Error("It is not your turn to call a number.");
    }
    if (room.status !== "playing") throw new Error("The game is not active.");
    const left = Array.from({ length: 90 }, (_, i) => i + 1).filter(
      (n) => !room.calledNumbers.includes(n)
    );
    if (!left.length) {
      this.clearAutoCall(room.id);
      room.autoCallInterval = null;
      throw new Error("All numbers have been called.");
    }
    room.currentNumber = left[Math.floor(Math.random() * left.length)];
    room.calledNumbers.push(room.currentNumber);
    if (room.callingMode === "turns") this.advanceCaller(room);
  }

  startAutoCall(
    room: RoomState,
    actor: string,
    intervalSeconds: number,
    onTick: () => void
  ) {
    this.host(room, actor);
    if (room.status !== "playing") throw new Error("Game is not in playing state.");
    this.clearAutoCall(room.id);
    const validInterval = Math.max(3, Math.min(30, intervalSeconds));
    room.autoCallInterval = validInterval;

    const timer = setInterval(() => {
      try {
        if (room.status !== "playing" || room.calledNumbers.length >= 90) {
          this.clearAutoCall(room.id);
          room.autoCallInterval = null;
          onTick();
          return;
        }
        this.callNext(room, room.hostId);
        onTick();
      } catch {
        this.clearAutoCall(room.id);
        room.autoCallInterval = null;
        onTick();
      }
    }, validInterval * 1000);

    this.autoCallTimers.set(room.id, timer);
  }

  stopAutoCall(room: RoomState, actor: string) {
    this.host(room, actor);
    this.clearAutoCall(room.id);
    room.autoCallInterval = null;
  }

  pause(room: RoomState, actor: string) {
    this.host(room, actor);
    if (room.status === "playing") {
      this.clearAutoCall(room.id);
      room.status = "paused";
    }
  }

  resumeGame(room: RoomState, actor: string) {
    this.host(room, actor);
    if (room.status === "paused") {
      room.status = "playing";
    }
  }

  rematch(room: RoomState, actor: string) {
    this.host(room, actor);
    this.clearAutoCall(room.id);
    room.autoCallInterval = null;
    room.calledNumbers = [];
    room.currentNumber = null;
    room.winners = [];
    room.status = "lobby";
    for (const player of room.players) {
      const count = player.tickets?.length || 1;
      player.tickets = Array.from({ length: count }, () => generateTicket());
      player.ticket = player.tickets[0];
    }
    return room;
  }

  setCallingMode(room: RoomState, actor: string, mode: CallingMode) {
    this.host(room, actor);
    room.callingMode = mode;
    room.currentCallerId =
      mode === "host"
        ? room.hostId
        : room.players[room.calledNumbers.length % room.players.length]?.id ?? room.hostId;
  }

  claim(room: RoomState, playerId: string, condition: WinningCondition) {
    const player = room.players.find((item) => item.id === playerId);
    if (!player) throw new Error("Player not found.");
    if (!room.winningConditions.includes(condition)) {
      throw new Error("This winning condition is disabled.");
    }

    if (condition === "secondFullHouse") {
      const firstWon = room.winners.some((w) => w.condition === "fullHouse");
      if (!firstWon) {
        throw new Error("Full House must be claimed before Second Full House.");
      }
    }

    if (!room.allowMultipleWinners && room.winners.some((winner) => winner.condition === condition)) {
      throw new Error("This prize has already been claimed.");
    }

    const playerTickets = player.tickets?.length ? player.tickets : [player.ticket];
    const isWinner = playerTickets.some((t) => isWinningTicket(t, room.calledNumbers, condition));
    if (!isWinner) {
      throw new Error("You have not completed this pattern on your tickets yet.");
    }

    const winner = { playerId, nickname: player.nickname, condition };
    room.winners.push(winner);

    const hasSecond = room.winningConditions.includes("secondFullHouse");
    if ((hasSecond && condition === "secondFullHouse") || (!hasSecond && condition === "fullHouse")) {
      room.status = "finished";
      this.clearAutoCall(room.id);
      room.autoCallInterval = null;
    }

    return winner;
  }

  private clearAutoCall(roomId: string) {
    const timer = this.autoCallTimers.get(roomId);
    if (timer) {
      clearInterval(timer);
      this.autoCallTimers.delete(roomId);
    }
  }

  private host(room: RoomState, actor: string) {
    if (room.hostId !== actor) throw new Error("Only the host can do that.");
  }

  private advanceCaller(room: RoomState) {
    const currentIndex = room.players.findIndex((player) => player.id === room.currentCallerId);
    room.currentCallerId = room.players[(currentIndex + 1) % room.players.length]?.id ?? room.hostId;
  }
}
