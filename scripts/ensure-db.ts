import { sql } from 'drizzle-orm';
import { db, DEFAULT_USER_ID, pool } from '@/lib/db';
import { users } from '@/lib/db/schema';

async function main() {
  await db.execute(sql`
    create table if not exists users (
      id text primary key,
      email text not null unique,
      created_at timestamp not null default now(),
      updated_at timestamp not null default now()
    );
  `);

  await db.execute(sql`
    create table if not exists newsletters (
      id text primary key,
      owner_id text not null references users(id),
      title text not null,
      document jsonb not null,
      created_at timestamp not null default now(),
      updated_at timestamp not null default now()
    );
  `);

  await db.execute(sql`
    create table if not exists assets (
      id text primary key,
      owner_id text not null references users(id),
      storage_key text not null,
      public_url text not null,
      original_filename text not null,
      mime_type text not null,
      width integer not null,
      height integer not null,
      size_bytes integer not null,
      created_at timestamp not null default now()
    );
  `);


  await db.execute(sql`
    create table if not exists app_settings (
      id text primary key,
      settings jsonb not null,
      updated_at timestamp not null default now()
    );
  `);

  await db.insert(users).values({ id: DEFAULT_USER_ID, email: 'local@example.test' }).onConflictDoNothing();
  console.log('Database schema and default user are ready.');
}

main()
  .catch((error: unknown) => {
    console.error('Failed to ensure database schema.', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
