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

  async count(): Promise<number> {
    return this.repository.count();
  }

  async updateLastSeen(id: string, currentActivity?: string | null): Promise<void> {
    await this.repository.query(
      `UPDATE users SET "lastSeen" = now(), "currentActivity" = $2 WHERE id = $1`,
      [id, currentActivity ?? null],
    );
  }

  /** Users active in the last 5 minutes, most recent first. */
  async findOnline(limit = 20): Promise<Array<Pick<User, 'id' | 'nick' | 'rank' | 'currentActivity'>>> {
    return this.repository.query(
      `SELECT id, nick, rank, "currentActivity"
       FROM users
       WHERE "lastSeen" > now() - interval '5 minutes'
       ORDER BY "lastSeen" DESC
       LIMIT $1`,
      [limit],
    );
  }

  async create(userData: Partial<User>): Promise<User> {
    const user = this.repository.create(userData);
    return this.repository.save(user);
  }

  async update(id: string, updateData: Partial<User>): Promise<User | null> {
    await this.repository.update(id, updateData);
    return this.findById(id);
  }

  async updateAvatar(id: string, buffer?: Buffer, mime?: string, avatarData?: any): Promise<User | null> {
    const user = await this.findById(id);
    if (!user) return null;
    if (buffer !== undefined) user.avatarBin = buffer;
    if (mime !== undefined) user.avatarMime = mime;
    if (avatarData !== undefined) user.avatarData = avatarData;
    console.log('Repository updateAvatar', { id, hasBuffer: !!buffer, mime, hasAvatarData: avatarData !== undefined });
    return this.repository.save(user);
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

  /**
   * Atomically grants first chips only if:
   * 1. The user hasn't received them yet
   * 2. Less than 100 users have received first chips
   * Returns the updated user or null if the row wasn't updated.
   */
  async giveFirstChipsAtomic(userId: string, amount: number): Promise<User | null> {
    const result = await this.repository.query(
      `UPDATE users SET chips = chips + $1, "firstChips" = true 
       WHERE id = $2 
       AND ("firstChips" = false OR "firstChips" IS NULL) 
       AND (SELECT COUNT(*) FROM users WHERE "firstChips" = true) < 100 
       RETURNING *`,
      [amount, userId],
    );
    
    let row: any = null;
    if (Array.isArray(result)) {
      if (Array.isArray(result[0]) && result[0].length > 0) {
        row = result[0][0];
      } else if (result.length > 0 && typeof result[0] === 'object' && !Array.isArray(result[0]) && Object.keys(result[0]).length > 0) {
        row = result[0];
      }
    }
    return (row && row.id) ? (row as User) : null;
  }

}
