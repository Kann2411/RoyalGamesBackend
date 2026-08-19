import { BingoGameState } from './entities/bingo-game.entity';
import { BingoWinType } from './entities/bingo-winner.entity';
import { BingoService } from './bingo.service';

function buildService(dataSourceOverrides: any = {}) {
  const repos = {
    player: { findOne: jest.fn(), save: jest.fn(), create: jest.fn((v: any) => v) },
    room: { findOne: jest.fn(), save: jest.fn(), create: jest.fn((v: any) => v) },
    game: { findOne: jest.fn(), save: jest.fn(), create: jest.fn((v: any) => v), delete: jest.fn() },
    ticket: { find: jest.fn(), findOne: jest.fn(), save: jest.fn(), create: jest.fn((v: any) => v), delete: jest.fn() },
    card: { find: jest.fn(), findOne: jest.fn(), save: jest.fn(), create: jest.fn((v: any) => v), delete: jest.fn(), count: jest.fn() },
    round: { find: jest.fn(), save: jest.fn(), create: jest.fn((v: any) => v), delete: jest.fn() },
    pool: { findOne: jest.fn(), save: jest.fn(), create: jest.fn((v: any) => v) },
    winner: { find: jest.fn(), save: jest.fn(), create: jest.fn((v: any) => v), delete: jest.fn() },
    audit: { create: jest.fn((v: any) => v), save: jest.fn() },
    chat: { find: jest.fn(), findOne: jest.fn(), save: jest.fn(), create: jest.fn((v: any) => v) },
    giftedCredit: { find: jest.fn(), findOne: jest.fn(), save: jest.fn(), create: jest.fn((v: any) => v) },
  };

  const dataSource = {
    transaction: jest.fn(async (cb: (manager: any) => Promise<any>) => cb(dataSourceOverrides.manager)),
    getRepository: jest.fn(() => ({ findOne: jest.fn().mockResolvedValue(null) })),
  };

  const service = new BingoService(
    repos.player as any,
    repos.room as any,
    repos.game as any,
    repos.ticket as any,
    repos.card as any,
    repos.round as any,
    repos.pool as any,
    repos.winner as any,
    repos.audit as any,
    repos.chat as any,
    repos.giftedCredit as any,
    dataSource as any,
  );

  return { service, repos, dataSource };
}

describe('BingoService', () => {
  describe('generateUniqueCardNumbers (private)', () => {
    // Mirrors CartonManager.BuildCardNumbers() on the Unity client: buckets numbers into 9
    // columns of 10 (81-90 for the last one) and greedily assigns each to the least-loaded row.
    // If this ever returns fewer than 15 numbers, a real card would render with missing numbers.
    function reconstructRowCounts(numbers: number[]): number[] {
      const columns: number[][] = Array.from({ length: 9 }, () => []);
      for (const n of numbers) {
        const columnIndex = n === 90 ? 8 : Math.floor((n - 1) / 10);
        columns[columnIndex].push(n);
      }
      const rowCounts = [0, 0, 0];
      let placed = 0;
      for (const column of columns) {
        for (const _ of column) {
          let bestRow = 0;
          let bestCount = Infinity;
          for (let r = 0; r < 3; r++) {
            if (rowCounts[r] < 5 && rowCounts[r] < bestCount) {
              bestRow = r;
              bestCount = rowCounts[r];
            }
          }
          rowCounts[bestRow]++;
          placed++;
        }
      }
      expect(placed).toBe(numbers.length);
      return rowCounts;
    }

    it('always generates exactly 15 numbers that reconstruct into 5 numbers per row (no column overflow)', () => {
      const { service } = buildService();
      for (let i = 0; i < 200; i++) {
        const numbers: number[] = (service as any).generateUniqueCardNumbers(new Set<string>());
        expect(numbers).toHaveLength(15);
        expect(new Set(numbers).size).toBe(15);

        const columnCounts = new Array(9).fill(0);
        for (const n of numbers) {
          expect(n).toBeGreaterThanOrEqual(1);
          expect(n).toBeLessThanOrEqual(90);
          const columnIndex = n === 90 ? 8 : Math.floor((n - 1) / 10);
          columnCounts[columnIndex]++;
        }
        expect(columnCounts.every((c) => c <= 3)).toBe(true);

        const rowCounts = reconstructRowCounts(numbers);
        expect(rowCounts).toEqual([5, 5, 5]);
      }
    });
  });

  describe('computeVisualRows (private)', () => {
    it('agrees with the client-side reconstruction: a fully-drawn visual row is recognized as a line', () => {
      const { service } = buildService();

      // Run many real generated cards through the full pipeline: draw every number in order,
      // find whichever row completes first *visually* (computeVisualRows), and confirm
      // planWinnerEvents reports a LINE event at exactly that round - i.e. the server's notion of
      // "line" matches what the player actually sees fill up on screen.
      for (let i = 0; i < 50; i++) {
        const numbers: number[] = (service as any).generateUniqueCardNumbers(new Set<string>());
        const card = { id: 'card-1', ownerId: 'player-1', numbers };
        const plannedDraws = Array.from({ length: 90 }, (_, idx) => idx + 1); // ball order = numeric order, simplest to reason about
        const drawPosition = new Map<number, number>(plannedDraws.map((v, idx) => [v, idx + 1]));

        const visualRows: number[][] = (service as any).computeVisualRows(numbers);
        expect(visualRows.every((row) => row.length === 5)).toBe(true);

        const expectedLineRound = Math.min(
          ...visualRows.map((row) => Math.max(...row.map((n) => drawPosition.get(n)!))),
        );

        const { plannedWinnerEvents } = (service as any).planWinnerEvents([card], plannedDraws, 50, 0);
        const lineEvent = plannedWinnerEvents.find((e: any) => e.winType === BingoWinType.LINE);

        expect(lineEvent).toBeDefined();
        expect(lineEvent.roundNumber).toBe(expectedLineRound);
      }
    });
  });

  describe('planWinnerEvents (private)', () => {
    it('only awards bingo to the card(s) that hit it first; later cards get no bingo/superbingo event', () => {
      const { service } = buildService();
      // 90 balls drawn in order 1..90. Card A completes at round 10, card B would complete at round 50.
      const plannedDraws = Array.from({ length: 90 }, (_, i) => i + 1);
      const cardA = { id: 'card-a', ownerId: 'player-a', numbers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15] };
      const cardB = { id: 'card-b', ownerId: 'player-b', numbers: [40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 61, 62, 63, 64] };

      const { plannedEndRound, plannedWinnerEvents } = (service as any).planWinnerEvents(
        [cardA, cardB],
        plannedDraws,
        50, // superbingo threshold
        1000, // pool amount
      );

      expect(plannedEndRound).toBe(15); // card A's own bingo round (max of its numbers' draw positions)
      const bingoEvents = plannedWinnerEvents.filter((e: any) => e.winType === BingoWinType.BINGO);
      expect(bingoEvents).toHaveLength(1);
      expect(bingoEvents[0].cardId).toBe('card-a');

      const superbingoEvents = plannedWinnerEvents.filter((e: any) => e.winType === BingoWinType.SUPERBINGO);
      expect(superbingoEvents).toHaveLength(1);
      expect(superbingoEvents[0].prizeAmount).toBe(1000);

      // Card B never got its own bingo/line events pushed past the game's actual end round.
      expect(plannedWinnerEvents.every((e: any) => e.cardId !== 'card-b' || e.roundNumber <= plannedEndRound)).toBe(true);
    });

    it('awards the line/double-line prize only to whichever card gets there first, not to every card that eventually completes one', () => {
      const { service } = buildService();
      const plannedDraws = Array.from({ length: 90 }, (_, i) => i + 1);
      // Card A's numbers are all low (1-15): its first visual row fills in very early.
      const cardA = { id: 'card-a', ownerId: 'player-a', numbers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15] };
      // Card B's numbers are all high (76-90): its first row completes much later, well after
      // card A already claimed the line - it must NOT get its own line payout too.
      const cardB = { id: 'card-b', ownerId: 'player-b', numbers: [76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90] };

      const { plannedWinnerEvents } = (service as any).planWinnerEvents([cardA, cardB], plannedDraws, 90, 1000);

      const lineEvents = plannedWinnerEvents.filter((e: any) => e.winType === BingoWinType.LINE);
      expect(lineEvents).toHaveLength(1);
      expect(lineEvents[0].cardId).toBe('card-a');

      const doubleLineEvents = plannedWinnerEvents.filter((e: any) => e.winType === BingoWinType.DOUBLE_LINE);
      expect(doubleLineEvents).toHaveLength(1);
      expect(doubleLineEvents[0].cardId).toBe('card-a');
    });

    it('does not award superbingo when the winning round is after the threshold ball', () => {
      const { service } = buildService();
      const plannedDraws = Array.from({ length: 90 }, (_, i) => i + 1);
      const card = { id: 'card-a', ownerId: 'player-a', numbers: [80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 70, 71, 72, 73] };

      const { plannedWinnerEvents } = (service as any).planWinnerEvents([card], plannedDraws, 50, 1000);

      expect(plannedWinnerEvents.some((e: any) => e.winType === BingoWinType.SUPERBINGO)).toBe(false);
      expect(plannedWinnerEvents.some((e: any) => e.winType === BingoWinType.BINGO)).toBe(true);
    });
  });

  describe('purchaseCard', () => {
    function buildManager(overrides: any = {}) {
      const queryBuilder = {
        setLock: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(overrides.user ?? { id: 'user-1', chips: 1000 }),
      };
      return {
        findOne: jest.fn(async (entity: any, opts: any) => overrides.findOne?.(entity, opts)),
        find: jest.fn(async () => []),
        save: jest.fn(async (v: any) => v),
        create: jest.fn((_entity: any, v: any) => v),
        createQueryBuilder: jest.fn(() => queryBuilder),
      };
    }

    it('rejects the purchase when the linked user does not have enough chips', async () => {
      const manager = buildManager({
        user: { id: 'user-1', chips: 5 },
        findOne: (entity: any, opts: any) => {
          if (opts.where.id === 'game-1') return { id: 'game-1', state: BingoGameState.WAITING, roomId: 'room-1', persistedSnapshot: {} };
          if (opts.where.id === 'player-1') return { id: 'player-1', userId: 'user-1' };
          if (opts.where.id === 'room-1') return { id: 'room-1', betAmount: 1000, config: { chipsRequired: 1000 } };
          if (opts.where.gameId === 'game-1') return { id: 'ticket-1', gameId: 'game-1', playerId: 'player-1', cardIds: [] };
          return null;
        },
      });
      const { service } = buildService({ manager });

      await expect(service.purchaseCard('game-1', 'player-1', { playerId: 'player-1', quantity: 1 } as any)).rejects.toThrow(
        'INSUFFICIENT_CHIPS',
      );
    });

    it('rejects the purchase when the player has no linked user (cannot charge chips)', async () => {
      const manager = buildManager({
        findOne: (entity: any, opts: any) => {
          if (opts.where.id === 'game-1') return { id: 'game-1', state: BingoGameState.WAITING, roomId: 'room-1', persistedSnapshot: {} };
          if (opts.where.id === 'player-1') return { id: 'player-1', userId: null };
          return null;
        },
      });
      const { service } = buildService({ manager });

      await expect(service.purchaseCard('game-1', 'player-1', { playerId: 'player-1', quantity: 1 } as any)).rejects.toThrow(
        'Player not linked to a user',
      );
    });
  });
});
