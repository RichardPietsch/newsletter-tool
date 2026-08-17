import { bootstrapInitialAdmin } from '@/lib/admin/bootstrap';
import { pool } from '@/lib/db';
import { serverEnv } from '@/lib/env';

async function main() {
  const email = serverEnv.bootstrap.adminEmail;
  if (!email) {
    console.log('BOOTSTRAP_ADMIN_EMAIL is not configured; initial administrator bootstrap skipped.');
    return;
  }

  const result = await bootstrapInitialAdmin({
    email,
    name: serverEnv.bootstrap.adminName,
    source: 'environment',
  });
  console.log(
    result.status === 'created'
      ? 'Initial platform administrator created from deployment configuration.'
      : result.status === 'registered'
        ? 'Existing platform administrator registered as installation owner.'
        : 'Initial administrator bootstrap already completed; no changes applied.',
  );
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : 'Environment administrator bootstrap failed.');
    process.exitCode = 1;
  })
  .finally(() => pool.end());
