import { and, eq, gt, isNull } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { db } from '@/lib/db';
import { sessions, users } from '@/lib/db/schema';
import { SESSION_DAYS } from './config';
import { createSecureToken, hashToken } from './tokens';
export type AuthUser=typeof users.$inferSelect;
export async function createSession(userId:string,metadata:{userAgent?:string|null;ipAddress?:string|null}={}){const token=createSecureToken(); const expiresAt=new Date(Date.now()+SESSION_DAYS*24*60*60*1000); await db.insert(sessions).values({id:nanoid(),userId,sessionTokenHash:hashToken(token),expiresAt,userAgent:metadata.userAgent||null,ipAddress:metadata.ipAddress||null}); return token}
export async function validateSession(token:string):Promise<AuthUser|null>{const [row]=await db.select({user:users,session:sessions}).from(sessions).innerJoin(users,eq(sessions.userId,users.id)).where(and(eq(sessions.sessionTokenHash,hashToken(token)),isNull(sessions.revokedAt),gt(sessions.expiresAt,new Date()))); if(!row)return null; const stale=Date.now()-row.session.lastSeenAt.getTime()>10*60*1000; if(stale) await db.update(sessions).set({lastSeenAt:new Date()}).where(eq(sessions.id,row.session.id)); return row.user}
export async function revokeSession(token:string){await db.update(sessions).set({revokedAt:new Date()}).where(eq(sessions.sessionTokenHash,hashToken(token)))}
