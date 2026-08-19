import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { BingoService } from './bingo.service';
import { BingoConnectionRegistry } from './ws/bingo-connection.registry';
import { CreatePlayerDto } from './dtos/create-player.dto';
import { CreateRoomDto } from './dtos/create-room.dto';
import { CreateGameDto } from './dtos/create-game.dto';
import { CreateCardDto } from './dtos/create-card.dto';
import { UpdateCardMarksDto } from './dtos/update-card-marks.dto';

@Controller('bingo')
export class BingoController {
  constructor(
    private readonly bingoService: BingoService,
    private readonly registry: BingoConnectionRegistry,
  ) {}

  @Post('players')
  createPlayer(@Body() dto: CreatePlayerDto) {
    return this.bingoService.createPlayer(dto);
  }

  @Get('players/:id')
  getPlayer(@Param('id') id: string) {
    return this.bingoService.getPlayer(id);
  }

  /** Pending (unredeemed) gifted-card credits for this player, grouped by price tier - ej.
   *  [{ betAmount: 250000, count: 3 }] - so the client can show "tenés 3 cartones gratis" on
   *  whichever room matches that betAmount. */
  @Get('players/:id/gifted-credits')
  getPendingGiftedCredits(@Param('id') id: string) {
    return this.bingoService.getPendingGiftedCreditsSummary(id);
  }

  @Patch('players/:id')
  updatePlayer(@Param('id') id: string, @Body() body: Record<string, any>) {
    return this.bingoService.updatePlayer(id, body);
  }

  @Get('rooms')
  async getRooms() {
    await this.bingoService.ensureDefaultRooms();
    const rooms = await this.bingoService.getRooms();
    // connectedCount: live WebSocket presence (see BingoConnectionRegistry), not "who bought
    // cards" - lets the lobby show "24/100" per room before anyone has even joined a game.
    return rooms.map((room) => ({
      ...room,
      connectedCount: this.registry.getRoomConnectionCount(room.id),
    }));
  }

  @Post('rooms')
  createRoom(@Body() dto: CreateRoomDto) {
    return this.bingoService.createRoom(dto);
  }

  /** The main-menu chat/presence panel connects here (not a real bingo room, no games run in it).
   *  Must stay registered before 'rooms/:id' below, or that route would swallow 'lobby' as an id.
   *  `key`/`name` let OTHER games get their own isolated chat/presence channel the same way (ej.
   *  Minas calls `?key=minas&name=Minas`) - omitted, this is byte-for-byte the original Bingo
   *  lobby lookup. */
  @Get('rooms/lobby')
  async getLobbyRoom(@Query('key') key?: string, @Query('name') name?: string) {
    const room = await this.bingoService.ensureLobbyRoom(key || 'bingo', name);
    return { id: room.id, name: room.name };
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

  @Get('rooms/:id/state')
  getRoomState(@Param('id') id: string) {
    return this.bingoService.getRoomState(id);
  }

  @Post('rooms/:id/next-round')
  prepareNextRound(@Param('id') roomId: string) {
    return this.bingoService.prepareNextRound(roomId);
  }

  @Post('rooms/:id/refresh-next-game')
  refreshNextGame(@Param('id') roomId: string) {
    return this.bingoService.refreshNextGame(roomId);
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
