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

@Injectable()
export class BingoService implements OnModuleInit {
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

    // Reuse an existing waiting or running game for the room if present
    const existing = await this.gameRepository.findOne({ where: { roomId: room.id, state: BingoGameState.WAITING } });
    if (existing) {
      return existing;
    }
    const running = await this.gameRepository.findOne({ where: { roomId: room.id, state: BingoGameState.RUNNING } });
    if (running) {
      return running;
    }

    const game = this.gameRepository.create({
      roomId: room.id,
      state: BingoGameState.WAITING,
      currentRound: 0,
      resultSummary: {},
      persistedSnapshot: { state: BingoGameState.WAITING },
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
    const game = await this.gameRepository.findOne({
      where: [
        { roomId, state: BingoGameState.WAITING },
        { roomId, state: BingoGameState.RUNNING },
      ],
    });
    if (!game) {
      throw new NotFoundException('No current game for room');
    }
    return game;
  }

  async startGame(gameId: string): Promise<BingoGame> {
    const game = await this.getGame(gameId);
    if (game.state !== BingoGameState.WAITING) {
      throw new BadRequestException('Game already started');
    }

    game.state = BingoGameState.RUNNING;
    game.startAt = new Date();
    game.persistedSnapshot = { state: BingoGameState.RUNNING };
    return this.gameRepository.save(game);
  }

  async drawNumber(gameId: string): Promise<BingoRound> {
    const game = await this.getGame(gameId);
    if (game.state !== BingoGameState.RUNNING) {
      throw new BadRequestException('Game is not running');
    }

    const roundNumber = game.currentRound + 1;
    const drawnNumber = Math.floor(Math.random() * 75) + 1;

    const round = this.roundRepository.create({
      gameId: game.id,
      roundNumber,
      drawnNumber,
    });

    const savedRound = await this.roundRepository.save(round);

    game.currentRound = roundNumber;
    game.persistedSnapshot = { state: BingoGameState.RUNNING, latestDraw: drawnNumber };
    await this.gameRepository.save(game);

    return savedRound;
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

  private generateUniqueCardNumbers(existingCardKeys: Set<string>, count = 15): number[] {
    let numbers: number[];
    let key: string;
    do {
      numbers = this.generateCardNumbers(count);
      key = numbers.join(',');
    } while (existingCardKeys.has(key));

    existingCardKeys.add(key);
    return numbers;
  }

  private validateCustomCardNumbers(numbers: number[], existingCardKeys: Set<string>): number[] {
    if (numbers.length !== 15) {
      throw new BadRequestException('Custom card must contain exactly 15 numbers');
    }

    const uniqueNumbers = new Set(numbers);
    if (uniqueNumbers.size !== numbers.length) {
      throw new BadRequestException('Custom card numbers must be unique');
    }

    if (numbers.some((n) => n < 1 || n > 90)) {
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

  async updateCardMarks(gameId: string, cardId: string, dto: UpdateCardMarksDto): Promise<BingoCard> {
    const card = await this.cardRepository.findOne({ where: { id: cardId, gameId } });
    if (!card) {
      throw new NotFoundException('Card not found');
    }

    card.marks = dto.marks;
    return this.cardRepository.save(card);
  }

  async getGameState(gameId: string): Promise<Record<string, any>> {
    const game = await this.getGame(gameId);
    return {
      game,
      rounds: await this.roundRepository.find({ where: { gameId } }),
      winners: await this.winnerRepository.find({ where: { gameId } }),
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
