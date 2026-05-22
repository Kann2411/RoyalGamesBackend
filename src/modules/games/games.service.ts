import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Game } from './entities/game.entity';
import { User } from '../users/entities/user.entity';
import { CreateGameDto } from './dtos/create-game.dto';
import { FavoriteGameDto } from './dtos/favorite-game.dto';
import { GamesRepository } from './repositories/games.repository';

@Injectable()
export class GamesService {
  constructor(
    private gamesRepository: GamesRepository,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Game)
    private gameRepository: Repository<Game>,
  ) {}

  async createGame(createGameDto: CreateGameDto): Promise<Game> {
    const existingGame = await this.gamesRepository.findByName(
      createGameDto.name,
    );
    if (existingGame) {
      throw new ConflictException('Game already exists');
    }

    return this.gamesRepository.create(createGameDto);
  }

  async getAllGames(): Promise<Game[]> {
    return this.gamesRepository.findAll();
  }

  async getGameById(id: string): Promise<Game> {
    const game = await this.gamesRepository.findById(id);
    if (!game) {
      throw new NotFoundException('Game not found');
    }
    return game;
  }

  async addFavorite(favoriteGameDto: FavoriteGameDto): Promise<User> {
    const user = await this.usersRepository.findOne({
      where: { id: favoriteGameDto.userId },
      relations: ['games'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const game = await this.gamesRepository.findById(favoriteGameDto.gameId);
    if (!game) {
      throw new NotFoundException('Game not found');
    }

    const isFavorite = user.games.some((g) => g.id === favoriteGameDto.gameId);
    if (isFavorite) {
      throw new BadRequestException('Game is already in favorites');
    }

    user.games.push(game);
    return this.usersRepository.save(user);
  }

  async removeFavorite(userId: string, gameId: string): Promise<User> {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
      relations: ['games'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const game = await this.gamesRepository.findById(gameId);
    if (!game) {
      throw new NotFoundException('Game not found');
    }

    user.games = user.games.filter((g) => g.id !== gameId);
    return this.usersRepository.save(user);
  }

  async getUserFavorites(userId: string): Promise<Game[]> {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
      relations: ['games'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user.games;
  }
}
