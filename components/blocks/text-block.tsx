'use client'; import type { TextBlock as T } from '@/lib/newsletter/schema';
function plain(nodes:any[]=[]):string{return nodes.map(n=>n.text||plain(n.content)).join(' ')} export function TextBlock({block}:{block:T}){return <div className="bg-white p-6 text-slate-800"><p>{plain(block.content.content)||'Textbaustein'}</p></div>}
