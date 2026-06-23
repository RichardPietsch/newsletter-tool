'use client'; import { useNewsletterStore } from '@/lib/newsletter/store';
export function SaveStatus(){const s=useNewsletterStore(x=>x.status); return <div aria-live="polite" className="text-sm text-slate-600">{s==='saved'?'Gespeichert':s==='saving'?'Speichern …':'Speichern fehlgeschlagen'}</div>}
