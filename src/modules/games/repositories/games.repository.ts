import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Game } from '../entities/game.entity';

@Injectable()
export class GamesRepository {
  constructor(
    @InjectRepository(Game)
    private repository: Repository<Game>,
  ) {}

  async findById(id: string): Promise<Game | null> {
    return this.repository.findOne({ where: { id } });
  }

  async findByName(name: string): Promise<Game | null> {
    return this.repository.findOne({ where: { name } });
  }

  async findAll(): Promise<Game[]> {
    return this.repository.find();
  }

  async create(gameData: Partial<Game>): Promise<Game> {
    const game = this.repository.create(gameData);
    return this.repository.save(game);
  }

  async update(id: string, updateData: Partial<Game>): Promise<Game | null> {
    await this.repository.update(id, updateData);
    return this.findById(id);
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }

  async findWithUsers(id: string): Promise<Game | null> {
    return this.repository.findOne({
      where: { id },
      relations: ['users'],
    });
  }
}
