import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { CreateUserDto } from './dtos/create-user.dto';
import { UpdateUserDto } from './dtos/update-user.dto';
import { UpdateAvatarDto } from './dtos/update-avatar.dto';
import { ManageUserDto } from './dtos/manage-user.dto';
import { AdminUserDto } from './dtos/admin-user.dto';
import { UsersRepository } from './repositories/users.repository';
import { PasswordUtils } from '../../common/utils/password.utils';
import { User } from './entities/user.entity';
import { Role } from '../../common/enums/role.enum';

@Injectable()
export class UsersService {
  constructor(private usersRepository: UsersRepository) {}

  async createUser(createUserDto: CreateUserDto): Promise<Partial<User> & { firstChipsReceived: boolean }> {
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

    // Create user without initial chips
    const user = await this.usersRepository.create({
      ...createUserDto,
      email: emailLowerCase,
      password: hashedPassword,
      chips: 0,
      firstChips: false,
    });

    // Grant first chips atomically (only for first 100 users)
    const updatedUser = await this.usersRepository.giveFirstChipsAtomic(user.id, 1000000);
    const firstChipsReceived = updatedUser !== null;

    // Fetch updated user with chips
    const userToReturn = updatedUser || await this.usersRepository.findById(user.id);
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

    const updatedUser = await this.usersRepository.update(id, updateUserDto);
    if (!updatedUser) {
      throw new NotFoundException('User not found');
    }
    const { password, ...userWithoutPassword } = updatedUser;
    return userWithoutPassword;
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

  async getAllUsers(): Promise<Partial<User>[]> {
    const users = await this.usersRepository.findAll();
    return users.map(({ password, ...userWithoutPassword }) => userWithoutPassword);
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
}
