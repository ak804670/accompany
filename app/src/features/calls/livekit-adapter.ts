export type LiveKitSession = {
  callId: string;
  url: string;
  token: string;
  roomName: string;
};

export class LiveKitAdapter {
  private session: LiveKitSession | null = null;

  connect(session: LiveKitSession): void {
    this.session = session;
  }

  current(): LiveKitSession | null {
    return this.session;
  }

  disconnect(callId: string): void {
    if (this.session?.callId === callId) this.session = null;
  }
}
