import { Injectable } from '@nestjs/common';
import { Repository, Raw } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '../entities/user.entity';

@Injectable()
export class UsersRepository {
  constructor(
    @InjectRepository(User)
    private repository: Repository<User>,
  ) {}

  async findById(id: string): Promise<User | null> {
    return this.repository.findOne({ where: { id } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.repository.findOne({ where: { email } });
  }

  async findByNick(nick: string): Promise<User | null> {
    return this.repository.findOne({
      where: {
        nick: Raw((alias) => `LOWER(${alias}) = LOWER(:nick)`, { nick }),
      },
    });
  }

  async findAll(): Promise<User[]> {
    return this.repository.find();
  }

  async create(userData: Partial<User>): Promise<User> {
    const user = this.repository.create(userData);
    return this.repository.save(user);
  }

  async update(id: string, updateData: Partial<User>): Promise<User | null> {
    await this.repository.update(id, updateData);
    return this.findById(id);
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }

  async findWithGames(id: string): Promise<User | null> {
    return this.repository.findOne({
      where: { id },
      relations: ['games'],
    });
  }

  async findWithPayments(id: string): Promise<User | null> {
    return this.repository.findOne({
      where: { id },
      relations: ['payments'],
    });
  }
}
