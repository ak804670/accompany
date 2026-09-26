export type CallPhase = 'IDLE' | 'RINGING' | 'CONNECTING' | 'CONNECTED' | 'ENDING' | 'ENDED' | 'REJECTED' | 'MISSED' | 'FAILED';

const TERMINAL = new Set<CallPhase>(['ENDED', 'REJECTED', 'MISSED', 'FAILED']);

export function isTerminal(phase: CallPhase): boolean {
  return TERMINAL.has(phase);
}

export function phaseFromStatus(status: string): CallPhase {
  if (status === 'RINGING') return 'RINGING';
  if (status === 'ACCEPTED' || status === 'CONNECTING') return 'CONNECTING';
  if (status === 'CONNECTED') return 'CONNECTED';
  if (status === 'DECLINED' || status === 'CANCELLED') return 'REJECTED';
  if (status === 'MISSED') return 'MISSED';
  if (status === 'FAILED') return 'FAILED';
  if (status === 'ENDED') return 'ENDED';
  return 'IDLE';
}

export type CallCommand = 'answer' | 'reject' | 'connect' | 'end' | 'miss' | 'fail';

export function reduceCall(phase: CallPhase, command: CallCommand): CallPhase {
  if (phase === 'ENDING' || isTerminal(phase)) return phase === 'ENDING' && command === 'end' ? 'ENDED' : phase;
  if (command === 'answer' && phase === 'RINGING') return 'CONNECTING';
  if (command === 'connect' && (phase === 'RINGING' || phase === 'CONNECTING')) return 'CONNECTED';
  if (command === 'reject' && phase === 'RINGING') return 'REJECTED';
  if (command === 'miss' && phase === 'RINGING') return 'MISSED';
  if (command === 'fail') return 'FAILED';
  if (command === 'end' && (phase === 'RINGING' || phase === 'CONNECTING' || phase === 'CONNECTED')) return 'ENDING';
  return phase;
}
