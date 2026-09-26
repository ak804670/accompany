import { AccessToken, RoomServiceClient } from 'livekit-server-sdk';

import type { CallMediaProvider, ParticipantGrant } from './media-provider.js';

export class LiveKitProvider implements CallMediaProvider {
  private readonly rooms: RoomServiceClient;

  constructor(
    private readonly url: string,
    private readonly apiKey: string,
    private readonly apiSecret: string,
  ) {
    this.rooms = new RoomServiceClient(url.replace(/^ws/, 'http'), apiKey, apiSecret);
  }

  async createRoom(room: string, emptyTimeoutSeconds: number): Promise<void> {
    await this.rooms.createRoom({ name: room, emptyTimeout: emptyTimeoutSeconds });
  }

  async generateToken(grant: ParticipantGrant): Promise<string> {
    const token = new AccessToken(this.apiKey, this.apiSecret, {
      identity: grant.identity,
      ttl: grant.ttlSeconds,
    });
    token.addGrant({
      roomJoin: true,
      room: grant.room,
      canPublish: true,
      canSubscribe: true,
    });
    return token.toJwt();
  }

  async endRoom(room: string): Promise<void> {
    await this.rooms.deleteRoom(room);
  }
}
