import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { serverEnv } from '@/lib/env';
import * as schema from './schema';

export const pool = new Pool({ connectionString: serverEnv.databaseUrl });
export const db = drizzle(pool, { schema });
export const DEFAULT_USER_ID = 'local-user';
