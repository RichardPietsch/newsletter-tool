import { nanoid } from 'nanoid';
import type { NewsletterBlock, NewsletterDocument } from './schema';
export const emptyTiptapDoc={type:'doc' as const,content:[{type:'paragraph',content:[{type:'text',text:'Neuer Textbaustein'}]}]};
export function createDefaultDocument(title='Neuer Newsletter'):NewsletterDocument{return{schemaVersion:1,title,blocks:[{id:nanoid(),type:'header',locked:true,branding:'ACME Newsletter'},{id:nanoid(),type:'footer',locked:true,contact:'ACME GmbH · Musterstraße 1 · 12345 Berlin',legal:'Impressum und Datenschutz werden zentral gepflegt.'}]}}
export function createBlock(type:'text'|'event'|'image'):NewsletterBlock{if(type==='text')return{id:nanoid(),type:'text',content:emptyTiptapDoc}; if(type==='event')return{id:nanoid(),type:'event',title:'Neue Veranstaltung',description:'Kurzbeschreibung der Veranstaltung'}; return{id:nanoid(),type:'image',decorative:false,alt:''}}
