import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { EntityManager, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { CreateUserDto } from './dtos/create-user.dto';
import { UpdateUserDto } from './dtos/update-user.dto';
import { UpdateAvatarDto } from './dtos/update-avatar.dto';
import { ManageUserDto } from './dtos/manage-user.dto';
import { AdminUserDto } from './dtos/admin-user.dto';
import { UsersRepository } from './repositories/users.repository';
import { PasswordUtils } from '../../common/utils/password.utils';
import { User } from './entities/user.entity';
import { Role } from '../../common/enums/role.enum';
import { RankTier } from '../../common/enums/rank-tier.enum';
import { ChipsAward } from '../chips/entities/chips-award.entity';
import { DEFAULT_AVATAR_BUFFER, DEFAULT_AVATAR_MIME, DEFAULT_AVATAR_DATA } from '../../common/constants/default-avatar';
import * as crypto from 'crypto';

const REFERRAL_SIGNUP_BONUS = 1000000;

@Injectable()
export class UsersService {
  constructor(
    private usersRepository: UsersRepository,
    @InjectRepository(ChipsAward)
    private chipsAwardRepository: Repository<ChipsAward>,
  ) {}

  private async logWelcomeBonus(userId: string, amount: number): Promise<void> {
    await this.chipsAwardRepository.save(
      this.chipsAwardRepository.create({ userId, amount, source: 'welcome' }),
    );
  }

  private async generateUniqueReferralCode(): Promise<string> {
    let code: string;
    let existing: User | null;
    do {
      code = crypto.randomBytes(4).toString('hex').toUpperCase();
      existing = await this.usersRepository.findByReferralCode(code);
    } while (existing);
    return code;
  }

  async createUser(createUserDto: CreateUserDto): Promise<Partial<User> & { firstChipsReceived: boolean }> {
    const { referredByCode, ...userData } = createUserDto;

    const emailLowerCase = createUserDto.email.toLowerCase();
    const existingEmail = await this.usersRepository.findByEmail(
      emailLowerCase,
    );
    if (existingEmail) {
      throw new ConflictException('Email already exists');
    }

    const existingNick = await this.usersRepository.findByNick(
      createUserDto.nick,
    );
    if (existingNick) {
      throw new ConflictException('Nick already exists');
    }

    const hashedPassword = await PasswordUtils.hashPassword(
      createUserDto.password,
    );

    const referralCode = await this.generateUniqueReferralCode();

    // Invalid/unknown codes are ignored rather than rejected — a typo in a friend's code
    // shouldn't block someone from signing up.
    let referredBy: string | null = null;
    if (referredByCode) {
      const referrer = await this.usersRepository.findByReferralCode(referredByCode.trim().toUpperCase());
      if (referrer) {
        referredBy = referrer.id;
      }
    }

    // Create user without initial chips
    const user = await this.usersRepository.create({
      ...userData,
      email: emailLowerCase,
      password: hashedPassword,
      chips: 0,
      firstChips: false,
      avatarBin: DEFAULT_AVATAR_BUFFER,
      avatarMime: DEFAULT_AVATAR_MIME,
      avatarData: DEFAULT_AVATAR_DATA,
      referralCode,
      referredBy,
    });

    // Grant first chips atomically (only for first 100 users)
    const updatedUser = await this.usersRepository.giveFirstChipsAtomic(user.id, 1000000);
    const firstChipsReceived = updatedUser !== null;
    if (firstChipsReceived) {
      await this.logWelcomeBonus(user.id, 1000000);
    }

    // Separate, uncapped bonus for signing up through a valid referral code — on top of,
    // not instead of, the first-100-users welcome bonus above.
    if (referredBy) {
      await this.usersRepository.addChipsAtomic(user.id, REFERRAL_SIGNUP_BONUS);
      await this.chipsAwardRepository.save(
        this.chipsAwardRepository.create({ userId: user.id, amount: REFERRAL_SIGNUP_BONUS, source: 'referral' }),
      );
    }

    // Fetch updated user with chips
    const userToReturn = await this.usersRepository.findById(user.id);
    if (!userToReturn) {
      throw new NotFoundException('User not found');
    }
    const { password, ...userWithoutPassword } = userToReturn;
    return { ...userWithoutPassword, firstChipsReceived };
  }

  async updateUser(id: string, updateUserDto: UpdateUserDto): Promise<Partial<User>> {
    const user = await this.usersRepository.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (updateUserDto.email && updateUserDto.email.toLowerCase() !== user.email) {
      const emailLowerCase = updateUserDto.email.toLowerCase();
      const existingEmail = await this.usersRepository.findByEmail(
        emailLowerCase,
      );
      if (existingEmail) {
        throw new ConflictException('Email already exists');
      }
      updateUserDto.email = emailLowerCase;
    }

    if (updateUserDto.nick && updateUserDto.nick.toLowerCase() !== user.nick.toLowerCase()) {
      const existingNick = await this.usersRepository.findByNick(
        updateUserDto.nick,
      );
      if (existingNick) {
        throw new ConflictException('Nick already exists');
      }
    }

    // Password changes must go through changePassword() (current-password check + hashing).
    // Silently dropping it here — instead of trusting the DTO — is what stops a raw, unhashed
    // password from ever reaching this generic profile-update path. referredByCode is a
    // signup-only field with no matching column, dropped here too so it can never leak into
    // an UPDATE statement.
    const { password: _ignoredPassword, referredByCode: _ignoredReferredByCode, ...safeUpdateDto } = updateUserDto as any;

    const updatedUser = await this.usersRepository.update(id, safeUpdateDto);
    if (!updatedUser) {
      throw new NotFoundException('User not found');
    }
    const { password, ...userWithoutPassword } = updatedUser;
    return userWithoutPassword;
  }

  async changePassword(id: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await this.usersRepository.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (!user.password) {
      throw new BadRequestException('Esta cuenta inició sesión con Google y no tiene contraseña propia');
    }
    const matches = await PasswordUtils.comparePasswords(currentPassword, user.password);
    if (!matches) {
      throw new BadRequestException('La contraseña actual es incorrecta');
    }
    const hashedPassword = await PasswordUtils.hashPassword(newPassword);
    await this.usersRepository.update(id, { password: hashedPassword });
  }

  async deleteUser(id: string): Promise<void> {
    const user = await this.usersRepository.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    await this.usersRepository.delete(id);
  }

  async getUserById(id: string): Promise<Partial<User>> {
    const user = await this.usersRepository.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async getUserByEmail(email: string): Promise<Partial<User>> {
    const emailLowerCase = email.toLowerCase();
    const user = await this.usersRepository.findByEmail(emailLowerCase);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async getUserByNick(nick: string): Promise<Partial<User>> {
    const user = await this.usersRepository.findByNick(nick);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  /**
   * Booleans-only lookup used by the signup form to check availability before the user
   * has a session. Deliberately never returns user data (unlike getUserByEmail, which is
   * kept behind JwtAuthGuard) so it can be public without exposing account details.
   */
  async checkAvailability(
    nick?: string,
    email?: string,
  ): Promise<{ nickTaken?: boolean; emailTaken?: boolean }> {
    const result: { nickTaken?: boolean; emailTaken?: boolean } = {};
    if (nick) {
      const existingNick = await this.usersRepository.findByNick(nick);
      result.nickTaken = !!existingNick;
    }
    if (email) {
      const existingEmail = await this.usersRepository.findByEmail(email.toLowerCase());
      result.emailTaken = !!existingEmail;
    }
    return result;
  }

  async getAllUsers(): Promise<Partial<User>[]> {
    const users = await this.usersRepository.findAll();
    return users.map(({ password, ...userWithoutPassword }) => userWithoutPassword);
  }

  async getUsersCount(): Promise<{ count: number }> {
    const count = await this.usersRepository.count();
    return { count };
  }

  async updateLastSeen(userId: string, currentActivity?: string | null): Promise<void> {
    await this.usersRepository.updateLastSeen(userId, currentActivity);
  }

  async getOnlineUsers(limit = 20) {
    return this.usersRepository.findOnline(limit);
  }

  async banUser(manageUserDto: ManageUserDto): Promise<Partial<User>> {
    const user = await this.usersRepository.findById(manageUserDto.userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const updatedUser = await this.usersRepository.update(
      manageUserDto.userId,
      { banned: manageUserDto.status },
    );
    if (!updatedUser) {
      throw new NotFoundException('User not found');
    }
    const { password, ...userWithoutPassword } = updatedUser;
    return userWithoutPassword;
  }

  async inactiveUser(manageUserDto: ManageUserDto): Promise<Partial<User>> {
    const user = await this.usersRepository.findById(manageUserDto.userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const updatedUser = await this.usersRepository.update(
      manageUserDto.userId,
      { inactive: manageUserDto.status },
    );
    if (!updatedUser) {
      throw new NotFoundException('User not found');
    }
    const { password, ...userWithoutPassword } = updatedUser;
    return userWithoutPassword;
  }

  async setUserAdmin(adminUserDto: AdminUserDto): Promise<Partial<User>> {
    const user = await this.usersRepository.findById(adminUserDto.userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const updatedUser = await this.usersRepository.update(
      adminUserDto.userId,
      { role: adminUserDto.role },
    );
    if (!updatedUser) {
      throw new NotFoundException('User not found');
    }
    const { password, ...userWithoutPassword } = updatedUser;
    return userWithoutPassword;
  }

  async giveFirstChips(userId: string): Promise<Partial<User>> {
    const user = await this.usersRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const FIRST_CHIPS_AMOUNT = 1000000;
    const updatedUser = await this.usersRepository.giveFirstChipsAtomic(
      userId,
      FIRST_CHIPS_AMOUNT,
    );

    if (!updatedUser) {
      // If the user exists but no row was updated, they already received first chips
      throw new BadRequestException('User already received first chips');
    }

    await this.logWelcomeBonus(userId, FIRST_CHIPS_AMOUNT);

    const { password, ...userWithoutPassword } = updatedUser;
    return userWithoutPassword;
  }


  async updateAvatarWithFile(userId: string, file: Express.Multer.File, avatarData?: any): Promise<Partial<User>> {
    const user = await this.usersRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const buffer = file && file.buffer ? file.buffer : undefined;
    const mime = file && file.mimetype ? file.mimetype : undefined;

    console.log('Saving avatar for user', {
      userId,
      hasFile: !!file,
      fileInfo: file ? { originalname: file.originalname, mimetype: file.mimetype, size: file.size } : null,
      avatarData,
    });

    const updatedUser = await this.usersRepository.updateAvatar(userId, buffer, mime, avatarData);
    if (!updatedUser) {
      throw new NotFoundException('User not found');
    }

    const { password, ...userWithoutPassword } = updatedUser;
    return userWithoutPassword;
  }

  async getAvatarData(userId: string): Promise<any> {
    const user = await this.usersRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user.avatarData || {};
  }

  

  async getAvatarBinary(userId: string): Promise<{ buffer?: Buffer; mime?: string } | null> {
    const user = await this.usersRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return { buffer: user.avatarBin, mime: user.avatarMime };
  }

  // Deposited-chips thresholds for each rank. 1000 chips = $1 USD is the fixed rate used
  // across the whole app (see BuyChips.jsx), so chips deposited is a currency-agnostic
  // stand-in for real money loaded, without needing to store/convert per-payment currency.
  private static readonly RANK_THRESHOLDS: [RankTier, number][] = [
    [RankTier.DIAMOND, 50000],
    [RankTier.PLATINUM, 10000],
    [RankTier.GOLD, 5000],
    [RankTier.SILVER, 1000],
    [RankTier.BRONZE, 0],
  ];

  private computeRank(totalChipsDeposited: number): RankTier {
    const found = UsersService.RANK_THRESHOLDS.find(([, min]) => totalChipsDeposited >= min);
    return found ? found[0] : RankTier.BRONZE;
  }

  /**
   * Increments the user's lifetime deposited-chips counter and recomputes their rank.
   * Must run inside the same transaction/manager that approves the deposit, so chips
   * balance and rank progression can never drift apart.
   */
  async registerDeposit(userId: string, chipsAmount: number, manager: EntityManager): Promise<void> {
    const updateResult = await manager.query(
      `UPDATE users SET "totalChipsDeposited" = "totalChipsDeposited" + $1 WHERE id = $2 RETURNING "totalChipsDeposited"`,
      [chipsAmount, userId],
    );

    let row: any = null;
    if (Array.isArray(updateResult)) {
      if (Array.isArray(updateResult[0]) && updateResult[0].length > 0) {
        row = updateResult[0][0];
      } else if (updateResult.length > 0 && typeof updateResult[0] === 'object') {
        row = updateResult[0];
      }
    }
    if (!row) {
      return;
    }

    const newTotal = Number(row.totalChipsDeposited ?? 0);
    const newRank = this.computeRank(newTotal);
    await manager.query(`UPDATE users SET rank = $1 WHERE id = $2`, [newRank, userId]);
  }
}
