import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, Repository } from 'typeorm';
import { BingoPlayer, BingoPlayerStatus } from './entities/bingo-player.entity';
import { BingoRoom, BingoRoomType } from './entities/bingo-room.entity';
import { BingoGame, BingoGameState } from './entities/bingo-game.entity';
import { BingoTicket } from './entities/bingo-ticket.entity';
import { BingoCard } from './entities/bingo-card.entity';
import { BingoRound } from './entities/bingo-round.entity';
import { BingoSuperBingoPool } from './entities/bingo-super-bingo-pool.entity';
import { BingoWinner, BingoWinType } from './entities/bingo-winner.entity';
import { BingoAudit } from './entities/bingo-audit.entity';
import { User } from '../users/entities/user.entity';
import { CreatePlayerDto } from './dtos/create-player.dto';
import { CreateRoomDto } from './dtos/create-room.dto';
import { CreateGameDto } from './dtos/create-game.dto';
import { CreateCardDto } from './dtos/create-card.dto';
import { UpdateCardMarksDto } from './dtos/update-card-marks.dto';
import {
  deriveGameProgress,
  getPurchaseWindowRemaining,
  SUPERBINGO_BASE_THRESHOLD,
} from './bingo-time.util';
import {
  GameSnapshotPayload,
  CardSummary,
  PlayerSummary,
  WinnerSummary,
} from './ws/ws-message.types';

interface PlannedWinnerEvent {
  playerId: string;
  cardId: string;
  winType: BingoWinType;
  prizeAmount: number;
  roundNumber: number;
}

@Injectable()
export class BingoService {
  readonly purchaseWindowSeconds = 10;

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
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  // ---------------------------------------------------------------------
  // Players
  // ---------------------------------------------------------------------

  async createPlayer(dto: CreatePlayerDto): Promise<BingoPlayer> {
    if (dto.userId) {
      const existingByUser = await this.playerRepository.findOne({ where: { userId: dto.userId } });
      if (existingByUser) {
        existingByUser.displayName = dto.displayName ?? existingByUser.displayName;
        existingByUser.avatarUrl = dto.avatarUrl ?? existingByUser.avatarUrl;
        existingByUser.status = BingoPlayerStatus.ONLINE;
        return this.playerRepository.save(existingByUser);
      }
    }

    const existingByUsername = await this.playerRepository.findOne({ where: { username: dto.username } });
    if (existingByUsername) {
      if (dto.userId && !existingByUsername.userId) {
        existingByUsername.userId = dto.userId;
        return this.playerRepository.save(existingByUsername);
      }
      throw new ConflictException('Player username already exists');
    }

    const player = this.playerRepository.create({
      username: dto.username,
      displayName: dto.displayName ?? dto.username,
      avatarUrl: dto.avatarUrl,
      userId: dto.userId ?? null,
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

  async getPlayerByUsername(username: string): Promise<BingoPlayer> {
    const player = await this.playerRepository.findOne({ where: { username } });
    if (!player) {
      throw new NotFoundException('Player not found');
    }
    return player;
  }

  // ---------------------------------------------------------------------
  // Rooms
  // ---------------------------------------------------------------------

  async getRooms(): Promise<BingoRoom[]> {
    return this.roomRepository.find({ where: { isActive: true } });
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

  // ---------------------------------------------------------------------
  // Games: lifecycle (waiting -> running -> finished)
  // ---------------------------------------------------------------------

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
      const hasActivity = await this.hasGameActivity(running.id);
      if (!hasActivity) {
        await this.resetGameToWaiting(running);
      } else {
        return running;
      }
    }

    const game = this.gameRepository.create({
      roomId: room.id,
      state: BingoGameState.WAITING,
      currentRound: 0,
      resultSummary: { line: 0, doubleLine: 0, bingo: 0, superbingo: 0 },
      persistedSnapshot: { state: BingoGameState.WAITING, purchaseStartedAt: null },
    });

    const saved = await this.gameRepository.save(game);
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
      const hasActivity = await this.hasGameActivity(runningGames[0].id);
      if (!hasActivity) {
        await this.resetGameToWaiting(runningGames[0]);
        return this.createGame({ roomId, config: {} });
      }
      return runningGames[0];
    }

    return this.createGame({ roomId, config: {} });
  }

  private async hasGameActivity(gameId: string): Promise<boolean> {
    const [cards, tickets, rounds] = await Promise.all([
      this.cardRepository.count({ where: { gameId } }),
      this.ticketRepository.count({ where: { gameId } }),
      this.roundRepository.count({ where: { gameId } }),
    ]);

    return cards > 0 || tickets > 0 || rounds > 0;
  }

  async getRoomState(roomId: string): Promise<Record<string, any>> {
    const game = await this.getRoomCurrentGame(roomId);
    const snapshot = await this.buildGameSnapshot(game);
    return { roomId, game: snapshot, status: snapshot.state, nextAction: snapshot.state === 'running' ? 'sync' : 'start' };
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
    const game = await this.getRoomCurrentGame(roomId);
    return {
      roomId,
      game,
      status: game.state,
      nextAction: game.state === BingoGameState.RUNNING ? 'sync' : 'start',
      purchaseStartedAt: game.persistedSnapshot?.purchaseStartedAt ?? null,
    };
  }

  /**
   * Transitions a WAITING game to RUNNING: computes the entire draw + winner plan up front
   * (server-authoritative, "pre-scripted") and persists it in one shot, so any observer can
   * derive "where the game is right now" from `startAt` alone (see bingo-time.util.ts).
   * Uses an optimistic row lock (`UPDATE ... WHERE state = 'waiting'`) so two concurrent callers
   * (e.g. the engine tick firing twice) can't both start the same game.
   */
  async startGame(gameId: string): Promise<BingoGame> {
    return this.dataSource.transaction(async (manager) => {
      const claimed = await manager.update(
        BingoGame,
        { id: gameId, state: BingoGameState.WAITING },
        { state: BingoGameState.RUNNING, startAt: new Date() },
      );

      if (claimed.affected === 0) {
        return manager.findOneOrFail(BingoGame, { where: { id: gameId } });
      }

      const cards = await manager.find(BingoCard, { where: { gameId } });
      if (cards.length === 0) {
        await manager.update(BingoGame, { id: gameId }, { state: BingoGameState.WAITING, startAt: null as any });
        throw new BadRequestException('Cannot start a game without purchased cards');
      }

      const game = await manager.findOneOrFail(BingoGame, { where: { id: gameId } });
      const pool = await this.getOrCreateSuperbingoForRoom(game.roomId, manager);

      const plannedDraws = this.generateRandomSequence(90);
      const { plannedEndRound, plannedWinnerEvents } = this.planWinnerEvents(
        cards,
        plannedDraws,
        pool.thresholdBall,
        Number(pool.amount),
      );
      const prizeAmounts = this.calculatePrizeAmounts(cards.length);

      game.persistedSnapshot = {
        ...game.persistedSnapshot,
        state: BingoGameState.RUNNING,
        plannedDraws,
        plannedEndRound,
        plannedPrizeAmounts: prizeAmounts,
        superbingoThreshold: pool.thresholdBall,
      };
      await manager.save(game);

      const rounds = plannedDraws.map((drawnNumber, index) =>
        manager.create(BingoRound, {
          gameId,
          roundNumber: index + 1,
          drawnNumber,
          drawnAt: new Date(game.startAt.getTime() + index * 1000),
        }),
      );
      await manager.save(rounds);

      if (plannedWinnerEvents.length > 0) {
        const winners = plannedWinnerEvents.map((event) =>
          manager.create(BingoWinner, {
            gameId,
            playerId: event.playerId,
            cardId: event.cardId,
            winType: event.winType,
            prizeAmount: event.prizeAmount,
            roundNumber: event.roundNumber,
          }),
        );
        await manager.save(winners);
      }

      return manager.findOneOrFail(BingoGame, { where: { id: gameId } });
    });
  }

  /**
   * Transitions a RUNNING game to FINISHED once `deriveGameProgress` says the plan is exhausted.
   * Awards every precomputed winner's prize to their linked User.chips, rolls the superbingo pool
   * (grow-or-reset), cleans up the finished game's live data, and immediately queues the next
   * waiting game for the room so the loop continues on its own.
   */
  async finishGameAutomatically(gameId: string): Promise<Record<string, any>> {
    const result = await this.dataSource.transaction(async (manager) => {
      const claimed = await manager.update(
        BingoGame,
        { id: gameId, state: BingoGameState.RUNNING },
        { state: BingoGameState.FINISHED, endAt: new Date() },
      );

      if (claimed.affected === 0) {
        const existing = await manager.findOneOrFail(BingoGame, { where: { id: gameId } });
        return { game: existing, winners: [] as BingoWinner[], skipped: true };
      }

      const game = await manager.findOneOrFail(BingoGame, { where: { id: gameId } });
      const winners = await manager.find(BingoWinner, { where: { gameId } });

      const totalsByPlayer = new Map<string, number>();
      for (const winner of winners) {
        totalsByPlayer.set(winner.playerId, (totalsByPlayer.get(winner.playerId) ?? 0) + Number(winner.prizeAmount));
      }
      for (const [playerId, amount] of totalsByPlayer) {
        if (amount <= 0) continue;
        const player = await manager.findOne(BingoPlayer, { where: { id: playerId } });
        if (player?.userId) {
          await manager.increment(User, { id: player.userId }, 'chips', amount);
        }
      }

      const superbingoWinner = winners.find((w) => w.winType === BingoWinType.SUPERBINGO);
      const cardsSold = await manager.count(BingoCard, { where: { gameId } });
      await this.finalizeSuperbingoPool(manager, game, !!superbingoWinner, cardsSold);

      game.resultSummary = {
        ...game.persistedSnapshot?.plannedPrizeAmounts,
        superbingo: superbingoWinner?.prizeAmount ?? 0,
      };
      game.persistedSnapshot = { ...game.persistedSnapshot, state: BingoGameState.FINISHED };
      await manager.save(game);

      await manager.delete(BingoCard, { gameId });
      await manager.delete(BingoTicket, { gameId });
      await manager.delete(BingoRound, { gameId });
      await manager.delete(BingoWinner, { gameId });

      return { game, winners, skipped: false };
    });

    const nextGame = await this.createGame({ roomId: result.game.roomId, config: {} });
    return { game: result.game, winners: result.winners, nextGame };
  }

  // ---------------------------------------------------------------------
  // Cards / purchases
  // ---------------------------------------------------------------------

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

  /**
   * Charges the player's linked User.chips atomically and creates their card(s) in the same
   * transaction. The client never decides the amount charged: it's always `room price * quantity`,
   * validated and applied server-side.
   */
  async purchaseCard(gameId: string, playerId: string, dto: CreateCardDto): Promise<{ ticket: BingoTicket; cards: BingoCard[] }> {
    return this.dataSource.transaction(async (manager) => {
      const game = await manager.findOne(BingoGame, { where: { id: gameId } });
      if (!game) {
        throw new NotFoundException('Game not found');
      }
      if (game.state !== BingoGameState.WAITING) {
        throw new BadRequestException('Cannot purchase card after game has started');
      }

      const player = await manager.findOne(BingoPlayer, { where: { id: playerId } });
      if (!player) {
        throw new NotFoundException('Player not found');
      }
      if (!player.userId) {
        throw new BadRequestException('Player not linked to a user, cannot charge chips');
      }

      const room = await manager.findOne(BingoRoom, { where: { id: game.roomId } });
      if (!room) {
        throw new NotFoundException('Room not found');
      }

      const existingTicket = await manager.findOne(BingoTicket, { where: { gameId, playerId } });
      if (!existingTicket) {
        throw new NotFoundException('Player has not joined the game');
      }

      const quantity = dto.quantity ?? 1;
      const existingCount = (existingTicket.cardIds || []).length;
      if (existingCount + quantity > 24) {
        throw new BadRequestException('Maximum 24 cards per player per game');
      }

      const existingCards = await manager.find(BingoCard, { where: { gameId: game.id, ownerId: player.id } });
      const existingCardKeys = new Set(existingCards.map((card) => [...card.numbers].sort((a, b) => a - b).join(',')));

      if (dto.numbers && quantity > 1) {
        throw new BadRequestException('Cannot request multiple cards with custom numbers');
      }

      const unitCost = Number(room.config?.chipsRequired ?? room.betAmount ?? 0);
      const totalCost = unitCost * quantity;

      if (totalCost > 0) {
        const user = await manager
          .createQueryBuilder(User, 'user')
          .setLock('pessimistic_write')
          .where('user.id = :id', { id: player.userId })
          .getOne();

        if (!user) {
          throw new NotFoundException('Linked user not found');
        }
        if (Number(user.chips) < totalCost) {
          throw new BadRequestException('INSUFFICIENT_CHIPS');
        }
        user.chips = Number(user.chips) - totalCost;
        await manager.save(user);
      }

      const toCreate: BingoCard[] = [];
      for (let i = 0; i < quantity; i++) {
        const numbers = dto.numbers
          ? this.validateCustomCardNumbers(dto.numbers, existingCardKeys)
          : this.generateUniqueCardNumbers(existingCardKeys);
        toCreate.push(
          manager.create(BingoCard, {
            gameId: game.id,
            ownerId: player.id,
            numbers,
            marks: {},
            isWinning: false,
            claimedLines: [],
          }),
        );
      }

      const savedCards = await manager.save(toCreate);
      existingTicket.cardIds = [...(existingTicket.cardIds || []), ...savedCards.map((c) => c.id)];
      existingTicket.cost = Number(existingTicket.cost) + totalCost;
      await manager.save(existingTicket);

      if (!game.persistedSnapshot?.purchaseStartedAt) {
        game.persistedSnapshot = {
          ...game.persistedSnapshot,
          purchaseStartedAt: new Date().toISOString(),
        };
        await manager.save(game);
      }

      return { ticket: existingTicket, cards: savedCards };
    });
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

  private calculatePrizeAmounts(totalCards: number): { line: number; doubleLine: number; bingo: number } {
    return {
      line: Math.max(100, totalCards * 10),
      doubleLine: Math.max(200, totalCards * 20),
      bingo: Math.max(500, totalCards * 50),
    };
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
      purchaseStartedAt: null,
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

  /**
   * Computes, purely from the (already random) draw order, exactly which round each card
   * completes a line / double line / bingo. The game ends at the EARLIEST bingo round across all
   * cards (`plannedEndRound`); only that round's bingo(s) actually happen, so any card whose own
   * bingo would land later never gets that event (fixes a bug in the original implementation,
   * which awarded bingo/superbingo to every card regardless of whether the game was still running
   * by the time they'd have completed it).
   */
  private planWinnerEvents(
    cards: BingoCard[],
    plannedDraws: number[],
    superbingoThreshold: number,
    superbingoPoolAmount: number,
  ): { plannedEndRound: number; plannedWinnerEvents: PlannedWinnerEvent[] } {
    const drawPosition = new Map<number, number>();
    plannedDraws.forEach((value, index) => drawPosition.set(value, index + 1));
    const prizeAmounts = this.calculatePrizeAmounts(cards.length);

    const perCard = cards.map((card) => {
      const rows = [card.numbers.slice(0, 5), card.numbers.slice(5, 10), card.numbers.slice(10, 15)];
      const rowRounds = rows.map((row) => Math.max(...row.map((num) => drawPosition.get(num) ?? 90)));
      const sortedRowRounds = [...rowRounds].sort((a, b) => a - b);
      return {
        card,
        lineRound: sortedRowRounds[0],
        doubleLineRound: sortedRowRounds[1] ?? 90,
        bingoRound: Math.max(...rowRounds),
      };
    });

    const plannedEndRound = Math.min(90, ...perCard.map((c) => c.bingoRound));
    const plannedWinnerEvents: PlannedWinnerEvent[] = [];

    for (const { card, lineRound, doubleLineRound, bingoRound } of perCard) {
      if (lineRound <= plannedEndRound) {
        plannedWinnerEvents.push({
          playerId: card.ownerId,
          cardId: card.id,
          winType: BingoWinType.LINE,
          prizeAmount: prizeAmounts.line,
          roundNumber: lineRound,
        });
      }

      if (doubleLineRound <= plannedEndRound) {
        plannedWinnerEvents.push({
          playerId: card.ownerId,
          cardId: card.id,
          winType: BingoWinType.DOUBLE_LINE,
          prizeAmount: prizeAmounts.doubleLine,
          roundNumber: doubleLineRound,
        });
      }

      if (bingoRound === plannedEndRound) {
        plannedWinnerEvents.push({
          playerId: card.ownerId,
          cardId: card.id,
          winType: BingoWinType.BINGO,
          prizeAmount: prizeAmounts.bingo,
          roundNumber: bingoRound,
        });

        if (bingoRound <= superbingoThreshold) {
          plannedWinnerEvents.push({
            playerId: card.ownerId,
            cardId: card.id,
            winType: BingoWinType.SUPERBINGO,
            prizeAmount: superbingoPoolAmount,
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

  // ---------------------------------------------------------------------
  // Snapshot builder (shared by the WS gateway's room_state/game_started and REST fallback)
  // ---------------------------------------------------------------------

  async buildGameSnapshot(game: BingoGame): Promise<GameSnapshotPayload> {
    await this.cleanupInvalidCards(game.id);
    const now = new Date();
    const progress = deriveGameProgress(game, now);

    const [cards, tickets, winners, pool, room] = await Promise.all([
      this.cardRepository.find({ where: { gameId: game.id } }),
      this.ticketRepository.find({ where: { gameId: game.id } }),
      this.winnerRepository.find({ where: { gameId: game.id } }),
      game.superbingoPoolId
        ? this.superbingoPoolRepository.findOne({ where: { id: game.superbingoPoolId } })
        : this.getOrCreateSuperbingoForRoom(game.roomId),
      this.roomRepository.findOne({ where: { id: game.roomId } }),
    ]);

    const playersById = new Map<string, PlayerSummary>();
    for (const ticket of tickets) {
      playersById.set(ticket.playerId, { playerId: ticket.playerId, displayName: '', cardIds: [...(ticket.cardIds ?? [])] });
    }
    if (playersById.size > 0) {
      const players = await this.playerRepository.find({ where: { id: In(Array.from(playersById.keys())) } });
      for (const player of players) {
        const entry = playersById.get(player.id);
        if (entry) entry.displayName = player.displayName ?? player.username;
      }
    }

    const cardSummaries: CardSummary[] = cards.map((card) => ({
      id: card.id,
      ownerId: card.ownerId,
      numbers: card.numbers,
      marks: card.marks ?? {},
    }));

    // Full plan (not just "so far"): the client receives every ball and every winner event for the
    // whole game in one shot and animates locally against `startAt` + `currentRound`, instead of
    // polling for the next ball. `currentRound` is the pointer telling the client how many of these
    // are already "revealed" as of `serverTime`; the rest keep animating client-side in real time.
    const fullDrawnNumbers: number[] = game.state === BingoGameState.WAITING
      ? []
      : (game.persistedSnapshot?.plannedDraws ?? []).slice(0, progress.plannedEndRound);

    const allWinners: WinnerSummary[] = game.state === BingoGameState.WAITING
      ? []
      : winners.map((w) => ({
          playerId: w.playerId,
          cardId: w.cardId,
          winType: w.winType,
          prizeAmount: Number(w.prizeAmount),
          roundNumber: w.roundNumber,
        }));

    const prizeTable = game.persistedSnapshot?.plannedPrizeAmounts ?? this.calculatePrizeAmounts(cards.length);
    const purchaseStartedAt = game.persistedSnapshot?.purchaseStartedAt ?? null;

    return {
      id: game.id,
      state: game.state as 'waiting' | 'running' | 'finished',
      purchaseStartedAt,
      purchaseWindowSeconds: this.purchaseWindowSeconds,
      waitingSecondsRemaining:
        game.state === BingoGameState.WAITING
          ? getPurchaseWindowRemaining(purchaseStartedAt, this.purchaseWindowSeconds, now)
          : null,
      startAt: game.startAt ? new Date(game.startAt).toISOString() : null,
      currentRound: progress.currentRound,
      plannedEndRound: progress.plannedEndRound,
      drawnNumbers: fullDrawnNumbers,
      players: Array.from(playersById.values()),
      cards: cardSummaries,
      winnersSoFar: allWinners,
      prizeTable: { line: prizeTable.line ?? 0, doubleLine: prizeTable.doubleLine ?? 0, bingo: prizeTable.bingo ?? 0 },
      superbingo: {
        poolAmount: pool ? Number(pool.amount) : 0,
        thresholdBall: pool ? pool.thresholdBall : SUPERBINGO_BASE_THRESHOLD,
      },
    };
  }

  async getGameState(gameId: string, playerId?: string): Promise<Record<string, any>> {
    const game = await this.getGame(gameId);
    const snapshot = await this.buildGameSnapshot(game);

    let ticket: BingoTicket | null = null;
    let cards: BingoCard[] = [];
    if (playerId) {
      ticket = await this.ticketRepository.findOne({ where: { gameId, playerId } });
      cards = await this.cardRepository.find({ where: { gameId, ownerId: playerId } });
    }

    return {
      game: snapshot,
      ticket: ticket ? { playerId: ticket.playerId, cardIds: ticket.cardIds } : null,
      cards: cards.map((card) => ({ id: card.id, numbers: card.numbers, marks: card.marks, claimedLines: card.claimedLines, isWinning: card.isWinning })),
      winners: snapshot.winnersSoFar,
      finalResult: snapshot.state === 'finished' ? snapshot : null,
    };
  }

  async getGameHistory(gameId: string): Promise<Record<string, any>> {
    return this.getGameState(gameId);
  }

  // ---------------------------------------------------------------------
  // Superbingo pool
  // ---------------------------------------------------------------------

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

  async getOrCreateSuperbingoForRoom(roomId: string, manager?: EntityManager): Promise<BingoSuperBingoPool> {
    const repo = manager ? manager.getRepository(BingoSuperBingoPool) : this.superbingoPoolRepository;
    let pool = await repo.findOne({ where: { roomId }, order: { updatedAt: 'DESC' } });
    if (!pool) {
      pool = repo.create({ roomId, amount: 0, lastUpdatedAt: new Date() });
      pool = await repo.save(pool);
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
    const game = await this.getGame(gameId);
    game.superbingoPoolId = saved.id;
    await this.gameRepository.save(game);
    return saved;
  }

  /**
   * Rolls the room's superbingo pool at the end of a game: grows it (pool amount by cards sold,
   * threshold ball by +1) if nobody hit superbingo, or resets both to their base values if someone did.
   */
  private async finalizeSuperbingoPool(
    manager: EntityManager,
    game: BingoGame,
    hadSuperbingoWinner: boolean,
    cardsSold: number,
  ): Promise<void> {
    if (!game.superbingoPoolId) {
      return;
    }
    const pool = await manager
      .createQueryBuilder(BingoSuperBingoPool, 'pool')
      .setLock('pessimistic_write')
      .where('pool.id = :id', { id: game.superbingoPoolId })
      .getOne();
    if (!pool) {
      return;
    }

    if (hadSuperbingoWinner) {
      pool.amount = pool.resetBaseAmount;
      pool.thresholdBall = SUPERBINGO_BASE_THRESHOLD;
    } else {
      pool.amount = Number(pool.amount) + Math.max(50, cardsSold * 25);
      pool.thresholdBall = Math.min(90, pool.thresholdBall + 1);
    }
    pool.reservedForGameId = null;
    pool.lastUpdatedAt = new Date();
    await manager.save(pool);
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
