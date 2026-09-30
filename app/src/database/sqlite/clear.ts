import { getDatabase } from '@/database/sqlite/database';
import { resetMemory } from '@/database/sqlite/memory';
import { DATA_TABLES } from '@/database/sqlite/schema';

export async function clearLocalData(): Promise<void> {
  const db = await getDatabase();
  await db.transaction(async () => {
    for (const table of DATA_TABLES) {
      await db.run(`DELETE FROM ${table}`);
    }
  });
  resetMemory();
}
