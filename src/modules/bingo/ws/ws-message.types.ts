export interface WsEnvelope<T = unknown> {
  type: string;
  payload: T;
}

// ---- Client -> Server ----

export interface BuyCardsMessage {
  gameId: string;
  quantity?: number;
  numbers?: number[];
}

export interface UpdateMarksMessage {
  gameId: string;
  cardId: string;
  marks: Record<string, boolean>;
}

// ---- Server -> Client ----

export interface PlayerSummary {
  playerId: string;
  displayName: string;
  cardIds: string[];
}

export interface CardSummary {
  id: string;
  ownerId: string;
  numbers: number[];
  marks: Record<string, boolean>;
}

export interface WinnerSummary {
  playerId: string;
  cardId: string | null;
  winType: string;
  prizeAmount: number;
  roundNumber: number | null;
}

export interface PrizeTable {
  line: number;
  doubleLine: number;
  bingo: number;
}

export interface SuperbingoSummary {
  poolAmount: number;
  thresholdBall: number;
}

export interface GameSnapshotPayload {
  id: string;
  state: 'waiting' | 'running' | 'finished';
  purchaseStartedAt: string | null;
  purchaseWindowSeconds: number;
  waitingSecondsRemaining: number | null;
  startAt: string | null;
  /** How many of `drawnNumbers`/`winnersSoFar` are already "revealed" as of `serverTime`. */
  currentRound: number;
  plannedEndRound: number;
  /** ALL balls for the whole game (running/finished), not just the ones drawn so far -
   *  the client animates locally from `startAt`, it never has to ask for the next ball. */
  drawnNumbers: number[];
  players: PlayerSummary[];
  cards: CardSummary[];
  /** ALL winner events for the whole game plan, each carrying its own `roundNumber` -
   *  the client reveals each one locally once its animation reaches that round. */
  winnersSoFar: WinnerSummary[];
  prizeTable: PrizeTable;
  superbingo: SuperbingoSummary;
}

export interface RoomStatePayload {
  serverTime: string;
  room: { id: string; name: string; betAmount: number; maxPlayers: number };
  game: GameSnapshotPayload;
}

export interface GameFinishedPayload {
  gameId: string;
  resultSummary: Record<string, number>;
  winners: WinnerSummary[];
  superbingo: SuperbingoSummary;
  nextGameId: string;
}

export interface ErrorPayload {
  code: string;
  message: string;
}
