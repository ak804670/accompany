const photos = new Map<string, string | null>();
const waiters = new Map<string, Promise<string | null>>();

export function cachedPhoto(userId: string): string | null | undefined {
  return photos.has(userId) ? photos.get(userId) : undefined;
}

export function rememberPhoto(userId: string, uri: string | null): void {
  photos.set(userId, uri);
}

export function prefetchPhotos(userIds: string[], fetcher: (userId: string) => Promise<string | null>): Promise<void> {
  return Promise.all(userIds.map((userId) => loadPhoto(userId, () => fetcher(userId)))).then(() => undefined);
}

export function loadPhoto(userId: string, fetcher: () => Promise<string | null>): Promise<string | null> {
  const existing = cachedPhoto(userId);
  if (existing !== undefined) return Promise.resolve(existing);
  const pending = waiters.get(userId);
  if (pending) return pending;
  const request = fetcher().then((uri) => {
    photos.set(userId, uri);
    waiters.delete(userId);
    return uri;
  }).catch(() => {
    waiters.delete(userId);
    return null;
  });
  waiters.set(userId, request);
  return request;
}
