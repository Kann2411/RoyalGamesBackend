import { BingoGame, BingoGameState } from './entities/bingo-game.entity';

export const BALL_INTERVAL_MS = 1000;
export const SUPERBINGO_BASE_THRESHOLD = 50;

export interface GameProgress {
  currentRound: number;
  plannedEndRound: number;
  drawnNumbers: number[];
  isFinished: boolean;
}

/**
 * Pure function: derives "where the game is right now" from startAt + the plan persisted at
 * game start, instead of counting how many BingoRound rows an engine tick happened to insert.
 * Any observer (server tick, a client that just reconnected) gets the same answer given the
 * same `now`, regardless of how many players were connected in between.
 */
export function deriveGameProgress(game: BingoGame, now: Date): GameProgress {
  const plannedDraws: number[] = game.persistedSnapshot?.plannedDraws ?? [];
  const plannedEndRound: number = game.persistedSnapshot?.plannedEndRound ?? (plannedDraws.length || 90);

  if (game.state === BingoGameState.WAITING) {
    return { currentRound: 0, plannedEndRound, drawnNumbers: [], isFinished: false };
  }

  if (game.state === BingoGameState.FINISHED || game.state === BingoGameState.CANCELLED) {
    return {
      currentRound: plannedEndRound,
      plannedEndRound,
      drawnNumbers: plannedDraws.slice(0, plannedEndRound),
      isFinished: true,
    };
  }

  const startAt = game.startAt ? new Date(game.startAt).getTime() : now.getTime();
  const elapsedRounds = Math.floor((now.getTime() - startAt) / BALL_INTERVAL_MS) + 1;
  const currentRound = Math.max(0, Math.min(plannedEndRound, elapsedRounds));

  return {
    currentRound,
    plannedEndRound,
    drawnNumbers: plannedDraws.slice(0, currentRound),
    isFinished: currentRound >= plannedEndRound,
  };
}

export function getPurchaseWindowRemaining(
  purchaseStartedAt: string | null | undefined,
  purchaseWindowSeconds: number,
  now: Date,
): number | null {
  if (!purchaseStartedAt) {
    return null;
  }
  const startedAtMs = new Date(purchaseStartedAt).getTime();
  const elapsedSeconds = Math.max(0, Math.floor((now.getTime() - startedAtMs) / 1000));
  return Math.max(0, purchaseWindowSeconds - elapsedSeconds);
}
