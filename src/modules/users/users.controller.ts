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
  ParseUUIDPipe,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dtos/create-user.dto';
import { UpdateUserDto } from './dtos/update-user.dto';
import { ManageUserDto } from './dtos/manage-user.dto';
import { AdminUserDto } from './dtos/admin-user.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new user' })
  @ApiResponse({ status: 201, description: 'User created successfully' })
  @ApiResponse({ status: 409, description: 'Email or nick already exists' })
  async createUser(@Body() createUserDto: CreateUserDto) {
    return this.usersService.createUser(createUserDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all users' })
  @ApiResponse({ status: 200, description: 'Users retrieved successfully' })
  async getAllUsers() {
    return this.usersService.getAllUsers();
  }

  @Get('by-id/:id')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiParam({ name: 'id', description: 'User UUID' })
  @ApiResponse({ status: 200, description: 'User retrieved successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUserById(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.usersService.getUserById(id);
  }

  @Get('by-email')
  @ApiOperation({ summary: 'Get user by email' })
  @ApiQuery({ name: 'email', description: 'User email' })
  @ApiResponse({ status: 200, description: 'User retrieved successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUserByEmail(@Query('email') email: string) {
    return this.usersService.getUserByEmail(email);
  }

  @Get('by-nick/:nick')
  @ApiOperation({ summary: 'Get user by nick' })
  @ApiParam({ name: 'nick', description: 'User nickname' })
  @ApiResponse({ status: 200, description: 'User retrieved successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUserByNick(@Param('nick') nick: string) {
    return this.usersService.getUserByNick(nick);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update user' })
  @ApiParam({ name: 'id', description: 'User UUID' })
  @ApiResponse({ status: 200, description: 'User updated successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async updateUser(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.usersService.updateUser(id, updateUserDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete user (Admin only)' })
  @ApiParam({ name: 'id', description: 'User UUID' })
  @ApiResponse({ status: 200, description: 'User deleted successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async deleteUser(@Param('id', new ParseUUIDPipe()) id: string) {
    await this.usersService.deleteUser(id);
    return { message: 'User deleted successfully' };
  }

  @Put('ban')
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

  @Put('inactive')
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

  @Put('first-chips/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Give first chips to user' })
  @ApiParam({ name: 'id', description: 'User UUID' })
  @ApiResponse({ status: 200, description: 'First chips given' })
  @ApiResponse({ status: 400, description: 'User already received first chips' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async giveFirstChips(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.usersService.giveFirstChips(id);
  }
}
