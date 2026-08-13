import {
  Controller,
  Get,
  Post,
  Patch,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  ParseUUIDPipe,
  HttpStatus,
  HttpCode,
  ForbiddenException,
  UploadedFile,
  Res,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { Response } from 'express';
import { UsersService } from './users.service';
import { UpdateAvatarDto } from './dtos/update-avatar.dto';
import { CreateUserDto } from './dtos/create-user.dto';
import { UpdateUserDto } from './dtos/update-user.dto';
import { ManageUserDto } from './dtos/manage-user.dto';
import { AdminUserDto } from './dtos/admin-user.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '../../common/enums/role.enum';

@ApiTags('Users')
@Controller()
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Post('signup')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new user' })
  @ApiResponse({ status: 201, description: 'User created successfully' })
  @ApiResponse({ status: 409, description: 'Email or nick already exists' })
  async createUser(@Body() createUserDto: CreateUserDto) {
    console.log(createUserDto);
    return this.usersService.createUser(createUserDto);
  }

  @Get('getUsers')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all users (Admin only)' })
  @ApiResponse({ status: 200, description: 'Users retrieved successfully' })
  async getAllUsers() {
    return this.usersService.getAllUsers();
  }

  @Get('users/count')
  @ApiOperation({ summary: 'Get total registered user count (public)' })
  @ApiResponse({ status: 200, description: 'Count retrieved successfully' })
  async getUsersCount() {
    return this.usersService.getUsersCount();
  }

  @Put('users/heartbeat')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark the current user as recently active' })
  async heartbeat(@CurrentUser() user: any) {
    await this.usersService.updateLastSeen(user.id);
    return { ok: true };
  }

  @Get('user/:id')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiParam({ name: 'id', description: 'User UUID' })
  @ApiResponse({ status: 200, description: 'User retrieved successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUserById(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.usersService.getUserById(id);
  }

  @Get('user-email')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user by email' })
  @ApiQuery({ name: 'email', description: 'User email' })
  @ApiResponse({ status: 200, description: 'User retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Invalid or expired token' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUserByEmail(@Query('email') email: string) {
    return this.usersService.getUserByEmail(email);
  }

  @Get('user-nick')
  @ApiOperation({ summary: 'Get user by nick' })
  @ApiQuery({ name: 'nick', description: 'User nickname' })
  @ApiResponse({ status: 200, description: 'User retrieved successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUserByNick(@Query('nick') nick: string) {
    return this.usersService.getUserByNick(nick);
  }

  @Patch('actualizar-usuario/:userId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update user' })
  @ApiParam({ name: 'userId', description: 'User UUID' })
  @ApiResponse({ status: 200, description: 'User updated successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Cannot update another user profile' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async updateUser(
    @Param('userId', new ParseUUIDPipe()) userId: string,
    @Body() updateUserDto: UpdateUserDto,
    @CurrentUser() user: any,
  ) {
    // Verify user can only update their own profile
    if (user.id !== userId) {
      throw new ForbiddenException('Cannot update another user profile');
    }
    console.log(updateUserDto);
    return this.usersService.updateUser(userId, updateUserDto);
  }

  @Delete('user-delete/:userId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete user (Admin only)' })
  @ApiParam({ name: 'userId', description: 'User UUID' })
  @ApiResponse({ status: 200, description: 'User deleted successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async deleteUser(@Param('userId', new ParseUUIDPipe()) userId: string) {
    await this.usersService.deleteUser(userId);
    return { message: 'User deleted successfully' };
  }

  @Put('user-ban')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Ban/Unban user (Admin only)' })
  @ApiResponse({ status: 200, description: 'User ban status updated' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async banUser(@Body() manageUserDto: ManageUserDto) {
    return this.usersService.banUser(manageUserDto);
  }

  @Put('inactivar-user')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Inactivate/Activate user (Admin only)' })
  @ApiResponse({ status: 200, description: 'User inactive status updated' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async inactiveUser(@Body() manageUserDto: ManageUserDto) {
    return this.usersService.inactiveUser(manageUserDto);
  }

  @Put('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Set user admin status (Admin only)' })
  @ApiResponse({ status: 200, description: 'User admin status updated' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async setUserAdmin(@Body() adminUserDto: AdminUserDto) {
    return this.usersService.setUserAdmin(adminUserDto);
  }

  @Put('firstchips/:userId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Give first chips to user' })
  @ApiParam({ name: 'userId', description: 'User UUID' })
  @ApiResponse({ status: 200, description: 'First chips given' })
  @ApiResponse({ status: 400, description: 'User already received first chips' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async giveFirstChips(@Param('userId', new ParseUUIDPipe()) userId: string) {
    return this.usersService.giveFirstChips(userId);
  }

  @Put('user/:userId/avatar')
  @UseInterceptors(FileInterceptor('avatar', { storage: memoryStorage() }))
  @ApiOperation({ summary: 'Update user avatar image (multipart) and avatar JSON data' })
  @ApiParam({ name: 'userId', description: 'User UUID' })
  @ApiResponse({ status: 200, description: 'Avatar updated successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Cannot update another user profile' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async updateAvatar(
    @Param('userId', new ParseUUIDPipe()) userId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: any,
  ) {
    const avatarDataRaw = body?.avatarData;
    let avatarData: any = undefined;

    if (avatarDataRaw !== undefined) {
      if (typeof avatarDataRaw === 'string') {
        try {
          avatarData = JSON.parse(avatarDataRaw);
        } catch (e) {
          console.warn('Could not parse avatarData JSON string:', avatarDataRaw);
          avatarData = avatarDataRaw;
        }
      } else {
        avatarData = avatarDataRaw;
      }
    }

    console.log('updateAvatar request', {
      userId,
      file: file ? { originalname: file.originalname, mimetype: file.mimetype, size: file.size } : null,
      avatarData,
    });

    return this.usersService.updateAvatarWithFile(userId, file, avatarData);
  }

  @Get('user/:userId/avatar-data')
  @ApiOperation({ summary: 'Get user avatar JSON data' })
  @ApiParam({ name: 'userId', description: 'User UUID' })
  @ApiResponse({ status: 200, description: 'Avatar JSON retrieved' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getAvatarData(@Param('userId', new ParseUUIDPipe()) userId: string) {
    return this.usersService.getAvatarData(userId);
  }

  @Get('user/:userId/avatar-image')
  @ApiOperation({ summary: 'Get user avatar image bytes' })
  @ApiParam({ name: 'userId', description: 'User UUID' })
  @ApiResponse({ status: 200, description: 'Avatar image retrieved' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getAvatarImage(
    @Param('userId', new ParseUUIDPipe()) userId: string,
    @Res() res: Response,
  ) {
    const result = await this.usersService.getAvatarBinary(userId);
    if (!result || !result.buffer) {
      throw new ForbiddenException('User or avatar not found');
    }
    res.setHeader('Content-Type', result.mime || 'application/octet-stream');
    return res.send(result.buffer);
  }
}
