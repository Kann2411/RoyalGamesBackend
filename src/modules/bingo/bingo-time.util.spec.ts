import { BingoGameState } from './entities/bingo-game.entity';
import { deriveGameProgress, getPurchaseWindowRemaining } from './bingo-time.util';

describe('bingo-time.util', () => {
  describe('deriveGameProgress', () => {
    it('returns round 0 for a waiting game regardless of persistedSnapshot', () => {
      const game = { state: BingoGameState.WAITING, persistedSnapshot: {} } as any;
      const progress = deriveGameProgress(game, new Date());
      expect(progress).toEqual({ currentRound: 0, plannedEndRound: 90, drawnNumbers: [], isFinished: false });
    });

    it('derives the current round purely from elapsed time since startAt, not from any counter', () => {
      const startAt = new Date('2026-01-01T00:00:00.000Z');
      const plannedDraws = Array.from({ length: 90 }, (_, i) => i + 1);
      const game = {
        state: BingoGameState.RUNNING,
        startAt,
        persistedSnapshot: { plannedDraws, plannedEndRound: 90 },
      } as any;

      const now = new Date(startAt.getTime() + 5000); // 5s later
      const progress = deriveGameProgress(game, now);

      expect(progress.currentRound).toBe(6); // round 1 at t=0s, round 6 at t=5s
      expect(progress.drawnNumbers).toEqual([1, 2, 3, 4, 5, 6]);
      expect(progress.isFinished).toBe(false);
    });

    it('two callers with the same startAt/plan agree on progress even if one never observed intermediate ticks', () => {
      const startAt = new Date('2026-01-01T00:00:00.000Z');
      const plannedDraws = Array.from({ length: 90 }, (_, i) => i + 1);
      const game = {
        state: BingoGameState.RUNNING,
        startAt,
        persistedSnapshot: { plannedDraws, plannedEndRound: 40 },
      } as any;

      const now = new Date(startAt.getTime() + 45000); // past plannedEndRound
      const progressA = deriveGameProgress(game, now);
      const progressB = deriveGameProgress(game, new Date(now)); // simulate a second, independent observer

      expect(progressA).toEqual(progressB);
      expect(progressA.currentRound).toBe(40);
      expect(progressA.isFinished).toBe(true);
    });
  });

  describe('getPurchaseWindowRemaining', () => {
    it('returns null when no purchase has started yet', () => {
      expect(getPurchaseWindowRemaining(null, 10, new Date())).toBeNull();
    });

    it('resumes the countdown from the persisted start time, not from "now"', () => {
      const startedAt = new Date('2026-01-01T00:00:00.000Z');
      const now = new Date(startedAt.getTime() + 4000);
      expect(getPurchaseWindowRemaining(startedAt.toISOString(), 10, now)).toBe(6);
    });

    it('clamps at 0 once the window has fully elapsed', () => {
      const startedAt = new Date('2026-01-01T00:00:00.000Z');
      const now = new Date(startedAt.getTime() + 30000);
      expect(getPurchaseWindowRemaining(startedAt.toISOString(), 10, now)).toBe(0);
    });
  });
});
