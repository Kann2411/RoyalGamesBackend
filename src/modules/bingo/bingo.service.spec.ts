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

    service = new BingoService(
      {} as any,
      {} as any,
      gameRepository as any,
      ticketRepository as any,
      cardRepository as any,
      {} as any,
      {} as any,
      {} as any,
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
});
