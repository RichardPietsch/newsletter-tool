import { pool } from '@/lib/db';
import { bootstrapInitialAdmin, recoverPlatformAdmin } from '@/lib/admin/bootstrap';

function argument(name: string) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1]?.trim() : undefined;
}

async function main() {
  const email = argument('email');
  const name = argument('name');
  if (!email || !name || !email.includes('@')) {
    throw new Error(
      'Usage: pnpm admin:bootstrap --email admin@example.com --name "Admin Name" ' +
        '[--recover --current-email current@example.com]',
    );
  }

  if (process.argv.includes('--recover')) {
    const currentEmail = argument('current-email');
    if (!currentEmail) throw new Error('--current-email is required for explicit administrator recovery.');
    await recoverPlatformAdmin({ currentEmail, email, name });
    console.log('Platform administrator recovered. Existing administrator sessions were revoked.');
    return;
  }

  const result = await bootstrapInitialAdmin({ email, name, source: 'cli' });
  console.log(
    result.status === 'created'
      ? 'Platform administrator created. No link or session was generated.'
      : result.status === 'registered'
        ? 'Existing platform administrator registered as installation owner.'
        : 'Installation is already initialized for this platform administrator.',
  );
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : 'Admin bootstrap failed.');
    process.exitCode = 1;
  })
  .finally(() => pool.end());
