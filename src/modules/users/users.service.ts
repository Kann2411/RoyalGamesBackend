import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { CreateUserDto } from './dtos/create-user.dto';
import { UpdateUserDto } from './dtos/update-user.dto';
import { ManageUserDto } from './dtos/manage-user.dto';
import { AdminUserDto } from './dtos/admin-user.dto';
import { UsersRepository } from './repositories/users.repository';
import { PasswordUtils } from '../../common/utils/password.utils';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(private usersRepository: UsersRepository) {}

  async createUser(createUserDto: CreateUserDto): Promise<Partial<User>> {
    const existingEmail = await this.usersRepository.findByEmail(
      createUserDto.email,
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

    const user = await this.usersRepository.create({
      ...createUserDto,
      password: hashedPassword,
      chips: 0,
      firstChips: false,
    });

    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async updateUser(id: string, updateUserDto: UpdateUserDto): Promise<Partial<User>> {
    const user = await this.usersRepository.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const existingEmail = await this.usersRepository.findByEmail(
        updateUserDto.email,
      );
      if (existingEmail) {
        throw new ConflictException('Email already exists');
      }
    }

    if (updateUserDto.nick && updateUserDto.nick !== user.nick) {
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
    const user = await this.usersRepository.findByEmail(email);
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
      { admin: adminUserDto.admin },
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

    if (user.firstChips) {
      throw new BadRequestException('User already received first chips');
    }

    const updatedUser = await this.usersRepository.update(userId, {
      chips: (user.chips || 0) + 100,
      firstChips: true,
    });
    if (!updatedUser) {
      throw new NotFoundException('User not found');
    }
    const { password, ...userWithoutPassword } = updatedUser;
    return userWithoutPassword;
  }
}
