import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { GamesService } from './games.service';
import { CreateGameDto } from './dtos/create-game.dto';
import { FavoriteGameDto } from './dtos/favorite-game.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';

@ApiTags('Games')
@Controller()
export class GamesController {
  constructor(private gamesService: GamesService) {}

  @Post('game/create')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MOD)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new game (Admin only)' })
  @ApiResponse({ status: 201, description: 'Game created successfully' })
  @ApiResponse({ status: 409, description: 'Game already exists' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async createGame(@Body() createGameDto: CreateGameDto) {
    return this.gamesService.createGame(createGameDto);
  }

  @Get('games')
  @ApiOperation({ summary: 'Get all games' })
  @ApiResponse({ status: 200, description: 'Games retrieved successfully' })
  async getAllGames() {
    return this.gamesService.getAllGames();
  }

  @Get('game/:id')
  @ApiOperation({ summary: 'Get game by ID' })
  @ApiParam({ name: 'id', description: 'Game UUID' })
  @ApiResponse({ status: 200, description: 'Game retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Game not found' })
  async getGameById(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.gamesService.getGameById(id);
  }

  @Get('favorites/:userId')
  @ApiOperation({ summary: 'Get user favorite games' })
  @ApiParam({ name: 'userId', description: 'User UUID' })
  @ApiResponse({ status: 200, description: 'Favorites retrieved successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUserFavorites(
    @Param('userId', new ParseUUIDPipe()) userId: string,
  ) {
    return this.gamesService.getUserFavorites(userId);
  }

  @Post('favorites')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add game to favorites' })
  @ApiResponse({ status: 201, description: 'Game added to favorites' })
  @ApiResponse({ status: 404, description: 'User or game not found' })
  @ApiResponse({ status: 400, description: 'Game already in favorites' })
  async addFavorite(@Body() favoriteGameDto: FavoriteGameDto) {
    return this.gamesService.addFavorite(favoriteGameDto);
  }

  @Delete('favorites/:userId/:gameId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove game from favorites' })
  @ApiParam({ name: 'userId', description: 'User UUID' })
  @ApiParam({ name: 'gameId', description: 'Game UUID' })
  @ApiResponse({ status: 200, description: 'Game removed from favorites' })
  @ApiResponse({ status: 404, description: 'User or game not found' })
  async removeFavorite(
    @Param('userId', new ParseUUIDPipe()) userId: string,
    @Param('gameId', new ParseUUIDPipe()) gameId: string,
  ) {
    return this.gamesService.removeFavorite(userId, gameId);
  }
}
