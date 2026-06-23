'use client';

import { nanoid } from 'nanoid';
import { useState } from 'react';
import type { GlobalSettings } from '@/lib/settings/schema';

function plainTextFromDoc(doc: GlobalSettings['footerRichText']) {
  return (doc.content ?? [])
    .map((node: any) => (node.content ?? []).map((child: any) => child.text ?? '').join(''))
    .join('\n');
}

function docFromPlainText(text: string): GlobalSettings['footerRichText'] {
  return {
    type: 'doc',
    content: text.split('\n').map((line) => ({
      type: 'paragraph',
      content: line ? [{ type: 'text', text: line }] : [],
    })),
  };
}

export function SettingsEditor({ initialSettings }: { initialSettings: GlobalSettings }) {
  const [settings, setSettings] = useState(initialSettings);
  const [status, setStatus] = useState<'saved' | 'saving' | 'error'>('saved');
  const [uploading, setUploading] = useState(false);

  async function save(next = settings) {
    setStatus('saving');
    const response = await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(next),
    });
    setStatus(response.ok ? 'saved' : 'error');
  }

  async function uploadHeaderImage(file: File) {
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    const response = await fetch('/api/assets', { method: 'POST', body: formData });
    setUploading(false);

    if (!response.ok) {
      setStatus('error');
      return;
    }

    const asset = await response.json();
    const variant = {
      id: nanoid(),
      name: asset.originalFilename.replace(/\.[^.]+$/, '') || 'Header-Variante',
      imageUrl: asset.publicUrl,
      alt: 'Newsletter Header',
    };
    const next = {
      ...settings,
      headerVariants: [...settings.headerVariants, variant],
      activeHeaderVariantId: settings.activeHeaderVariantId ?? variant.id,
    };
    setSettings(next);
    await save(next);
  }

  return (
    <main className="mx-auto max-w-5xl p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <a href="/newsletters" className="text-sm text-blue-700">← Zur Newsletter-Liste</a>
          <h1 className="mt-2 text-3xl font-bold">Konfiguration</h1>
          <p className="text-slate-600">Bearbeite globale Header-Varianten und den systemweiten Footer.</p>
        </div>
        <div aria-live="polite" className="rounded bg-white px-3 py-2 text-sm text-slate-700">
          {status === 'saved' ? 'Gespeichert' : status === 'saving' ? 'Speichern …' : 'Speichern fehlgeschlagen'}
        </div>
      </div>

      <section className="rounded-xl bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold">Header-Varianten</h2>
        <p className="mt-1 text-sm text-slate-600">Jede Variante besteht aus einem hochgeladenen Bild. Die aktive Variante wird global im Editor und Export verwendet.</p>
        <label className="mt-4 inline-flex cursor-pointer rounded bg-blue-700 px-4 py-2 text-white">
          {uploading ? 'Upload läuft …' : 'Header-Bild hochladen'}
          <input className="sr-only" type="file" accept="image/jpeg,image/png,image/gif" onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadHeaderImage(file); }} />
        </label>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {settings.headerVariants.map((variant) => (
            <article key={variant.id} className="rounded-lg border p-4">
              <img src={variant.imageUrl} alt={variant.alt} className="h-28 w-full rounded object-contain" />
              <label className="mt-3 block text-sm font-medium">Name
                <input className="mt-1 w-full rounded border p-2" value={variant.name} onChange={(event) => {
                  const next = { ...settings, headerVariants: settings.headerVariants.map((item) => item.id === variant.id ? { ...item, name: event.target.value } : item) };
                  setSettings(next);
                }} onBlur={() => void save()} />
              </label>
              <label className="mt-3 block text-sm font-medium">Alternativtext
                <input className="mt-1 w-full rounded border p-2" value={variant.alt} onChange={(event) => {
                  const next = { ...settings, headerVariants: settings.headerVariants.map((item) => item.id === variant.id ? { ...item, alt: event.target.value } : item) };
                  setSettings(next);
                }} onBlur={() => void save()} />
              </label>
              <label className="mt-3 flex items-center gap-2 text-sm">
                <input type="radio" name="active-header" checked={settings.activeHeaderVariantId === variant.id} onChange={() => { const next = { ...settings, activeHeaderVariantId: variant.id }; setSettings(next); void save(next); }} />
                Als aktive Header-Variante verwenden
              </label>
            </article>
          ))}
          {settings.headerVariants.length === 0 && <p className="rounded border border-dashed p-6 text-slate-600">Noch keine Header-Variante vorhanden. Lade ein JPEG, PNG oder GIF hoch.</p>}
        </div>
      </section>

      <section className="mt-8 rounded-xl bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold">Globaler Footer</h2>
        <p className="mt-1 text-sm text-slate-600">Der Footer wird als eingeschränkter RichText gespeichert. Im MVP wird er als Absatzstruktur gepflegt.</p>
        <textarea className="mt-4 min-h-48 w-full rounded border p-3" value={plainTextFromDoc(settings.footerRichText)} onChange={(event) => setSettings({ ...settings, footerRichText: docFromPlainText(event.target.value) })} onBlur={() => void save()} />
        <button className="mt-3 rounded bg-blue-700 px-4 py-2 text-white" onClick={() => void save()}>Footer speichern</button>
      </section>
    </main>
  );
}
