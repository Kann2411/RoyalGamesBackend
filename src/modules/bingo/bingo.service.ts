import {
  Injectable,
  OnModuleInit,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BingoPlayer, BingoPlayerStatus } from './entities/bingo-player.entity';
import { BingoRoom, BingoRoomType } from './entities/bingo-room.entity';
import { BingoGame, BingoGameState } from './entities/bingo-game.entity';
import { BingoTicket } from './entities/bingo-ticket.entity';
import { BingoCard } from './entities/bingo-card.entity';
import { BingoRound } from './entities/bingo-round.entity';
import { BingoSuperBingoPool } from './entities/bingo-super-bingo-pool.entity';
import { BingoWinner, BingoWinType } from './entities/bingo-winner.entity';
import { BingoAudit } from './entities/bingo-audit.entity';
import { CreatePlayerDto } from './dtos/create-player.dto';
import { CreateRoomDto } from './dtos/create-room.dto';
import { CreateGameDto } from './dtos/create-game.dto';
import { CreateCardDto } from './dtos/create-card.dto';
import { UpdateCardMarksDto } from './dtos/update-card-marks.dto';
import { InitializeGameDto } from './dtos/initialize-game.dto';

@Injectable()
export class BingoService implements OnModuleInit {
  private readonly purchaseWindowSeconds = 10;
  private bingoEngineInterval: NodeJS.Timeout;
  private engineLock = false;

  constructor(
    @InjectRepository(BingoPlayer)
    private readonly playerRepository: Repository<BingoPlayer>,
    @InjectRepository(BingoRoom)
    private readonly roomRepository: Repository<BingoRoom>,
    @InjectRepository(BingoGame)
    private readonly gameRepository: Repository<BingoGame>,
    @InjectRepository(BingoTicket)
    private readonly ticketRepository: Repository<BingoTicket>,
    @InjectRepository(BingoCard)
    private readonly cardRepository: Repository<BingoCard>,
    @InjectRepository(BingoRound)
    private readonly roundRepository: Repository<BingoRound>,
    @InjectRepository(BingoSuperBingoPool)
    private readonly superbingoPoolRepository: Repository<BingoSuperBingoPool>,
    @InjectRepository(BingoWinner)
    private readonly winnerRepository: Repository<BingoWinner>,
    @InjectRepository(BingoAudit)
    private readonly auditRepository: Repository<BingoAudit>,
  ) {}

  async createPlayer(dto: CreatePlayerDto): Promise<BingoPlayer> {
    const existing = await this.playerRepository.findOne({ where: { username: dto.username } });
    if (existing) {
      throw new ConflictException('Player username already exists');
    }

    const player = this.playerRepository.create({
      username: dto.username,
      displayName: dto.displayName ?? dto.username,
      avatarUrl: dto.avatarUrl,
      chips: dto.chips ?? 0,
      status: BingoPlayerStatus.ONLINE,
      meta: {},
    });

    return this.playerRepository.save(player);
  }

  async getPlayer(id: string): Promise<BingoPlayer> {
    const player = await this.playerRepository.findOne({ where: { id } });
    if (!player) {
      throw new NotFoundException('Player not found');
    }
    return player;
  }

  async updatePlayer(id: string, partial: Partial<BingoPlayer>): Promise<BingoPlayer> {
    const player = await this.getPlayer(id);
    Object.assign(player, partial);
    return this.playerRepository.save(player);
  }

  async getRooms(): Promise<BingoRoom[]> {
    return this.roomRepository.find({ where: { isActive: true } });
  }

  async onModuleInit(): Promise<void> {
    await this.ensureDefaultRooms();
    this.startBingoEngine();
  }

  private startBingoEngine(): void {
    if (this.bingoEngineInterval) {
      return;
    }

    this.bingoEngineInterval = setInterval(() => {
      this.runBingoEngine().catch(() => undefined);
    }, 1000);

    this.runBingoEngine().catch(() => undefined);
  }

  private async runBingoEngine(): Promise<void> {
    if (this.engineLock) {
      return;
    }

    this.engineLock = true;
    try {
      const rooms = await this.roomRepository.find({ where: { isActive: true } });
      const now = new Date();

      for (const room of rooms) {
        const game = await this.gameRepository.findOne({
          where: [
            { roomId: room.id, state: BingoGameState.WAITING },
            { roomId: room.id, state: BingoGameState.RUNNING },
          ],
          order: { createdAt: 'ASC' },
        });

        if (!game) {
          await this.createGame({ roomId: room.id, config: {} });
          continue;
        }

        if (game.state === BingoGameState.WAITING) {
          const cards = await this.cardRepository.find({ where: { gameId: game.id } });
          if (cards.length === 0) {
            continue;
          }

          const purchaseStartedAt = game.persistedSnapshot?.purchaseStartedAt
            ? new Date(game.persistedSnapshot.purchaseStartedAt).getTime()
            : null;

          if (!purchaseStartedAt) {
            game.persistedSnapshot = {
              ...game.persistedSnapshot,
              purchaseStartedAt: now.toISOString(),
            };
            await this.gameRepository.save(game);
            continue;
          }

          if (now.getTime() - purchaseStartedAt >= this.purchaseWindowSeconds * 1000) {
            await this.startGame(game.id);
          }
          continue;
        }

        if (game.state === BingoGameState.RUNNING) {
          const lastRound = await this.roundRepository.findOne({
            where: { gameId: game.id },
            order: { roundNumber: 'DESC' },
          });

          const plannedEndRound = game.persistedSnapshot?.plannedEndRound ?? 90;
          const currentRound = game.currentRound ?? 0;
          const shouldAutoFinish = currentRound >= plannedEndRound;

          if (shouldAutoFinish) {
            await this.finishGameAutomatically(game.id);
            continue;
          }

          const lastDrawAt = lastRound?.drawnAt ?? game.startAt;
          const lastTime = lastDrawAt ? new Date(lastDrawAt).getTime() : 0;
          if (now.getTime() - lastTime >= 1000) {
            try {
              await this.drawNumber(game.id);
            } catch {
              // ignore draw errors until next tick
            }
          }
        }
      }
    } finally {
      this.engineLock = false;
    }
  }

  async createRoom(dto: CreateRoomDto): Promise<BingoRoom> {
    const existing = await this.roomRepository.findOne({ where: { name: dto.name } });
    if (existing) {
      throw new ConflictException('Room already exists');
    }

    const room = this.roomRepository.create({
      name: dto.name,
      type: dto.type ?? BingoRoomType.PUBLIC,
      betAmount: dto.betAmount ?? 0,
      maxPlayers: dto.maxPlayers ?? 8,
      isActive: true,
      config: dto.config ?? {},
    });

    return this.roomRepository.save(room);
  }

  async ensureDefaultRooms(): Promise<BingoRoom[]> {
    const defaultRooms = [
      { name: 'Sala 250000', type: BingoRoomType.PUBLIC, betAmount: 250000, maxPlayers: 8, config: { mode: 'classic', chipsRequired: 250000 } },
      { name: 'Sala 100000', type: BingoRoomType.PUBLIC, betAmount: 100000, maxPlayers: 8, config: { mode: 'classic', chipsRequired: 100000 } },
      { name: 'Sala 50000', type: BingoRoomType.PUBLIC, betAmount: 50000, maxPlayers: 8, config: { mode: 'classic', chipsRequired: 50000 } },
      { name: 'Sala 10000', type: BingoRoomType.PUBLIC, betAmount: 10000, maxPlayers: 8, config: { mode: 'classic', chipsRequired: 10000 } },
      { name: 'Sala 5000', type: BingoRoomType.PUBLIC, betAmount: 5000, maxPlayers: 8, config: { mode: 'classic', chipsRequired: 5000 } },
      { name: 'Sala 1000', type: BingoRoomType.PUBLIC, betAmount: 1000, maxPlayers: 8, config: { mode: 'classic', chipsRequired: 1000 } },
      { name: 'Sala 100', type: BingoRoomType.PUBLIC, betAmount: 100, maxPlayers: 8, config: { mode: 'classic', chipsRequired: 100 } },
      { name: 'Sala 25', type: BingoRoomType.PUBLIC, betAmount: 25, maxPlayers: 8, config: { mode: 'classic', chipsRequired: 25 } },
      { name: 'Sala 10', type: BingoRoomType.PUBLIC, betAmount: 10, maxPlayers: 8, config: { mode: 'classic', chipsRequired: 10 } },
    ];

    const created: BingoRoom[] = [];

    for (const roomData of defaultRooms) {
      const existing = await this.roomRepository.findOne({ where: { name: roomData.name } });
      if (!existing) {
        const room = this.roomRepository.create({
          name: roomData.name,
          type: roomData.type,
          betAmount: roomData.betAmount,
          maxPlayers: roomData.maxPlayers,
          isActive: true,
          config: roomData.config,
        });
        created.push(await this.roomRepository.save(room));
      }
    }

    return created;
  }

  async getRoom(id: string): Promise<BingoRoom> {
    const room = await this.roomRepository.findOne({ where: { id } });
    if (!room) {
      throw new NotFoundException('Room not found');
    }
    return room;
  }

  async createGame(dto: CreateGameDto & { roomId: string }): Promise<BingoGame> {
    const room = await this.getRoom(dto.roomId);

    const existing = await this.gameRepository.findOne({
      where: { roomId: room.id, state: BingoGameState.WAITING },
      order: { createdAt: 'DESC' },
    });
    if (existing) {
      return existing;
    }

    const running = await this.gameRepository.findOne({
      where: { roomId: room.id, state: BingoGameState.RUNNING },
      order: { createdAt: 'DESC' },
    });
    if (running) {
      const [cards, tickets, rounds] = await Promise.all([
        this.cardRepository.find({ where: { gameId: running.id } }),
        this.ticketRepository.find({ where: { gameId: running.id } }),
        this.roundRepository.find({ where: { gameId: running.id } }),
      ]);

      const hasActiveActivity = cards.length > 0 || tickets.length > 0 || rounds.length > 0;
      if (!hasActiveActivity) {
        await this.resetGameToWaiting(running);
      } else {
        return running;
      }
    }

    const superbingoThreshold = this.getSuperbingoThreshold();
    const game = this.gameRepository.create({
      roomId: room.id,
      state: BingoGameState.WAITING,
      currentRound: 0,
      resultSummary: { line: 0, doubleLine: 0, bingo: 0, superbingo: 0 },
      persistedSnapshot: { state: BingoGameState.WAITING, superbingoThreshold, latestDraw: null, purchaseStartedAt: null },
    });

    const saved = await this.gameRepository.save(game);
    // Reserve or create a superbingo pool for this room and attach to game
    await this.reservePoolForGame(saved.id, room.id).catch(() => undefined);
    return this.getGame(saved.id);
  }

  async getGame(id: string): Promise<BingoGame> {
    const game = await this.gameRepository.findOne({ where: { id } });
    if (!game) {
      throw new NotFoundException('Game not found');
    }
    return game;
  }

  async joinGame(gameId: string, playerId: string): Promise<{ ticket: BingoTicket; cards: BingoCard[] }> {
    const game = await this.getGame(gameId);
    const player = await this.getPlayer(playerId);

    if (game.state !== BingoGameState.WAITING) {
      throw new BadRequestException('Game is not accepting new players');
    }

    // If player already has a ticket for this game, return it instead of creating a duplicate
    const existingTicket = await this.ticketRepository.findOne({ where: { gameId: game.id, playerId: player.id } });
    if (existingTicket) {
      const existingCards = await this.cardRepository.find({ where: { gameId: game.id, ownerId: player.id } });
      return { ticket: existingTicket, cards: existingCards };
    }

    const ticket = this.ticketRepository.create({
      gameId: game.id,
      playerId: player.id,
      cardIds: [],
      cost: 0,
    });

    const savedTicket = await this.ticketRepository.save(ticket);
    return { ticket: savedTicket, cards: [] };
  }

  async getPlayerByUsername(username: string): Promise<BingoPlayer> {
    const player = await this.playerRepository.findOne({ where: { username } });
    if (!player) {
      throw new NotFoundException('Player not found');
    }
    return player;
  }

  async getRoomCurrentGame(roomId: string): Promise<BingoGame> {
    const waitingGames = await this.gameRepository.find({
      where: { roomId, state: BingoGameState.WAITING },
      order: { createdAt: 'DESC' },
    });

    if (waitingGames.length > 0) {
      return waitingGames[0];
    }

    const runningGames = await this.gameRepository.find({
      where: { roomId, state: BingoGameState.RUNNING },
      order: { createdAt: 'DESC' },
    });

    if (runningGames.length > 0) {
      const [cards, tickets, rounds] = await Promise.all([
        this.cardRepository.find({ where: { gameId: runningGames[0].id } }),
        this.ticketRepository.find({ where: { gameId: runningGames[0].id } }),
        this.roundRepository.find({ where: { gameId: runningGames[0].id } }),
      ]);

      if (cards.length === 0 && tickets.length === 0 && rounds.length === 0) {
        await this.resetGameToWaiting(runningGames[0]);
        return this.createGame({ roomId, config: {} });
      }

      return runningGames[0];
    }

    return this.createGame({ roomId, config: {} });
  }

  private async hasGameActivity(gameId: string): Promise<boolean> {
    const [cards, tickets, rounds] = await Promise.all([
      this.cardRepository.find({ where: { gameId } }),
      this.ticketRepository.find({ where: { gameId } }),
      this.roundRepository.find({ where: { gameId } }),
    ]);

    return cards.length > 0 || tickets.length > 0 || rounds.length > 0;
  }

  async getRoomState(roomId: string): Promise<Record<string, any>> {
    const game = await this.gameRepository.findOne({
      where: { roomId, state: BingoGameState.WAITING },
      order: { createdAt: 'DESC' },
    }) ?? await this.gameRepository.findOne({
      where: { roomId, state: BingoGameState.RUNNING },
      order: { createdAt: 'DESC' },
    });

    if (!game) {
      const created = await this.createGame({ roomId, config: {} });
      return { roomId, game: created, status: 'waiting', nextAction: 'start' };
    }

    const state = game.state === BingoGameState.RUNNING ? 'running' : 'waiting';
    return { roomId, game, status: state, nextAction: state === 'running' ? 'sync' : 'start' };
  }

  async prepareNextRound(roomId: string): Promise<Record<string, any>> {
    const game = await this.gameRepository.findOne({
      where: { roomId, state: BingoGameState.WAITING },
      order: { createdAt: 'DESC' },
    });

    if (!game) {
      const created = await this.createGame({ roomId, config: {} });
      return { roomId, game: created, status: 'waiting', nextAction: 'start' };
    }

    return { roomId, game, status: 'waiting', nextAction: 'start' };
  }

  async refreshNextGame(roomId: string): Promise<Record<string, any>> {
    const existingWaiting = await this.gameRepository.findOne({
      where: { roomId, state: BingoGameState.WAITING },
      order: { createdAt: 'DESC' },
    });

    if (existingWaiting) {
      const hasActivity = await this.hasGameActivity(existingWaiting.id);
      if (hasActivity) {
        if (!existingWaiting.persistedSnapshot?.purchaseStartedAt) {
          existingWaiting.persistedSnapshot = {
            ...existingWaiting.persistedSnapshot,
            purchaseStartedAt: new Date().toISOString(),
          };
          await this.gameRepository.save(existingWaiting);
        }
        return {
          roomId,
          game: existingWaiting,
          status: 'waiting',
          nextAction: 'start',
          purchaseStartedAt: existingWaiting.persistedSnapshot?.purchaseStartedAt ?? null,
          ignoredRepeatedCall: true,
        };
      }
    }

    const existingRunning = await this.gameRepository.findOne({
      where: { roomId, state: BingoGameState.RUNNING },
      order: { createdAt: 'DESC' },
    });

    if (existingRunning) {
      return {
        roomId,
        game: existingRunning,
        status: 'running',
        nextAction: 'sync',
        purchaseStartedAt: existingRunning.persistedSnapshot?.purchaseStartedAt ?? null,
        ignoredRepeatedCall: true,
      };
    }

    const created = await this.createGame({ roomId, config: {} });
    return {
      roomId,
      game: created,
      status: 'waiting',
      nextAction: 'start',
      purchaseStartedAt: created.persistedSnapshot?.purchaseStartedAt ?? null,
      ignoredRepeatedCall: false,
    };
  }

  async startGame(gameId: string): Promise<Record<string, any>> {
    const game = await this.getGame(gameId);
    if (game.state !== BingoGameState.WAITING) {
      throw new BadRequestException('Game already started');
    }

    const cards = await this.cardRepository.find({ where: { gameId: game.id } });
    if (cards.length === 0) {
      throw new BadRequestException('Cannot start a game without purchased cards');
    }

    game.state = BingoGameState.RUNNING;
    game.startAt = new Date();
    game.persistedSnapshot = {
      ...game.persistedSnapshot,
      state: BingoGameState.RUNNING,
      latestDraw: null,
    };

    await this.prepareGamePlan(game);
    const firstRound = await this.drawNumber(game.id);
    const updatedGame = await this.getGame(game.id);
    const currentBall = firstRound?.drawnNumber ?? updatedGame.persistedSnapshot?.latestDraw ?? null;
    const pool = updatedGame.superbingoPoolId
      ? await this.superbingoPoolRepository.findOne({ where: { id: updatedGame.superbingoPoolId } })
      : null;
    const superbingo = this.buildSuperbingoState(updatedGame, pool ? Number(pool.amount) : 0, currentBall);

    return {
      game: updatedGame,
      startData: {
        currentBall,
        superbingo,
      },
    };
  }

  async initializeGame(gameId: string, dto: InitializeGameDto): Promise<Record<string, any>> {
    const game = await this.getGame(gameId);
    if (game.state === BingoGameState.FINISHED) {
      throw new BadRequestException('Cannot initialize a finished game');
    }

    const normalizedState = dto.state ?? BingoGameState.RUNNING;
    game.state = normalizedState as BingoGameState;
    game.currentRound = dto.currentRound ?? 0;
    game.startAt = dto.startAt ? new Date(dto.startAt) : game.startAt ?? new Date();
    game.endAt = dto.endAt ? new Date(dto.endAt) : (undefined as unknown as Date);
    game.resultSummary = dto.resultSummary ?? game.resultSummary ?? { line: 0, doubleLine: 0, bingo: 0, superbingo: 0 };

    const roundsToPersist = (dto.rounds ?? []).map((round, index) => ({
      gameId: game.id,
      roundNumber: round.roundNumber ?? index + 1,
      drawnNumber: round.number,
      drawnAt: round.drawnAt ? new Date(round.drawnAt) : new Date(),
    }));

    if (roundsToPersist.length > 0) {
      await this.roundRepository.delete({ gameId });
      const roundEntities = this.roundRepository.create(roundsToPersist);
      await this.roundRepository.save(roundEntities);
    }

    if ((dto.winners ?? []).length > 0) {
      await this.winnerRepository.delete({ gameId });
      const winners = (dto.winners ?? []).map((winner) => this.winnerRepository.create({
        gameId: game.id,
        playerId: winner.playerId,
        cardId: winner.cardId,
        winType: winner.winType as any,
        prizeAmount: winner.prizeAmount,
      }));
      await this.winnerRepository.save(winners);
    }

    game.persistedSnapshot = {
      ...(game.persistedSnapshot ?? {}),
      state: normalizedState,
      latestDraw: dto.currentBall ?? dto.drawnNumbers?.[dto.drawnNumbers.length - 1] ?? null,
      purchaseStartedAt: game.persistedSnapshot?.purchaseStartedAt ?? null,
      plannedDraws: dto.drawnNumbers ?? [],
      plannedPrizeAmounts: dto.prizes ?? null,
      superbingoThreshold: dto.superbingoThreshold ?? game.persistedSnapshot?.superbingoThreshold ?? null,
    };

    const savedGame = await this.gameRepository.save(game);
    const pool = savedGame.superbingoPoolId
      ? await this.superbingoPoolRepository.findOne({ where: { id: savedGame.superbingoPoolId } })
      : null;
    const currentBall = dto.currentBall ?? dto.drawnNumbers?.[dto.drawnNumbers.length - 1] ?? null;
    const superbingo = this.buildSuperbingoState(savedGame, pool ? Number(pool.amount) : 0, currentBall);

    return {
      game: savedGame,
      startData: {
        currentBall,
        superbingo,
      },
    };
  }

  async finishGameAutomatically(gameId: string): Promise<Record<string, any>> {
    const game = await this.getGame(gameId);
    if (game.state !== BingoGameState.RUNNING) {
      return { game, status: 'skipped' };
    }

    const rounds = await this.roundRepository.find({ where: { gameId }, order: { roundNumber: 'ASC' } });
    const drawnNumbers = rounds.map((round) => round.drawnNumber);
    const lastBall = drawnNumbers[drawnNumbers.length - 1] ?? null;

    game.state = BingoGameState.FINISHED;
    game.endAt = new Date();
    game.currentRound = rounds.length;
    game.resultSummary = {
      ...game.resultSummary,
      line: game.resultSummary?.line ?? 0,
      doubleLine: game.resultSummary?.doubleLine ?? 0,
      bingo: game.resultSummary?.bingo ?? 0,
      superbingo: game.resultSummary?.superbingo ?? 0,
    };
    game.persistedSnapshot = {
      ...game.persistedSnapshot,
      state: BingoGameState.FINISHED,
      latestDraw: lastBall,
    };
    await this.gameRepository.save(game);

    await this.cleanupFinishedGameData(game.id);
    const next = await this.createGame({ roomId: game.roomId, config: {} });

    return {
      game,
      nextGame: next,
      status: 'finished',
      finalBall: lastBall,
      nextState: 'waiting',
    };
  }

  async drawNumber(gameId: string): Promise<BingoRound> {
    const game = await this.getGame(gameId);
    if (game.state !== BingoGameState.RUNNING) {
      throw new BadRequestException('Game is not running');
    }

    const existingRounds = await this.roundRepository.find({ where: { gameId: game.id }, order: { roundNumber: 'ASC' } });
    const drawnNumbers = existingRounds.map((round) => round.drawnNumber);
    const remainingNumbers = Array.from({ length: 90 }, (_, index) => index + 1).filter((n) => !drawnNumbers.includes(n));
    if (remainingNumbers.length === 0) {
      throw new BadRequestException('All bingo numbers have already been drawn');
    }

    const plannedDraws: number[] = game.persistedSnapshot?.plannedDraws ?? [];
    const roundNumber = game.currentRound + 1;
    const drawnNumber = plannedDraws.length >= roundNumber
      ? plannedDraws[roundNumber - 1]
      : remainingNumbers[Math.floor(Math.random() * remainingNumbers.length)];

    const round = this.roundRepository.create({
      gameId: game.id,
      roundNumber,
      drawnNumber,
    });

    const savedRound = await this.roundRepository.save(round);
    const updatedDrawnNumbers = [...drawnNumbers, drawnNumber];

    game.currentRound = roundNumber;
    game.persistedSnapshot = {
      ...game.persistedSnapshot,
      state: BingoGameState.RUNNING,
      latestDraw: drawnNumber,
    };

    await this.evaluateGameAfterDraw(game, updatedDrawnNumbers);
    return savedRound;
  }

  async resolveGameResult(gameId: string): Promise<Record<string, any>> {
    const game = await this.getGame(gameId);
    const rounds = await this.roundRepository.find({ where: { gameId }, order: { roundNumber: 'ASC' } });
    const winners = await this.winnerRepository.find({ where: { gameId } });

    const plannedDraws = game.persistedSnapshot?.plannedDraws ?? [];
    const plannedWinnerEvents = game.persistedSnapshot?.plannedWinnerEvents ?? [];

    if (plannedDraws.length > 0) {
      for (const round of plannedDraws) {
        const existing = rounds.some((item) => item.drawnNumber === round);
        if (!existing) {
          const createdRound = this.roundRepository.create({ gameId, roundNumber: rounds.length + 1, drawnNumber: round });
          await this.roundRepository.save(createdRound);
          rounds.push(createdRound);
        }
      }
    }

    if (plannedWinnerEvents.length > 0) {
      const existingWinnerIds = new Set(winners.map((winner) => `${winner.playerId}:${winner.cardId}:${winner.winType}`));
      const pendingWinners = plannedWinnerEvents
        .filter((event: { playerId: string; cardId: string; winType: string }) => !existingWinnerIds.has(`${event.playerId}:${event.cardId}:${event.winType}`))
        .map((event: { playerId: string; cardId: string; winType: string; prizeAmount: number }) => this.winnerRepository.create({
          gameId,
          playerId: event.playerId,
          cardId: event.cardId,
          winType: event.winType as BingoWinType,
          prizeAmount: event.prizeAmount,
        }));

      if (pendingWinners.length > 0) {
        await this.winnerRepository.save(pendingWinners);
      }
    }

    game.state = BingoGameState.FINISHED;
    game.endAt = new Date();
    game.currentRound = rounds.length;
    game.resultSummary = {
      line: game.resultSummary?.line ?? 100,
      doubleLine: game.resultSummary?.doubleLine ?? 200,
      bingo: game.resultSummary?.bingo ?? 500,
      superbingo: game.resultSummary?.superbingo ?? 0,
    };
    game.persistedSnapshot = {
      ...game.persistedSnapshot,
      state: BingoGameState.FINISHED,
      latestDraw: rounds[rounds.length - 1]?.drawnNumber ?? null,
    };
    await this.gameRepository.save(game);

    return {
      game,
      rounds,
      winners: await this.winnerRepository.find({ where: { gameId } }),
      prizes: game.persistedSnapshot?.plannedPrizeAmounts ?? null,
      drawnNumbers: rounds.map((round) => round.drawnNumber),
      currentBall: rounds[rounds.length - 1]?.drawnNumber ?? null,
      resultSummary: game.resultSummary,
    };
  }

  async claimWin(gameId: string, cardId: string, claimType: string): Promise<BingoWinner> {
    const game = await this.getGame(gameId);
    const card = await this.cardRepository.findOne({ where: { id: cardId, gameId } });
    if (!card) {
      throw new NotFoundException('Card not found');
    }

    const winType = claimType === 'bingo' ? BingoWinType.BINGO : BingoWinType.LINE;
    const winner = this.winnerRepository.create({
      gameId: game.id,
      playerId: card.ownerId,
      cardId: card.id,
      prizeAmount: 100,
      winType,
    });

    return this.winnerRepository.save(winner);
  }

  async getPlayerGameInfo(gameId: string, playerId: string): Promise<Record<string, any>> {
    await this.cleanupInvalidCards(gameId);
    const game = await this.getGame(gameId);
    const ticket = await this.ticketRepository.findOne({ where: { gameId, playerId } });
    const cards = await this.cardRepository.find({ where: { gameId, ownerId: playerId } });

    return {
      game,
      ticket,
      cards,
      rounds: await this.roundRepository.find({ where: { gameId } }),
      winners: await this.winnerRepository.find({ where: { gameId } }),
    };
  }

  async purchaseCard(gameId: string, playerId: string, dto: CreateCardDto): Promise<{ ticket: BingoTicket; cards: BingoCard[] }> {
    const game = await this.getGame(gameId);
    const player = await this.getPlayer(playerId);

    if (game.state !== BingoGameState.WAITING) {
      throw new BadRequestException('Cannot purchase card after game has started');
    }

    const existingTicket = await this.ticketRepository.findOne({ where: { gameId, playerId } });
    if (!existingTicket) {
      throw new NotFoundException('Player has not joined the game');
    }

    const quantity = dto.quantity ?? 1;
    const existingCount = (existingTicket.cardIds || []).length;
    if (existingCount + quantity > 24) {
      throw new BadRequestException('Maximum 24 cards per player per game');
    }

    const existingCards = await this.cardRepository.find({ where: { gameId: game.id, ownerId: player.id } });
    const existingCardKeys = new Set(existingCards.map((card) => [...card.numbers].sort((a, b) => a - b).join(',')));

    if (dto.numbers && quantity > 1) {
      throw new BadRequestException('Cannot request multiple cards with custom numbers');
    }

    const toCreate: BingoCard[] = [];
    for (let i = 0; i < quantity; i++) {
      const numbers = dto.numbers
        ? this.validateCustomCardNumbers(dto.numbers, existingCardKeys)
        : this.generateUniqueCardNumbers(existingCardKeys);
      const card = this.cardRepository.create({
        gameId: game.id,
        ownerId: player.id,
        numbers,
        marks: {},
        isWinning: false,
        claimedLines: [],
      });
      toCreate.push(card);
    }

    const savedCards = await this.cardRepository.save(toCreate);
    existingTicket.cardIds = [...(existingTicket.cardIds || []), ...savedCards.map((c) => c.id)];
    await this.ticketRepository.save(existingTicket);

    const pool = game.superbingoPoolId
      ? await this.superbingoPoolRepository.findOne({ where: { id: game.superbingoPoolId } })
      : await this.getOrCreateSuperbingoForRoom(game.roomId);

    if (pool) {
      if (!game.superbingoPoolId) {
        game.superbingoPoolId = pool.id;
        await this.gameRepository.save(game);
      }

      const increment = Math.max(50, quantity * 25);
      pool.amount = Number(pool.amount) + increment;
      pool.lastUpdatedAt = new Date();
      if (!pool.reservedForGameId) {
        pool.reservedForGameId = game.id;
      }
      await this.superbingoPoolRepository.save(pool);
    }

    if (!game.persistedSnapshot?.purchaseStartedAt && savedCards.length > 0) {
      game.persistedSnapshot = {
        ...game.persistedSnapshot,
        purchaseStartedAt: new Date().toISOString(),
      };
      await this.gameRepository.save(game);
    }

    return { ticket: existingTicket, cards: savedCards };
  }

  private generateCardNumbers(count = 15): number[] {
    const pool = Array.from({ length: 90 }, (_, i) => i + 1);
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = pool[i];
      pool[i] = pool[j];
      pool[j] = tmp;
    }
    return pool.slice(0, count).sort((a, b) => a - b);
  }

  private async cleanupInvalidCards(gameId: string): Promise<void> {
    const cards = await this.cardRepository.find({ where: { gameId } });
    const invalidCardIds = cards
      .filter((card) => !Array.isArray(card.numbers) || card.numbers.length !== 15 || card.numbers.some((n) => typeof n !== 'number' || n < 1 || n > 90))
      .map((card) => card.id);

    if (invalidCardIds.length === 0) {
      return;
    }

    const tickets = await this.ticketRepository.find({ where: { gameId } });
    for (const ticket of tickets) {
      ticket.cardIds = (ticket.cardIds || []).filter((cardId) => !invalidCardIds.includes(cardId));
    }
    await this.ticketRepository.save(tickets);
    await this.cardRepository.delete(invalidCardIds);
  }

  private buildSuperbingoState(game: BingoGame, poolAmount: number, currentBall: number | null): Record<string, any> {
    const threshold = game.persistedSnapshot?.superbingoThreshold ?? this.getSuperbingoThreshold();
    const currentRound = game.currentRound ?? 0;
    const prize = Number(poolAmount || 0);

    return {
      threshold,
      currentRound,
      currentBall,
      poolAmount: prize,
      prize,
      status: currentRound <= threshold ? 'pending' : 'expired',
      counterReached: currentRound >= threshold,
    };
  }

  private getGameTiming(game: BingoGame, rounds: BingoRound[]): {
    elapsedSeconds: number;
    secondsToNextDraw: number;
    nextDrawAt: Date | null;
    superbingoCountdown: number | null;
    waitingSecondsRemaining: number | null;
    purchaseStartedAt: string | null;
  } {
    const now = new Date();
    if (game.state === BingoGameState.WAITING) {
      const purchaseStartedAt = game.persistedSnapshot?.purchaseStartedAt ? new Date(game.persistedSnapshot.purchaseStartedAt).getTime() : null;
      if (!purchaseStartedAt) {
        return {
          elapsedSeconds: 0,
          secondsToNextDraw: 10,
          nextDrawAt: null,
          superbingoCountdown: game.persistedSnapshot?.superbingoThreshold ?? null,
          waitingSecondsRemaining: 10,
          purchaseStartedAt: null,
        };
      }

      const elapsedSeconds = Math.max(0, Math.floor((now.getTime() - purchaseStartedAt) / 1000));
      const waitingSecondsRemaining = Math.max(0, 10 - elapsedSeconds);
      return {
        elapsedSeconds,
        secondsToNextDraw: waitingSecondsRemaining,
        nextDrawAt: new Date(purchaseStartedAt + 10000),
        superbingoCountdown: game.persistedSnapshot?.superbingoThreshold ?? null,
        waitingSecondsRemaining,
        purchaseStartedAt: game.persistedSnapshot.purchaseStartedAt,
      };
    }

    const startAt = game.startAt ? new Date(game.startAt).getTime() : now.getTime();
    const elapsedSeconds = Math.max(0, Math.floor((now.getTime() - startAt) / 1000));
    const lastDrawAt = rounds.length ? new Date(rounds[rounds.length - 1].drawnAt).getTime() : startAt;
    const secondsSinceLastDraw = Math.max(0, (now.getTime() - lastDrawAt) / 1000);
    const secondsToNextDraw = Math.max(0, 1 - secondsSinceLastDraw);
    const nextDrawAt = new Date(lastDrawAt + 1000);
    const superbingoThreshold = game.persistedSnapshot?.superbingoThreshold ?? null;
    const superbingoCountdown = superbingoThreshold !== null ? Math.max(0, superbingoThreshold - game.currentRound) : null;

    return {
      elapsedSeconds,
      secondsToNextDraw,
      nextDrawAt,
      superbingoCountdown,
      waitingSecondsRemaining: null,
      purchaseStartedAt: game.persistedSnapshot?.purchaseStartedAt ?? null,
    };
  }

  private getSuperbingoThreshold(): number {
    return Math.floor(Math.random() * 21) + 50;
  }

  private calculatePrizeAmounts(totalCards: number): { line: number; doubleLine: number; bingo: number } {
    return {
      line: Math.max(100, totalCards * 10),
      doubleLine: Math.max(200, totalCards * 20),
      bingo: Math.max(500, totalCards * 50),
    };
  }

  private calculateSuperbingoPrize(game: BingoGame, poolAmount: number): number {
    const round = game.currentRound || 0;
    const basePrize = Number(poolAmount || 0);
    const multiplier = round > 0 ? Math.min(round, 10) : 1;
    return Math.max(basePrize, basePrize + multiplier * 100);
  }

  private async evaluateGameAfterDraw(game: BingoGame, drawnNumbers: number[]): Promise<void> {
    const drawnSet = new Set(drawnNumbers);
    const cards = await this.cardRepository.find({ where: { gameId: game.id } });
    const existingWinners = await this.winnerRepository.find({ where: { gameId: game.id } });
    const existingWinMap = new Map<string, Set<BingoWinType>>();

    for (const winner of existingWinners) {
      if (!winner.cardId) continue;
      if (!existingWinMap.has(winner.cardId)) {
        existingWinMap.set(winner.cardId, new Set());
      }
      const existingCardWins = existingWinMap.get(winner.cardId);
      existingCardWins?.add(winner.winType);
    }

    const totalCards = cards.length;
    const prizeAmounts = this.calculatePrizeAmounts(totalCards);
    const pool = game.superbingoPoolId
      ? await this.superbingoPoolRepository.findOne({ where: { id: game.superbingoPoolId } })
      : null;
    const superbingoThreshold = game.persistedSnapshot?.superbingoThreshold ?? this.getSuperbingoThreshold();
    let superbingoAwarded = false;
    const newWinners: BingoWinner[] = [];
    const cardsToSave: BingoCard[] = [];
    let bingoFoundThisRound = false;

    for (const card of cards) {
      const rows = [
        card.numbers.slice(0, 5),
        card.numbers.slice(5, 10),
        card.numbers.slice(10, 15),
      ];
      const completedRows = rows.map((row) => row.every((value) => drawnSet.has(value)));
      const completedCount = completedRows.filter(Boolean).length;
      const claimedLines = completedRows
        .map((completed, index) => (completed ? index.toString() : null))
        .filter((value): value is string => value !== null);

      const existingWins = existingWinMap.get(card.id) ?? new Set();
      let cardUpdated = false;

      if (completedRows.some((row) => row) && !existingWins.has(BingoWinType.LINE)) {
        const winner = this.winnerRepository.create({
          gameId: game.id,
          playerId: card.ownerId,
          cardId: card.id,
          prizeAmount: prizeAmounts.line,
          winType: BingoWinType.LINE,
        });
        newWinners.push(winner);
        cardUpdated = true;
      }

      if (completedCount >= 2 && !existingWins.has(BingoWinType.DOUBLE_LINE)) {
        const winner = this.winnerRepository.create({
          gameId: game.id,
          playerId: card.ownerId,
          cardId: card.id,
          prizeAmount: prizeAmounts.doubleLine,
          winType: BingoWinType.DOUBLE_LINE,
        });
        newWinners.push(winner);
        cardUpdated = true;
      }

      if (completedCount === 3 && !existingWins.has(BingoWinType.BINGO)) {
        const winner = this.winnerRepository.create({
          gameId: game.id,
          playerId: card.ownerId,
          cardId: card.id,
          prizeAmount: prizeAmounts.bingo,
          winType: BingoWinType.BINGO,
        });
        newWinners.push(winner);
        bingoFoundThisRound = true;
        cardUpdated = true;

        if (pool && game.currentRound <= superbingoThreshold && !existingWins.has(BingoWinType.SUPERBINGO)) {
          const superbingoWinner = this.winnerRepository.create({
            gameId: game.id,
            playerId: card.ownerId,
            cardId: card.id,
            prizeAmount: Number(pool.amount),
            winType: BingoWinType.SUPERBINGO,
          });
          newWinners.push(superbingoWinner);
          superbingoAwarded = true;
          cardUpdated = true;
        }
      }

      if (cardUpdated || card.claimedLines.length !== claimedLines.length || card.claimedLines.some((line, idx) => line !== claimedLines[idx])) {
        card.claimedLines = claimedLines;
        card.isWinning = card.isWinning || claimedLines.length > 0;
        cardsToSave.push(card);
      }
    }

    if (cardsToSave.length > 0) {
      await this.cardRepository.save(cardsToSave);
    }

    if (newWinners.length > 0) {
      await this.winnerRepository.save(newWinners);
    }

    let awardedSuperbingoAmount = 0;
    if (bingoFoundThisRound) {
      if (pool) {
        if (superbingoAwarded) {
          awardedSuperbingoAmount = Number(pool.amount);
          pool.amount = 0;
          pool.reservedForGameId = null;
          pool.lastUpdatedAt = new Date();
        } else {
          pool.amount = Number(pool.amount) + Math.max(50, totalCards * 5);
          pool.lastUpdatedAt = new Date();
          if (!pool.reservedForGameId) {
            pool.reservedForGameId = game.id;
          }
        }
        await this.superbingoPoolRepository.save(pool);
      }

      game.resultSummary = {
        ...game.resultSummary,
        line: prizeAmounts.line,
        doubleLine: prizeAmounts.doubleLine,
        bingo: prizeAmounts.bingo,
        superbingo: awardedSuperbingoAmount,
      };

      game.state = BingoGameState.FINISHED;
      game.endAt = new Date();
      game.persistedSnapshot = {
        ...game.persistedSnapshot,
        state: BingoGameState.FINISHED,
        latestDraw: drawnNumbers[drawnNumbers.length - 1],
      };
    } else {
      game.resultSummary = {
        ...game.resultSummary,
        line: prizeAmounts.line,
        doubleLine: prizeAmounts.doubleLine,
        bingo: prizeAmounts.bingo,
        superbingo: 0,
      };
    }

    await this.gameRepository.save(game);

    if (bingoFoundThisRound) {
      await this.cleanupFinishedGameData(game.id);
      await this.createGame({ roomId: game.roomId, config: {} });
    }
  }

  private async resetGameToWaiting(game: BingoGame): Promise<BingoGame> {
    await this.cardRepository.delete({ gameId: game.id });
    await this.ticketRepository.delete({ gameId: game.id });
    await this.roundRepository.delete({ gameId: game.id });
    await this.winnerRepository.delete({ gameId: game.id });

    game.state = BingoGameState.WAITING;
    game.currentRound = 0;
    game.startAt = undefined as unknown as Date;
    game.endAt = undefined as unknown as Date;
    game.resultSummary = { line: 0, doubleLine: 0, bingo: 0, superbingo: 0 };
    game.persistedSnapshot = {
      ...(game.persistedSnapshot ?? {}),
      state: BingoGameState.WAITING,
      latestDraw: null,
      purchaseStartedAt: null,
    };

    return this.gameRepository.save(game);
  }

  private async cleanupFinishedGameData(gameId: string): Promise<void> {
    await this.cardRepository.delete({ gameId });
    await this.ticketRepository.delete({ gameId });
    await this.roundRepository.delete({ gameId });
    await this.winnerRepository.delete({ gameId });
  }

  private async prepareGamePlan(game: BingoGame): Promise<BingoGame> {
    const cards = await this.cardRepository.find({ where: { gameId: game.id } });
    const plannedDraws = this.generateRandomSequence(90);
    const superbingoThreshold = game.persistedSnapshot?.superbingoThreshold ?? this.getSuperbingoThreshold();
    const { plannedEndRound, plannedWinnerEvents } = this.planWinnerEvents(cards, plannedDraws, superbingoThreshold);
    const prizeAmounts = this.calculatePrizeAmounts(cards.length);

    game.persistedSnapshot = {
      ...game.persistedSnapshot,
      plannedDraws,
      plannedEndRound,
      plannedWinnerEvents,
      plannedPrizeAmounts: prizeAmounts,
    };

    return this.gameRepository.save(game);
  }

  private generateRandomSequence(count = 90): number[] {
    const pool = Array.from({ length: count }, (_, i) => i + 1);
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = pool[i];
      pool[i] = pool[j];
      pool[j] = tmp;
    }
    return pool;
  }

  private planWinnerEvents(
    cards: BingoCard[],
    plannedDraws: number[],
    superbingoThreshold: number,
  ): { plannedEndRound: number; plannedWinnerEvents: Array<{ playerId: string; cardId: string; winType: BingoWinType; prizeAmount: number; roundNumber: number }> } {
    let plannedEndRound = 90;
    const plannedWinnerEvents: Array<{ playerId: string; cardId: string; winType: BingoWinType; prizeAmount: number; roundNumber: number }> = [];
    const drawPosition = new Map<number, number>();
    plannedDraws.forEach((value, index) => drawPosition.set(value, index + 1));
    const prizeAmounts = this.calculatePrizeAmounts(cards.length);

    for (const card of cards) {
      const rows = [
        card.numbers.slice(0, 5),
        card.numbers.slice(5, 10),
        card.numbers.slice(10, 15),
      ];
      const rowRounds = rows.map((row) => Math.max(...row.map((num) => drawPosition.get(num) ?? 90)));
      const sortedRowRounds = [...rowRounds].sort((a, b) => a - b);
      const lineRound = sortedRowRounds[0];
      const doubleLineRound = sortedRowRounds[1] ?? 90;
      const bingoRound = Math.max(...rowRounds);

      if (lineRound <= 90) {
        plannedWinnerEvents.push({
          playerId: card.ownerId,
          cardId: card.id,
          winType: BingoWinType.LINE,
          prizeAmount: prizeAmounts.line,
          roundNumber: lineRound,
        });
      }

      if (doubleLineRound <= 90) {
        plannedWinnerEvents.push({
          playerId: card.ownerId,
          cardId: card.id,
          winType: BingoWinType.DOUBLE_LINE,
          prizeAmount: prizeAmounts.doubleLine,
          roundNumber: doubleLineRound,
        });
      }

      if (bingoRound <= 90) {
        plannedWinnerEvents.push({
          playerId: card.ownerId,
          cardId: card.id,
          winType: BingoWinType.BINGO,
          prizeAmount: prizeAmounts.bingo,
          roundNumber: bingoRound,
        });
        plannedEndRound = Math.min(plannedEndRound, bingoRound);

        if (bingoRound <= superbingoThreshold) {
          plannedWinnerEvents.push({
            playerId: card.ownerId,
            cardId: card.id,
            winType: BingoWinType.SUPERBINGO,
            prizeAmount: 0,
            roundNumber: bingoRound,
          });
        }
      }
    }

    return { plannedEndRound, plannedWinnerEvents };
  }

  private validateCustomCardNumbers(numbers: number[], existingCardKeys: Set<string>): number[] {
    if (!Array.isArray(numbers) || numbers.length !== 15) {
      throw new BadRequestException('Custom card must contain exactly 15 numbers');
    }

    const uniqueNumbers = new Set(numbers);
    if (uniqueNumbers.size !== numbers.length) {
      throw new BadRequestException('Custom card numbers must be unique');
    }

    if (numbers.some((n) => typeof n !== 'number' || n < 1 || n > 90)) {
      throw new BadRequestException('Custom card numbers must be between 1 and 90');
    }

    const sorted = [...numbers].sort((a, b) => a - b);
    const key = sorted.join(',');
    if (existingCardKeys.has(key)) {
      throw new BadRequestException('Custom card numbers duplicate an existing card');
    }

    existingCardKeys.add(key);
    return sorted;
  }

  private generateUniqueCardNumbers(existingCardKeys: Set<string>, count = 15): number[] {
    const selectedNumbers = new Set<number>();
    while (selectedNumbers.size < count) {
      const candidate = Math.floor(Math.random() * 90) + 1;
      selectedNumbers.add(candidate);
    }

    const sorted = [...selectedNumbers].sort((a, b) => a - b);
    const key = sorted.join(',');
    if (existingCardKeys.has(key)) {
      return this.generateUniqueCardNumbers(existingCardKeys, count);
    }

    existingCardKeys.add(key);
    return sorted;
  }

  async updateCardMarks(gameId: string, cardId: string, dto: UpdateCardMarksDto): Promise<BingoCard> {
    const card = await this.cardRepository.findOne({ where: { id: cardId, gameId } });
    if (!card) {
      throw new NotFoundException('Card not found');
    }

    card.marks = dto.marks;
    return this.cardRepository.save(card);
  }

  async getGameState(gameId: string, playerId?: string): Promise<Record<string, any>> {
    await this.cleanupInvalidCards(gameId);
    let game = await this.getGame(gameId);

    if (game.state === BingoGameState.RUNNING) {
      const [cards, tickets, rounds] = await Promise.all([
        this.cardRepository.find({ where: { gameId } }),
        this.ticketRepository.find({ where: { gameId } }),
        this.roundRepository.find({ where: { gameId }, order: { roundNumber: 'ASC' } }),
      ]);

      if (cards.length === 0 && tickets.length === 0 && rounds.length === 0) {
        game = await this.resetGameToWaiting(game);
      }
    }

    const rounds = await this.roundRepository.find({ where: { gameId }, order: { roundNumber: 'ASC' } });
    const winners = await this.winnerRepository.find({ where: { gameId } });
    const superbingoPool = game.superbingoPoolId
      ? await this.superbingoPoolRepository.findOne({ where: { id: game.superbingoPoolId } })
      : null;

    let ticket = null;
    let cards: BingoCard[] = [];
    if (playerId) {
      ticket = await this.ticketRepository.findOne({ where: { gameId, playerId } });
      cards = await this.cardRepository.find({ where: { gameId, ownerId: playerId } });
    }

    const timing = this.getGameTiming(game, rounds);
    const isWaiting = game.state === BingoGameState.WAITING;
    const isFinished = game.state === BingoGameState.FINISHED;
    const drawnNumbers = isWaiting ? [] : rounds.map((round) => round.drawnNumber);
    const currentBall = isWaiting ? null : drawnNumbers.length ? drawnNumbers[drawnNumbers.length - 1] : null;
    const superbingoState = this.buildSuperbingoState(game, superbingoPool ? Number(superbingoPool.amount) : 0, currentBall);
    const roundsResponse = isWaiting ? [] : rounds.map((round) => ({ roundNumber: round.roundNumber, number: round.drawnNumber, drawnAt: round.drawnAt }));
    const winnersResponse = isWaiting ? [] : winners.map((winner) => ({ id: winner.id, playerId: winner.playerId, cardId: winner.cardId, prizeAmount: winner.prizeAmount, winType: winner.winType }));
    const resultSummary = isWaiting ? {} : game.resultSummary || {};

    return {
      game: {
        id: game.id,
        state: game.state,
        currentRound: game.currentRound,
        rounds: roundsResponse,
        drawnNumbers,
        currentBall,
        superbingoPoolId: game.superbingoPoolId,
        superbingoPoolAmount: superbingoPool ? Number(superbingoPool.amount) : 0,
        resultSummary,
        persistedSnapshot: game.persistedSnapshot,
        superbingoThreshold: game.persistedSnapshot?.superbingoThreshold ?? null,
        superbingo: isWaiting ? {
          threshold: game.persistedSnapshot?.superbingoThreshold ?? null,
          currentRound: game.currentRound,
          currentBall: null,
          poolAmount: 0,
          prize: 0,
          status: 'waiting',
          counterReached: false,
        } : {
          ...superbingoState,
          prize: game.resultSummary?.superbingo ?? superbingoState.prize,
        },
        superbingoValue: isWaiting ? null : game.resultSummary?.superbingo ?? superbingoState.prize,
        elapsedSeconds: timing.elapsedSeconds,
        secondsToNextDraw: timing.secondsToNextDraw,
        nextDrawAt: timing.nextDrawAt,
        superbingoCountdown: timing.superbingoCountdown,
        waitingSecondsRemaining: timing.waitingSecondsRemaining,
        purchaseStartedAt: timing.purchaseStartedAt,
      },
      ticket: ticket ? { playerId: ticket.playerId, cardIds: ticket.cardIds } : null,
      cards: cards.map((card) => ({
        id: card.id,
        numbers: card.numbers,
        marks: card.marks,
        claimedLines: card.claimedLines,
        isWinning: card.isWinning,
      })),
      winners: winnersResponse,
      finalResult: isFinished ? {
        state: game.state,
        rounds: roundsResponse,
        drawnNumbers,
        currentBall,
        winners: winnersResponse,
        prizes: {
          ...(game.resultSummary || {}),
          superbingo: superbingoState.prize,
        },
        resultSummary,
        startedAt: game.startAt,
        endedAt: game.endAt,
      } : null,
    };
  }

  async getGameHistory(gameId: string): Promise<Record<string, any>> {
    return this.getGameState(gameId);
  }

  async getSuperbingo(): Promise<BingoSuperBingoPool[]> {
    return this.superbingoPoolRepository.find();
  }

  async getSuperbingoForRoom(roomId: string): Promise<BingoSuperBingoPool> {
    const pool = await this.superbingoPoolRepository.findOne({ where: { roomId }, order: { updatedAt: 'DESC' } });
    if (!pool) {
      throw new NotFoundException('Superbingo pool not found for room');
    }
    return pool;
  }

  async getOrCreateSuperbingoForRoom(roomId: string): Promise<BingoSuperBingoPool> {
    let pool = await this.superbingoPoolRepository.findOne({ where: { roomId }, order: { updatedAt: 'DESC' } });
    if (!pool) {
      pool = this.superbingoPoolRepository.create({ roomId, amount: 0, lastUpdatedAt: new Date() });
      pool = await this.superbingoPoolRepository.save(pool);
    }
    return pool;
  }

  async topupSuperbingo(amount: number, roomId?: string): Promise<BingoSuperBingoPool> {
    if (roomId) {
      const pool = await this.getOrCreateSuperbingoForRoom(roomId);
      pool.amount = Number(pool.amount) + Number(amount);
      pool.lastUpdatedAt = new Date();
      return this.superbingoPoolRepository.save(pool);
    }

    const pool = this.superbingoPoolRepository.create({
      amount,
      lastUpdatedAt: new Date(),
    });
    return this.superbingoPoolRepository.save(pool);
  }

  async reservePoolForGame(gameId: string, roomId: string): Promise<BingoSuperBingoPool> {
    const pool = await this.getOrCreateSuperbingoForRoom(roomId);
    pool.reservedForGameId = gameId;
    pool.lastUpdatedAt = new Date();
    const saved = await this.superbingoPoolRepository.save(pool);
    // attach to game
    const game = await this.getGame(gameId);
    game.superbingoPoolId = saved.id;
    await this.gameRepository.save(game);
    return saved;
  }

  async finalizeGameSuperbingo(gameId: string, claimedBeforeSuperball: boolean): Promise<void> {
    // If superbingo was not claimed before the super ball, increase pool; otherwise reset pool
    const game = await this.getGame(gameId);
    if (!game.superbingoPoolId) return;
    const pool = await this.superbingoPoolRepository.findOne({ where: { id: game.superbingoPoolId } });
    if (!pool) return;
    if (claimedBeforeSuperball) {
      // reset pool
      pool.amount = 0;
      pool.reservedForGameId = null;
      pool.lastUpdatedAt = new Date();
      await this.superbingoPoolRepository.save(pool);
    } else {
      // increase pool by some rule, e.g., add fixed increment or based on bets; here add 10% of total bets placeholder
      // For now, just update timestamp and keep amount
      pool.reservedForGameId = null;
      pool.lastUpdatedAt = new Date();
      await this.superbingoPoolRepository.save(pool);
    }
  }

  async createAudit(entityType: string, entityId: string, action: string, payload: Record<string, any>, performedBy?: string): Promise<BingoAudit> {
    const audit = this.auditRepository.create({
      entityType,
      entityId,
      action,
      payload,
      performedBy,
    });
    return this.auditRepository.save(audit);
  }
}
