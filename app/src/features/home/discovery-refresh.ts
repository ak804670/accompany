const listeners = new Set<() => void>();

export function refreshDiscovery(): void {
  for (const listener of listeners) listener();
}

export function onDiscoveryRefresh(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
