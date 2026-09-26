export type ParticipantGrant = {
  identity: string;
  room: string;
  ttlSeconds: number;
};

export interface CallMediaProvider {
  createRoom(room: string, emptyTimeoutSeconds: number): Promise<void>;
  generateToken(grant: ParticipantGrant): Promise<string>;
  endRoom(room: string): Promise<void>;
}
