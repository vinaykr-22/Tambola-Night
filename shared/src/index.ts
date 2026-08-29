export type TicketCell = number | null;
export type Ticket = TicketCell[][];

export type WinningCondition =
  | "earlyFive"
  | "topLine"
  | "middleLine"
  | "bottomLine"
  | "fourCorners"
  | "fullHouse";

export type GameStatus = "lobby" | "playing" | "paused" | "finished";
export type CallingMode = "host" | "turns";

export interface Player {
  id: string;
  nickname: string;
  ticket: Ticket;
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
}

export const CONDITION_LABELS: Record<WinningCondition, string> = {
  earlyFive: "Early Five",
  topLine: "Top Line",
  middleLine: "Middle Line",
  bottomLine: "Bottom Line",
  fourCorners: "Four Corners",
  fullHouse: "Full House",
};
