import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { BingoService } from './bingo.service';
import { CreatePlayerDto } from './dtos/create-player.dto';
import { CreateRoomDto } from './dtos/create-room.dto';
import { CreateGameDto } from './dtos/create-game.dto';
import { CreateCardDto } from './dtos/create-card.dto';
import { UpdateCardMarksDto } from './dtos/update-card-marks.dto';
import { InitializeGameDto } from './dtos/initialize-game.dto';

@Controller('bingo')
export class BingoController {
  constructor(private readonly bingoService: BingoService) {}

  @Post('players')
  createPlayer(@Body() dto: CreatePlayerDto) {
    return this.bingoService.createPlayer(dto);
  }

  @Get('players/:id')
  getPlayer(@Param('id') id: string) {
    return this.bingoService.getPlayer(id);
  }

  @Patch('players/:id')
  updatePlayer(@Param('id') id: string, @Body() body: Record<string, any>) {
    return this.bingoService.updatePlayer(id, body);
  }

  @Get('rooms')
  async getRooms() {
    await this.bingoService.ensureDefaultRooms();
    return this.bingoService.getRooms();
  }

  @Post('rooms')
  createRoom(@Body() dto: CreateRoomDto) {
    return this.bingoService.createRoom(dto);
  }

  @Get('rooms/:id')
  getRoom(@Param('id') id: string) {
    return this.bingoService.getRoom(id);
  }

  @Get('rooms/:id/current-game')
  getRoomCurrentGame(@Param('id') id: string) {
    // returns the current waiting or running game for the room
    return this.bingoService.getRoomCurrentGame(id);
  }

  @Post('rooms/:id/games')
  createGame(@Param('id') roomId: string, @Body() dto: CreateGameDto) {
    return this.bingoService.createGame({ ...dto, roomId });
  }

  @Get('games/:id')
  getGame(@Param('id') id: string) {
    return this.bingoService.getGame(id);
  }

  @Get('games/:id/state')
  getGameState(@Param('id') id: string, @Query('playerId') playerId?: string) {
    return this.bingoService.getGameState(id, playerId);
  }

  @Get('games/:id/player/:playerId')
  getPlayerGameInfo(@Param('id') gameId: string, @Param('playerId') playerId: string) {
    return this.bingoService.getPlayerGameInfo(gameId, playerId);
  }

  @Get('players/username/:username')
  getPlayerByUsername(@Param('username') username: string) {
    return this.bingoService.getPlayerByUsername(username);
  }

  @Post('games/:id/player/:playerId/card')
  purchaseCard(
    @Param('id') gameId: string,
    @Param('playerId') playerId: string,
    @Body() dto: CreateCardDto,
  ) {
    return this.bingoService.purchaseCard(gameId, playerId, dto);
  }

  @Patch('games/:id/cards/:cardId/marks')
  updateCardMarks(
    @Param('id') gameId: string,
    @Param('cardId') cardId: string,
    @Body() dto: UpdateCardMarksDto,
  ) {
    return this.bingoService.updateCardMarks(gameId, cardId, dto);
  }

  @Post('games/:id/join')
  joinGame(@Param('id') gameId: string, @Query('playerId') playerId: string) {
    return this.bingoService.joinGame(gameId, playerId);
  }

  @Post('games/:id/start')
  startGame(@Param('id') gameId: string) {
    return this.bingoService.startGame(gameId);
  }

  @Post('games/:id/initialize')
  initializeGame(@Param('id') gameId: string, @Body() dto: InitializeGameDto) {
    return this.bingoService.initializeGame(gameId, dto);
  }

  @Post('games/:id/draw')
  drawNumber(@Param('id') gameId: string) {
    return this.bingoService.drawNumber(gameId);
  }

  @Post('games/:id/claim')
  claimWin(@Param('id') gameId: string, @Body() body: { cardId: string; claimType: string }) {
    return this.bingoService.claimWin(gameId, body.cardId, body.claimType);
  }

  @Get('games/:id/history')
  getGameHistory(@Param('id') id: string) {
    return this.bingoService.getGameHistory(id);
  }

  @Post('superbingo/topup')
  topupSuperbingo(@Body() body: { amount: number; roomId?: string }) {
    return this.bingoService.topupSuperbingo(body.amount, body.roomId);
  }

  @Get('superbingo')
  getSuperbingo() {
    return this.bingoService.getSuperbingo();
  }

  @Get('superbingo/room/:roomId')
  getSuperbingoForRoom(@Param('roomId') roomId: string) {
    return this.bingoService.getSuperbingoForRoom(roomId);
  }
}
