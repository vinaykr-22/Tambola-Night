export type TicketCell = number | null;
export type Ticket = TicketCell[][];

export type WinningCondition =
  | "earlyFive"
  | "earlySeven"
  | "topLine"
  | "middleLine"
  | "bottomLine"
  | "fourCorners"
  | "star"
  | "fullHouse"
  | "secondFullHouse";

export type GameStatus = "lobby" | "playing" | "paused" | "finished";
export type CallingMode = "host" | "turns";

export interface Player {
  id: string;
  nickname: string;
  ticket: Ticket;
  tickets: Ticket[];
  connected: boolean;
}

export interface Winner {
  playerId: string;
  nickname: string;
  condition: WinningCondition;
}

export interface RoomState {
  id: string;
  name: string;
  hostId: string;
  status: GameStatus;
  players: Player[];
  calledNumbers: number[];
  currentNumber: number | null;
  callingMode: CallingMode;
  currentCallerId: string | null;
  winningConditions: WinningCondition[];
  winners: Winner[];
  allowMultipleWinners: boolean;
  autoCallInterval: number | null;
}

export const CONDITION_LABELS: Record<WinningCondition, string> = {
  earlyFive: "Early Five",
  earlySeven: "Early Seven",
  topLine: "Top Line",
  middleLine: "Middle Line",
  bottomLine: "Bottom Line",
  fourCorners: "Four Corners",
  star: "Star Pattern",
  fullHouse: "Full House",
  secondFullHouse: "2nd Full House",
};

export { TAMBOLA_NICKNAMES } from "./nicknames.js";
