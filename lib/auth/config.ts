export const AUTH_COOKIE_NAME=process.env.AUTH_COOKIE_NAME||'newsletter_session';
export const MAGIC_LINK_TTL_MINUTES=Number(process.env.AUTH_MAGIC_LINK_TTL_MINUTES||15);
export const SESSION_DAYS=Number(process.env.AUTH_SESSION_DAYS||14);
export function normalizeEmail(email:string){return email.trim().toLowerCase()}
export function isEmailAllowed(email:string){const exact=(process.env.AUTH_ALLOWED_EMAILS||'').split(',').map(v=>v.trim().toLowerCase()).filter(Boolean); const domains=(process.env.AUTH_ALLOWED_EMAIL_DOMAINS||'').split(',').map(v=>v.trim().toLowerCase()).filter(Boolean); if(exact.length===0&&domains.length===0)return process.env.NODE_ENV!=='production'; const domain=email.split('@')[1]||''; return exact.includes(email)||domains.includes(domain)}
