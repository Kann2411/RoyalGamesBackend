import { Logger } from '@nestjs/common';
import { OnGatewayConnection, OnGatewayDisconnect, WebSocketGateway } from '@nestjs/websockets';
import type { IncomingMessage } from 'http';
import type WebSocket from 'ws';
import { BingoService } from './bingo.service';
import { BingoConnectionRegistry } from './ws/bingo-connection.registry';
import { isOriginAllowed } from '../../config/cors-origins';
import {
  BuyCardsMessage,
  ChatSendMessage,
  PresenceEntry,
  RoomStatePayload,
  UpdateMarksMessage,
  WsEnvelope,
} from './ws/ws-message.types';

@WebSocketGateway({ path: '/bingo/ws' })
export class BingoGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(BingoGateway.name);

  constructor(
    private readonly bingoService: BingoService,
    private readonly registry: BingoConnectionRegistry,
  ) {}

  async handleConnection(client: WebSocket, request: IncomingMessage): Promise<void> {
    try {
      if (!isOriginAllowed(request.headers.origin)) {
        client.close(4003, 'Origin not allowed');
        return;
      }

      const url = new URL(request.url ?? '', 'http://localhost');
      const roomId = url.searchParams.get('roomId');
      const playerId = url.searchParams.get('playerId');

      if (!roomId || !playerId) {
        client.close(4000, 'roomId and playerId are required');
        return;
      }

      await this.bingoService.getPlayer(playerId);
      const room = await this.bingoService.getRoom(roomId);

      this.registry.register(client, roomId, playerId);
      client.on('message', (raw: WebSocket.RawData) => this.handleMessage(client, raw));
      client.on('error', (err) => this.logger.warn(`Socket error for player ${playerId}: ${err.message}`));

      // The lobby is a chat/presence-only pseudo-room - no game ever runs in it.
      if (!room.isLobby) {
        // Someone showing up to an empty, untouched WAITING game is what starts its countdown -
        // not the first purchase. No-ops if it's already counting down or the game isn't WAITING.
        const currentGame = await this.bingoService.getRoomCurrentGame(roomId);
        await this.bingoService.ensurePurchaseWindowStarted(currentGame.id);
      }

      // Broadcasting (not just sending to the new client) is what makes the room's avatar row
      // live: everyone already in the room needs to see this new arrival too.
      await this.broadcastRoomState(roomId);
    } catch (error) {
      this.logger.warn(`Rejected connection: ${(error as Error).message}`);
      client.close(4004, 'Unable to join room');
    }
  }

  handleDisconnect(client: WebSocket): void {
    const meta = this.registry.getMeta(client);
    this.registry.unregister(client);
    if (meta) {
      this.broadcastRoomState(meta.roomId).catch((err) =>
        this.logger.warn(`Failed to broadcast presence after disconnect: ${(err as Error).message}`),
      );
    }
  }

  private async handleMessage(client: WebSocket, raw: WebSocket.RawData): Promise<void> {
    const meta = this.registry.getMeta(client);
    if (!meta) {
      return;
    }

    let envelope: WsEnvelope;
    try {
      envelope = JSON.parse(raw.toString());
    } catch {
      this.sendError(client, 'BAD_REQUEST', 'Invalid JSON');
      return;
    }

    try {
      switch (envelope.type) {
        case 'buy_cards':
          await this.handleBuyCards(client, meta.roomId, meta.playerId, envelope.payload as BuyCardsMessage);
          break;
        case 'update_marks':
          await this.handleUpdateMarks(client, meta.roomId, envelope.payload as UpdateMarksMessage);
          break;
        case 'chat_send':
          await this.handleChatSend(meta.roomId, meta.playerId, envelope.payload as ChatSendMessage);
          break;
        case 'ping':
          this.registry.sendTo(client, { type: 'pong', payload: { serverTime: new Date().toISOString() } });
          break;
        default:
          this.sendError(client, 'UNKNOWN_TYPE', `Unknown message type: ${envelope.type}`);
      }
    } catch (error) {
      const message = (error as Error).message ?? 'Unexpected error';
      const code = message === 'INSUFFICIENT_CHIPS' ? 'INSUFFICIENT_CHIPS' : 'REQUEST_FAILED';
      this.sendError(client, code, message);
    }
  }

  private async handleBuyCards(client: WebSocket, roomId: string, playerId: string, payload: BuyCardsMessage): Promise<void> {
    await this.bingoService.purchaseCard(payload.gameId, playerId, {
      playerId,
      quantity: payload.quantity,
      numbers: payload.numbers,
    });
    await this.broadcastRoomState(roomId);
  }

  private async handleUpdateMarks(client: WebSocket, roomId: string, payload: UpdateMarksMessage): Promise<void> {
    await this.bingoService.updateCardMarks(payload.gameId, payload.cardId, { marks: payload.marks });
  }

  private async handleChatSend(roomId: string, playerId: string, payload: ChatSendMessage): Promise<void> {
    const entry = await this.bingoService.sendChatMessage(roomId, playerId, payload?.message ?? '');
    this.registry.broadcastToRoom(roomId, { type: 'chat_message', payload: entry });
  }

  /** Same broadcast handleChatSend does above, but for server-originated system messages (ej. a
   *  winner announcement from BingoEngineService) instead of a message a player actually typed. */
  broadcastChatMessage(roomId: string, entry: import('./ws/ws-message.types').ChatMessageEntry): void {
    this.registry.broadcastToRoom(roomId, { type: 'chat_message', payload: entry });
  }

  async broadcastRoomState(roomId: string): Promise<void> {
    const payload = await this.buildRoomStatePayload(roomId);
    this.registry.broadcastToRoom(roomId, { type: 'room_state', payload });
  }

  /**
   * Called right after a fresh WAITING game is created for a room (typically once the previous
   * one just finished). If players stuck around through the transition instead of disconnecting,
   * there's no new "connection" event to start the next countdown - this does it instead.
   */
  async ensureTimerIfRoomOccupied(roomId: string, gameId: string): Promise<void> {
    if (this.registry.getRoomConnectionCount(roomId) > 0) {
      await this.bingoService.ensurePurchaseWindowStarted(gameId);
    }
  }

  /** Broadcast once, at the exact moment a game transitions waiting -> running, with the full plan. */
  async broadcastGameStarted(roomId: string, gameId: string): Promise<void> {
    const game = await this.bingoService.getGame(gameId);
    const snapshot = await this.bingoService.buildGameSnapshot(game);
    this.registry.broadcastToRoom(roomId, { type: 'game_started', payload: snapshot });
  }

  /** Broadcast once, at the exact moment a game transitions running -> finished. */
  async broadcastGameFinished(roomId: string, payload: import('./ws/ws-message.types').GameFinishedPayload): Promise<void> {
    this.registry.broadcastToRoom(roomId, { type: 'game_finished', payload });
  }

  private async buildRoomStatePayload(roomId: string): Promise<RoomStatePayload> {
    const room = await this.bingoService.getRoom(roomId);

    if (room.isLobby) {
      const [presence, chatHistory] = await Promise.all([
        this.buildPresence(roomId, null),
        this.bingoService.getChatHistory(roomId),
      ]);

      return {
        serverTime: new Date().toISOString(),
        room: { id: room.id, name: room.name, betAmount: 0, maxPlayers: room.maxPlayers },
        game: null,
        presence,
        chatHistory,
      };
    }

    const game = await this.bingoService.getRoomCurrentGame(roomId);
    const gameSnapshot = await this.bingoService.buildGameSnapshot(game);
    const [presence, chatHistory] = await Promise.all([
      this.buildPresence(roomId, game.id),
      this.bingoService.getChatHistory(roomId),
    ]);

    return {
      serverTime: new Date().toISOString(),
      room: { id: room.id, name: room.name, betAmount: Number(room.betAmount), maxPlayers: room.maxPlayers },
      game: gameSnapshot,
      presence,
      chatHistory,
    };
  }

  private async buildPresence(roomId: string, currentGameId: string | null): Promise<PresenceEntry[]> {
    const playerIds = this.registry.getRoomPlayerIds(roomId);
    if (playerIds.length === 0) {
      return [];
    }
    const [players, playingIds] = await Promise.all([
      this.bingoService.getPlayersByIds(playerIds),
      currentGameId ? this.bingoService.getCardOwnerIds(currentGameId) : Promise.resolve([] as string[]),
    ]);
    const playingSet = new Set(playingIds);

    return players.map((player) => ({
      playerId: player.id,
      userId: player.userId,
      displayName: player.displayName ?? player.username,
      level: player.level,
      role: player.user?.role ?? null,
      isPlaying: playingSet.has(player.id),
      chips: Number(player.user?.chips ?? 0),
    }));
  }

  private sendError(client: WebSocket, code: string, message: string): void {
    this.registry.sendTo(client, { type: 'error', payload: { code, message } });
  }
}
