import { BingoGameState } from './entities/bingo-game.entity';
import { BingoService } from './bingo.service';

describe('BingoService', () => {
  let service: BingoService;
  let gameRepository: any;
  let ticketRepository: any;
  let cardRepository: any;
  let roundRepository: any;
  let winnerRepository: any;

  beforeEach(() => {
    gameRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    };
    ticketRepository = {
      find: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    };
    cardRepository = {
      find: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    };
    roundRepository = {
      find: jest.fn(),
      delete: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
    };
    winnerRepository = {
      delete: jest.fn(),
      find: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
    };

    service = new BingoService(
      {} as any,
      {} as any,
      gameRepository as any,
      ticketRepository as any,
      cardRepository as any,
      roundRepository as any,
      {} as any,
      winnerRepository as any,
      {} as any,
    );
  });

  it('does not allow starting a waiting game without purchased cards', async () => {
    const game = { id: 'game-1', state: BingoGameState.WAITING, persistedSnapshot: {} };
    gameRepository.findOne.mockResolvedValue(game);
    cardRepository.find.mockResolvedValue([]);

    await expect(service.startGame('game-1')).rejects.toThrow('Cannot start a game without purchased cards');
  });

  it('cleans tickets and cards for a finished game', async () => {
    await (service as any).cleanupFinishedGameData('game-1');

    expect(cardRepository.delete).toHaveBeenCalledWith({ gameId: 'game-1' });
    expect(ticketRepository.delete).toHaveBeenCalledWith({ gameId: 'game-1' });
  });

  it('draws the first ball immediately when a game starts', async () => {
    const game = { id: 'game-1', state: BingoGameState.WAITING, persistedSnapshot: {}, currentRound: 0 };
    gameRepository.findOne.mockResolvedValue(game);
    cardRepository.find.mockResolvedValue([{}]);
    const drawSpy = jest.spyOn(service, 'drawNumber').mockResolvedValue({} as any);
    const prepareSpy = jest.spyOn(service as any, 'prepareGamePlan').mockResolvedValue(game);

    await service.startGame('game-1');

    expect(prepareSpy).toHaveBeenCalledWith(expect.objectContaining({ id: 'game-1' }));
    expect(drawSpy).toHaveBeenCalledWith('game-1');
  });

  it('returns the current ball and superbingo prize when starting a game', async () => {
    const game = {
      id: 'game-1',
      roomId: 'room-1',
      state: BingoGameState.WAITING,
      currentRound: 0,
      superbingoPoolId: 'pool-1',
      persistedSnapshot: { superbingoThreshold: 5 },
      resultSummary: { line: 0, doubleLine: 0, bingo: 0, superbingo: 0 },
    };
    gameRepository.findOne.mockResolvedValue(game);
    cardRepository.find.mockResolvedValue([{}]);
    roundRepository.findOne = jest.fn().mockResolvedValue({ drawnNumber: 17, drawnAt: new Date() });
    roundRepository.find = jest.fn().mockResolvedValue([{ drawnNumber: 17, drawnAt: new Date() }]);
    winnerRepository.find.mockResolvedValue([]);

    const drawSpy = jest.spyOn(service, 'drawNumber').mockResolvedValue({ drawnNumber: 17 } as any);
    const prepareSpy = jest.spyOn(service as any, 'prepareGamePlan').mockResolvedValue(game);
    (service as any).superbingoPoolRepository = {
      findOne: jest.fn().mockResolvedValue({ id: 'pool-1', roomId: 'room-1', amount: 2000 }),
    };

    const result = await service.startGame('game-1');

    expect(prepareSpy).toHaveBeenCalledWith(expect.objectContaining({ id: 'game-1' }));
    expect(drawSpy).toHaveBeenCalledWith('game-1');
    expect(result.startData.currentBall).toBe(17);
    expect(result.startData.superbingo.prize).toBe(2000);
  });

  it('does not create a new game when refresh-next-game is called while the current waiting game already has cards', async () => {
    const waitingGame = {
      id: 'game-2',
      roomId: 'room-1',
      state: BingoGameState.WAITING,
      persistedSnapshot: {},
    };
    gameRepository.findOne.mockResolvedValue(waitingGame);
    cardRepository.find.mockResolvedValue([{}]);
    ticketRepository.find.mockResolvedValue([]);
    roundRepository.find.mockResolvedValue([]);
    const createGameSpy = jest.spyOn(service as any, 'createGame').mockResolvedValue({ id: 'new-game' });

    const result = await service.refreshNextGame('room-1');

    expect(result.game.id).toBe('game-2');
    expect(result.ignoredRepeatedCall).toBe(true);
    expect(createGameSpy).not.toHaveBeenCalled();
  });

  it('resolves the final bingo state once with numbers and winners', async () => {
    const game = {
      id: 'game-1',
      state: BingoGameState.RUNNING,
      currentRound: 0,
      persistedSnapshot: {
        plannedDraws: [1, 2, 3],
        plannedWinnerEvents: [{ playerId: 'player-1', cardId: 'card-1', winType: 'bingo', prizeAmount: 500, roundNumber: 3 }],
      },
    };
    gameRepository.findOne.mockResolvedValue(game);
    roundRepository = {
      find: jest.fn().mockResolvedValue([]),
      save: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockImplementation((value) => value),
      delete: jest.fn().mockResolvedValue(undefined),
    };
    winnerRepository = {
      create: jest.fn().mockImplementation((value) => value),
      save: jest.fn().mockResolvedValue([]),
      delete: jest.fn().mockResolvedValue(undefined),
      find: jest.fn().mockResolvedValue([]),
    };
    service = new BingoService(
      {} as any,
      {} as any,
      gameRepository as any,
      ticketRepository as any,
      cardRepository as any,
      roundRepository as any,
      {} as any,
      winnerRepository as any,
      {} as any,
    );
    (service as any).roundRepository = roundRepository;
    (service as any).winnerRepository = winnerRepository;

    const result = await (service as any).resolveGameResult('game-1');

    expect(result.game.state).toBe(BingoGameState.FINISHED);
    expect(result.rounds).toHaveLength(3);
    expect(result.drawnNumbers).toEqual([1, 2, 3]);
  });
});
