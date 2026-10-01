import { bindDatabase, clearUserCache, type AppDatabase } from '@/database/db';
import { migrate } from '@/database/migrations';
import { chatRepository, clearChatMemory } from '@/database/repositories/chatRepository';
import { clearMessageMemory, messageRepository } from '@/database/repositories/messageRepository';
import { clearProfileMemory, profileRepository } from '@/database/repositories/profileRepository';
import type { ChatMessage } from '@/features/chat/chat.service';
import type { UserProfile } from '@/features/profile/types';

type Statement = {
  run(...params: Array<string | number | null>): void;
  all(...params: Array<string | number | null>): unknown[];
  get(...params: Array<string | number | null>): unknown;
};

type SyncDatabase = {
  exec(sql: string): void;
  prepare(sql: string): Statement;
};

function memoryDatabase(): AppDatabase {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const sqlite = require('node:sqlite') as { DatabaseSync: new (path: string) => SyncDatabase };
  const db = new sqlite.DatabaseSync(':memory:');
  return {
    exec: async (sql) => {
      db.exec(sql);
    },
    run: async (sql, params = []) => {
      db.prepare(sql).run(...params);
    },
    all: async (sql, params = []) => db.prepare(sql).all(...params) as never[],
    first: async (sql, params = []) => (db.prepare(sql).get(...params) as never) ?? null,
  };
}

const profile = (name: string): UserProfile => ({
  id: name,
  displayName: name,
  dateOfBirth: null,
  bio: null,
  languagePreferences: [],
  step: 'complete',
  interests: [],
  media: [],
  complete: true,
});

const message = (id: string, body: string, clientMessageId?: string): ChatMessage => ({
  id,
  senderId: 'user-a',
  body,
  createdAt: `2026-10-02T00:00:${id.slice(-2).padStart(2, '0')}.000Z`,
  mine: true,
  clientMessageId: clientMessageId ?? null,
});

describe('sqlite repositories', () => {
  beforeEach(async () => {
    clearProfileMemory();
    clearChatMemory();
    clearMessageMemory();
    const db = memoryDatabase();
    await migrate(db);
    await migrate(db);
    bindDatabase(db);
  });

  it('keeps a profile for its owner and hides it from the next account', async () => {
    await profileRepository.save('user-a', profile('Ananya'));
    clearProfileMemory();

    expect((await profileRepository.get('user-a'))?.displayName).toBe('Ananya');
    expect(await profileRepository.get('user-b')).toBeNull();

    await clearUserCache('user-a');
    clearProfileMemory();
    expect(await profileRepository.get('user-a')).toBeNull();
  });

  it('replaces a pending message with the server copy and ignores a duplicate event', async () => {
    const pending = message('client-1', 'Hello', 'client-1');
    await messageRepository.savePending('user-a', 'chat-1', pending);
    const saved = message('server-1', 'Hello', 'client-1');
    await messageRepository.confirm('user-a', 'chat-1', 'client-1', saved);
    await messageRepository.saveMany('user-a', 'chat-1', [saved]);
    clearMessageMemory();

    const stored = await messageRepository.latest('user-a', 'chat-1');
    expect(stored.map((item) => item.id)).toEqual(['server-1']);
    expect(await messageRepository.latest('user-b', 'chat-1')).toEqual([]);
  });

  it('drops a message that failed to send', async () => {
    const pending = message('client-2', 'Nope', 'client-2');
    await messageRepository.savePending('user-a', 'chat-1', pending);
    await messageRepository.remove('user-a', 'chat-1', 'client-2');
    clearMessageMemory();
    expect(await messageRepository.latest('user-a', 'chat-1')).toEqual([]);
  });

  it('stores chat rows per account', async () => {
    await chatRepository.savePage('user-a', [{
      id: 'chat-1',
      personId: 'person-1',
      name: 'Kabir',
      preview: 'Hi',
      updatedAt: '2026-10-02T00:00:00.000Z',
      unreadCount: 2,
      online: true,
      status: 'accepted',
      incoming: false,
    }], 2, null, 'replace');
    clearChatMemory();

    const page = await chatRepository.list('user-a');
    expect(page.conversations.map((item) => item.id)).toEqual(['chat-1']);
    expect(page.unread).toBe(2);
    expect(await chatRepository.list('user-b')).toEqual({ conversations: [], nextCursor: null, unread: 0 });
  });
});
