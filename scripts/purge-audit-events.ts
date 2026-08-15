import { pool } from '@/lib/db';
import { purgeExpiredData } from '@/lib/db/retention';

async function main() {
  await purgeExpiredData();
}

main()
  .catch((error: unknown) => {
    console.error('Retention cleanup failed.', error instanceof Error ? error.message : 'Unknown error');
    process.exitCode = 1;
  })
  .finally(() => pool.end());
