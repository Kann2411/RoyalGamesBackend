import { BingoGameState } from './entities/bingo-game.entity';
import { BingoService } from './bingo.service';

describe('BingoService', () => {
  let service: BingoService;
  let gameRepository: any;
  let ticketRepository: any;
  let cardRepository: any;

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
    const roundRepository = {
      find: jest.fn(),
      delete: jest.fn(),
    };
    const winnerRepository = {
      delete: jest.fn(),
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
});
