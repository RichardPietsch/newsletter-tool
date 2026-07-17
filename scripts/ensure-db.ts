import { sql } from 'drizzle-orm';
import { db, DEFAULT_USER_ID, pool } from '@/lib/db';
import { users } from '@/lib/db/schema';

async function main() {
  await db.execute(sql`
    create table if not exists users (
      id text primary key,
      email text not null unique,
      name text,
      email_verified_at timestamp,
      last_login_at timestamp,
      created_at timestamp not null default now(),
      updated_at timestamp not null default now()
    );
  `);

  await db.execute(sql`alter table users add column if not exists name text;`);
  await db.execute(sql`alter table users add column if not exists email_verified_at timestamp;`);
  await db.execute(sql`alter table users add column if not exists last_login_at timestamp;`);

  await db.execute(sql`
    create table if not exists newsletters (
      id text primary key,
      owner_id text not null references users(id),
      title text not null,
      document jsonb not null,
      sent_at timestamp,
      created_at timestamp not null default now(),
      updated_at timestamp not null default now()
    );
  `);
  await db.execute(sql`alter table newsletters add column if not exists sent_at timestamp;`);
  await db.execute(sql`create index if not exists newsletters_owner_idx on newsletters(owner_id);`);

  await db.execute(sql`
    create table if not exists assets (
      id text primary key,
      owner_id text not null references users(id),
      storage_key text not null,
      public_url text not null,
      original_filename text not null,
      title text,
      alt_text text,
      mime_type text not null,
      width integer not null,
      height integer not null,
      size_bytes integer not null,
      created_at timestamp not null default now()
    );
  `);
  await db.execute(sql`alter table assets add column if not exists title text;`);
  await db.execute(sql`alter table assets add column if not exists alt_text text;`);
  await db.execute(sql`create index if not exists assets_owner_idx on assets(owner_id);`);

  await db.execute(sql`
    create table if not exists app_settings (
      id text primary key,
      owner_id text references users(id),
      settings jsonb not null,
      updated_at timestamp not null default now()
    );
  `);
  await db.execute(sql`alter table app_settings add column if not exists owner_id text references users(id);`);
  await db.execute(sql`create index if not exists app_settings_owner_idx on app_settings(owner_id);`);

  await db.execute(sql`
    create table if not exists auth_magic_links (
      id text primary key,
      user_id text not null references users(id),
      email text not null,
      token_hash text not null unique,
      expires_at timestamp not null,
      consumed_at timestamp,
      created_at timestamp not null default now(),
      requested_ip text,
      user_agent text
    );
  `);
  await db.execute(sql`create index if not exists magic_links_email_idx on auth_magic_links(email);`);
  await db.execute(sql`create index if not exists magic_links_created_idx on auth_magic_links(created_at);`);

  await db.execute(sql`
    create table if not exists sessions (
      id text primary key,
      user_id text not null references users(id),
      session_token_hash text not null unique,
      expires_at timestamp not null,
      created_at timestamp not null default now(),
      last_seen_at timestamp not null default now(),
      revoked_at timestamp,
      user_agent text,
      ip_address text
    );
  `);
  await db.execute(sql`create index if not exists sessions_user_idx on sessions(user_id);`);
  await db.execute(sql`create index if not exists sessions_expires_idx on sessions(expires_at);`);

  await db.execute(sql`
    create table if not exists audit_events (
      id text primary key,
      user_id text not null references users(id),
      event_type text not null,
      entity_id text,
      created_at timestamp not null default now()
    );
  `);
  await db.execute(sql`create index if not exists audit_events_user_idx on audit_events(user_id);`);
  await db.execute(sql`create index if not exists audit_events_created_idx on audit_events(created_at);`);

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
