import { Injectable } from '@nestjs/common';
import type WebSocket from 'ws';
import { WsEnvelope } from './ws-message.types';

interface ConnectionMeta {
  roomId: string;
  playerId: string;
  /** Captured once at connection time (see BingoGateway.extractClientIp) - used by the "guess the
   *  first number" mini-game to block a second guess from the same IP in the same round. */
  ipAddress: string | null;
}

@Injectable()
export class BingoConnectionRegistry {
  private readonly roomSockets = new Map<string, Set<WebSocket>>();
  private readonly socketMeta = new Map<WebSocket, ConnectionMeta>();

  register(client: WebSocket, roomId: string, playerId: string, ipAddress: string | null = null): void {
    if (!this.roomSockets.has(roomId)) {
      this.roomSockets.set(roomId, new Set());
    }
    this.roomSockets.get(roomId)!.add(client);
    this.socketMeta.set(client, { roomId, playerId, ipAddress });
  }

  unregister(client: WebSocket): void {
    const meta = this.socketMeta.get(client);
    if (!meta) {
      return;
    }
    const sockets = this.roomSockets.get(meta.roomId);
    sockets?.delete(client);
    if (sockets && sockets.size === 0) {
      this.roomSockets.delete(meta.roomId);
    }
    this.socketMeta.delete(client);
  }

  getMeta(client: WebSocket): ConnectionMeta | undefined {
    return this.socketMeta.get(client);
  }

  getRoomConnectionCount(roomId: string): number {
    return this.roomSockets.get(roomId)?.size ?? 0;
  }

  /** Distinct players currently connected to a room (one player can have >1 socket open). */
  getRoomPlayerIds(roomId: string): string[] {
    const sockets = this.roomSockets.get(roomId);
    if (!sockets) {
      return [];
    }
    const ids = new Set<string>();
    for (const socket of sockets) {
      const meta = this.socketMeta.get(socket);
      if (meta) {
        ids.add(meta.playerId);
      }
    }
    return Array.from(ids);
  }

  sendTo(client: WebSocket, envelope: WsEnvelope): void {
    if (client.readyState === client.OPEN) {
      client.send(JSON.stringify(envelope));
    }
  }

  broadcastToRoom(roomId: string, envelope: WsEnvelope, exclude?: WebSocket): void {
    const sockets = this.roomSockets.get(roomId);
    if (!sockets) {
      return;
    }
    const message = JSON.stringify(envelope);
    for (const socket of sockets) {
      if (socket !== exclude && socket.readyState === socket.OPEN) {
        socket.send(message);
      }
    }
  }
}
