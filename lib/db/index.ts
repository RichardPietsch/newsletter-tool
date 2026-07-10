import { drizzle } from 'drizzle-orm/node-postgres'; import { Pool } from 'pg'; import * as schema from './schema';
export const pool=new Pool({connectionString:process.env.DATABASE_URL||'postgres://newsletter:newsletter@localhost:5432/newsletter'}); export const db=drizzle(pool,{schema}); export const DEFAULT_USER_ID='local-user';
