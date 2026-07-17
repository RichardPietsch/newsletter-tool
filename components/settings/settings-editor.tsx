'use client';

import { t } from '@/lib/i18n';

import Color from '@tiptap/extension-color';
import Link from '@tiptap/extension-link';
import TextStyle from '@tiptap/extension-text-style';
import Underline from '@tiptap/extension-underline';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { nanoid } from 'nanoid';
import NextLink from 'next/link';
import { useEffect, useState } from 'react';
import { RichTextToolbar } from '@/components/editor/rich-text-toolbar';
import type { GlobalSettings } from '@/lib/settings/schema';

function FooterRichTextEditor({
  value,
  onChange,
  onBlur,
}: {
  value: GlobalSettings['footerRichText'];
  onChange: (value: GlobalSettings['footerRichText']) => void;
  onBlur: (value: GlobalSettings['footerRichText']) => void;
}) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] } }),
      TextStyle,
      Color.configure({ types: ['textStyle'] }),
      Underline,
      Link.configure({ openOnClick: false }),
    ],
    content: value,
    editorProps: {
      attributes: {
        class:
          'min-h-48 rounded border bg-white p-3 text-slate-800 focus:outline-none [&_a]:text-blue-700 [&_a]:underline [&_h2]:text-2xl [&_h2]:font-bold [&_h3]:text-xl [&_h3]:font-bold [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6',
        'aria-label': 'Globalen Footer als RichText bearbeiten',
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getJSON() as GlobalSettings['footerRichText']),
    onBlur: ({ editor }) => onBlur(editor.getJSON() as GlobalSettings['footerRichText']),
  });

  useEffect(() => {
    if (!editor || editor.isFocused) return;
    if (JSON.stringify(editor.getJSON()) !== JSON.stringify(value)) editor.commands.setContent(value, false);
  }, [editor, value]);

  if (!editor) return <div className="mt-4 min-h-48 rounded border p-3 text-slate-500">{t('shared.loadRichText')}</div>;

  return (
    <div className="mt-4">
      <RichTextToolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
}

export function SettingsEditor({
  initialSettings,
  usedHeaderVariantIds,
  embedded = false,
}: {
  initialSettings: GlobalSettings;
  usedHeaderVariantIds: string[];
  embedded?: boolean;
}) {
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
    };
    setSettings(next);
    await save(next);
  }

  function updateFooterRichText(footerRichText: GlobalSettings['footerRichText']) {
    setSettings((current) => ({ ...current, footerRichText }));
  }

  async function saveFooterRichText(footerRichText: GlobalSettings['footerRichText']) {
    const next = { ...settings, footerRichText };
    setSettings(next);
    await save(next);
  }

  return (
    <div className={embedded ? 'p-6' : 'mx-auto max-w-5xl p-8'}>
      <div className="mb-8 flex items-center justify-between">
        <div>
          {!embedded ? (
            <NextLink href="/newsletters" className="text-sm text-blue-700">
              {t('misc.backToNewsletterList')}
            </NextLink>
          ) : null}
          <h1 className={embedded ? 'text-3xl font-bold' : 'mt-2 text-3xl font-bold'}>{t('misc.configuration')}</h1>
          <p className="text-slate-600">{t('misc.settingsIntro')}</p>
        </div>
        <div aria-live="polite" className="rounded bg-white px-3 py-2 text-sm text-slate-700">
          {status === 'saved' ? t('save.saved') : status === 'saving' ? t('save.saving') : t('save.failed')}
        </div>
      </div>

      <section className="rounded-xl bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold">{t('misc.headerVariants')}</h2>
        <p className="mt-1 text-sm text-slate-600">{t('misc.headerVariantsDescription')}</p>
        <label className="mt-4 inline-flex cursor-pointer rounded bg-blue-700 px-4 py-2 text-white">
          {uploading ? 'Upload läuft …' : 'Header-Bild hochladen'}
          <input
            className="sr-only"
            type="file"
            accept="image/jpeg,image/png,image/gif"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void uploadHeaderImage(file);
            }}
          />
        </label>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {settings.headerVariants.map((variant) => (
            <article key={variant.id} className="rounded-lg border p-4">
              <img src={variant.imageUrl} alt={variant.alt} className="h-28 w-full rounded object-contain" />
              <label className="mt-3 block text-sm font-medium">
                Name
                <input
                  className="mt-1 w-full rounded border p-2"
                  value={variant.name}
                  onChange={(event) => {
                    const next = {
                      ...settings,
                      headerVariants: settings.headerVariants.map((item) =>
                        item.id === variant.id ? { ...item, name: event.target.value } : item,
                      ),
                    };
                    setSettings(next);
                  }}
                  onBlur={() => void save()}
                />
              </label>
              <label className="mt-3 block text-sm font-medium">
                {t('image.alt')}
                <input
                  className="mt-1 w-full rounded border p-2"
                  value={variant.alt}
                  onChange={(event) => {
                    const next = {
                      ...settings,
                      headerVariants: settings.headerVariants.map((item) =>
                        item.id === variant.id ? { ...item, alt: event.target.value } : item,
                      ),
                    };
                    setSettings(next);
                  }}
                  onBlur={() => void save()}
                />
              </label>
              <button
                type="button"
                className="mt-3 rounded border px-3 py-2 text-sm text-red-700 disabled:cursor-not-allowed disabled:text-slate-400"
                disabled={usedHeaderVariantIds.includes(variant.id)}
                title={
                  usedHeaderVariantIds.includes(variant.id)
                    ? 'Diese Variante wird in mindestens einem Newsletter verwendet.'
                    : 'Header-Variante löschen'
                }
                onClick={() => {
                  const next = {
                    ...settings,
                    headerVariants: settings.headerVariants.filter((item) => item.id !== variant.id),
                  };
                  setSettings(next);
                  void save(next);
                }}
              >
                {usedHeaderVariantIds.includes(variant.id) ? 'Wird verwendet' : 'Variante löschen'}
              </button>
            </article>
          ))}
          {settings.headerVariants.length === 0 && (
            <p className="rounded border border-dashed p-6 text-slate-600">{t('misc.noHeaderVariant')}</p>
          )}
        </div>
      </section>

      <section className="mt-8 rounded-xl bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold">{t('misc.globalFooter')}</h2>
        <p className="mt-1 text-sm text-slate-600">{t('misc.globalFooterDescription')}</p>
        <FooterRichTextEditor
          value={settings.footerRichText}
          onChange={updateFooterRichText}
          onBlur={(footerRichText) => void saveFooterRichText(footerRichText)}
        />
        <button className="mt-3 rounded bg-blue-700 px-4 py-2 text-white" onClick={() => void save()}>
          {t('misc.saveFooter')}
        </button>
      </section>
    </div>
  );
}
