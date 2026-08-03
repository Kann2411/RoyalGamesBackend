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

    const game = this.gameRepository.create({
      roomId: room.id,
      state: BingoGameState.WAITING,
      currentRound: 0,
      resultSummary: {},
      persistedSnapshot: { state: BingoGameState.WAITING },
    });

    return this.gameRepository.save(game);
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

    const ticket = this.ticketRepository.create({
      gameId: game.id,
      playerId: player.id,
      cardIds: [],
      cost: 0,
    });

    const savedTicket = await this.ticketRepository.save(ticket);

    const generatedCards = Array.from({ length: 1 }, () => {
      const numbers = Array.from({ length: 24 }, (_, index) => index + 1);
      return this.cardRepository.create({
        gameId: game.id,
        ownerId: player.id,
        numbers,
        marks: {},
        isWinning: false,
        claimedLines: [],
      });
    });

    const savedCards = await this.cardRepository.save(generatedCards);
    savedTicket.cardIds = savedCards.map((card) => card.id);
    await this.ticketRepository.save(savedTicket);

    return { ticket: savedTicket, cards: savedCards };
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

  async topupSuperbingo(amount: number): Promise<BingoSuperBingoPool> {
    const pool = this.superbingoPoolRepository.create({
      amount,
      lastUpdatedAt: new Date(),
    });
    return this.superbingoPoolRepository.save(pool);
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
