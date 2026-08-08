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
  };

  const dataSource = {
    transaction: jest.fn(async (cb: (manager: any) => Promise<any>) => cb(dataSourceOverrides.manager)),
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
    dataSource as any,
  );

  return { service, repos, dataSource };
}

describe('BingoService', () => {
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
