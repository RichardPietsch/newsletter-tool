'use client';

import Color from '@tiptap/extension-color';
import Link from '@tiptap/extension-link';
import TextStyle from '@tiptap/extension-text-style';
import Underline from '@tiptap/extension-underline';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { nanoid } from 'nanoid';
import { useEffect, useState } from 'react';
import { RichTextToolbar } from '@/components/editor/rich-text-toolbar';
import { t } from '@/lib/i18n';
import {
  deriveNewsletterColorPalette,
  newsletterColorPalettes,
  newsletterContrastRatio,
  newsletterThemeColorTokens,
  type NewsletterPreviewMode,
  type NewsletterThemeColorToken,
} from '@/lib/newsletter/module-styles';
import { ROUNDED_HEADER_IMAGE_RADIUS_PX, type GlobalSettings } from '@/lib/settings/schema';
import { parseThemeYaml, serializeThemeYaml, THEME_YAML_MAX_BYTES } from '@/lib/settings/theme-yaml';

type UploadedAsset = {
  id: string;
  publicUrl: string;
  originalFilename: string;
};

const colorLabels: Record<NewsletterThemeColorToken, string> = {
  background: 'Seitenhintergrund',
  surface: 'Modulfläche',
  teaser: 'Teaserfläche',
  text: 'Text',
  muted: 'Sekundärtext',
  accent: 'Akzent',
  brand: 'Markenfarbe',
  featureBackground: 'Hervorgehobener Hintergrund',
};

const validHexColor = (color: string) => /^#[0-9a-fA-F]{6}$/.test(color);

function ThemePreview({ colors }: { colors: GlobalSettings['colors'] }) {
  const [mode, setMode] = useState<NewsletterPreviewMode>('light');
  const base = colors[mode];
  const palette = Object.values(base).every(validHexColor)
    ? deriveNewsletterColorPalette(base)
    : newsletterColorPalettes[mode];
  const contrastChecks = [
    { label: t('admin.contrastSurfaceText'), ratio: newsletterContrastRatio(palette.text, palette.surface) },
    { label: t('admin.contrastSurfaceMuted'), ratio: newsletterContrastRatio(palette.muted, palette.surface) },
    { label: t('admin.contrastSurfaceBrand'), ratio: newsletterContrastRatio(palette.brand, palette.surface) },
    { label: t('admin.contrastTeaserText'), ratio: newsletterContrastRatio(palette.text, palette.teaser) },
    { label: t('admin.contrastTeaserAccent'), ratio: newsletterContrastRatio(palette.accent, palette.teaser) },
  ];
  const contrastIssues = contrastChecks.filter((check) => check.ratio < 4.5);

  return (
    <div className="mt-6 rounded-lg border bg-slate-50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h4 className="font-semibold">{t('admin.themePreview')}</h4>
          <p className="text-sm text-slate-600">{t('admin.themePreviewIntro')}</p>
        </div>
        <div className="inline-flex rounded border bg-white p-1" aria-label={t('admin.previewMode')}>
          {(['light', 'dark'] as const).map((previewMode) => (
            <button
              key={previewMode}
              type="button"
              className={`rounded px-3 py-1.5 text-sm ${mode === previewMode ? 'bg-slate-900 text-white' : 'text-slate-700'}`}
              aria-pressed={mode === previewMode}
              onClick={() => setMode(previewMode)}
            >
              {previewMode === 'light' ? t('admin.lightMode') : t('admin.darkMode')}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 rounded-lg p-5 transition-colors" style={{ backgroundColor: palette.background }}>
        <div className="grid gap-4 lg:grid-cols-2">
          <article className="rounded p-5" style={{ backgroundColor: palette.surface }}>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: palette.accent }}>
              {t('admin.previewTextOverline')}
            </p>
            <h5 className="mt-2 text-xl font-semibold" style={{ color: palette.text }}>
              {t('admin.previewTextTitle')}
            </h5>
            <p className="mt-2 text-sm leading-relaxed" style={{ color: palette.muted }}>
              {t('admin.previewTextBody')}
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <span className="text-sm underline" style={{ color: palette.brand }}>
                {t('admin.previewLink')}
              </span>
              <span
                className="rounded px-3 py-2 text-xs font-semibold"
                style={{ backgroundColor: palette.brand, color: palette.brandText }}
              >
                {t('admin.previewButton')}
              </span>
            </div>
          </article>

          <article className="rounded p-5" style={{ backgroundColor: palette.teaser }}>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: palette.accent }}>
              {t('admin.previewEventOverline')}
            </p>
            <h5 className="mt-2 text-xl font-semibold" style={{ color: palette.text }}>
              {t('admin.previewEventTitle')}
            </h5>
            <p className="mt-2 text-sm" style={{ color: palette.muted }}>
              {t('admin.previewEventMeta')}
            </p>
            <span
              className="mt-4 inline-block border px-3 py-2 text-xs font-semibold"
              style={{ borderColor: palette.text, color: palette.text }}
            >
              {t('admin.previewEventButton')}
            </span>
          </article>
        </div>

        <article className="mt-4 rounded p-5" style={{ backgroundColor: palette.featureBackground }}>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: palette.featureAccent }}>
            {t('admin.previewFeatureOverline')}
          </p>
          <h5 className="mt-2 text-xl font-semibold" style={{ color: palette.featureText }}>
            {t('admin.previewFeatureTitle')}
          </h5>
          <p className="mt-2 text-sm" style={{ color: palette.featureMuted }}>
            {t('admin.previewFeatureMeta')}
          </p>
          <span
            className="mt-4 inline-block px-3 py-2 text-xs font-semibold"
            style={{ backgroundColor: palette.featureButtonBackground, color: palette.featureButtonText }}
          >
            {t('admin.previewFeatureButton')}
          </span>
        </article>
      </div>
      {contrastIssues.length === 0 ? (
        <p className="mt-3 text-sm text-green-700">{t('admin.themeContrastGood')}</p>
      ) : (
        <div className="mt-3 rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          <p className="font-semibold">{t('admin.themeContrastWarning')}</p>
          <ul className="mt-1 list-disc pl-5">
            {contrastIssues.map((issue) => (
              <li key={issue.label}>
                {issue.label}: {issue.ratio.toFixed(2)}:1
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function FooterEditor({
  value,
  onChange,
}: {
  value: GlobalSettings['footerRichText'];
  onChange: (value: GlobalSettings['footerRichText']) => void;
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
          'min-h-44 rounded border bg-white p-3 text-slate-800 focus:outline-none [&_a]:text-blue-700 [&_a]:underline [&_blockquote]:my-4 [&_blockquote]:border-l-4 [&_blockquote]:pl-5 [&_blockquote]:italic [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6',
        'aria-label': t('admin.footerDefault'),
      },
    },
    onUpdate: ({ editor: current }) => onChange(current.getJSON() as GlobalSettings['footerRichText']),
  });

  useEffect(() => {
    if (!editor || editor.isFocused) return;
    if (JSON.stringify(editor.getJSON()) !== JSON.stringify(value)) editor.commands.setContent(value, false);
  }, [editor, value]);

  if (!editor) return <div className="min-h-44 rounded border p-3 text-slate-500">{t('shared.loadRichText')}</div>;
  return (
    <div>
      <RichTextToolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
}

export function TenantDesignEditor({
  tenantId,
  initialSettings,
  usedHeaderVariantIds,
}: {
  tenantId: string;
  initialSettings: GlobalSettings;
  usedHeaderVariantIds: string[];
}) {
  const [settings, setSettings] = useState(initialSettings);
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [uploading, setUploading] = useState(false);
  const validColors = Object.values(settings.colors).every((palette) =>
    Object.values(palette).every((color) => /^#[0-9a-fA-F]{6}$/.test(color)),
  );

  function updateColor(mode: NewsletterPreviewMode, token: NewsletterThemeColorToken, color: string) {
    setSettings((current) => ({
      ...current,
      colors: { ...current.colors, [mode]: { ...current.colors[mode], [token]: color } },
    }));
    setStatus('idle');
    setImportStatus('idle');
  }

  function exportTheme() {
    const blob = new Blob([serializeThemeYaml(settings.colors)], { type: 'application/yaml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `theme-${tenantId}.yaml`;
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  async function importTheme(file: File) {
    setImportStatus('idle');
    try {
      if (file.size > THEME_YAML_MAX_BYTES) throw new Error('Theme-Datei ist zu groß.');
      const colors = parseThemeYaml(await file.text());
      setSettings((current) => ({ ...current, colors }));
      setStatus('idle');
      setImportStatus('success');
    } catch {
      setImportStatus('error');
    }
  }

  async function save() {
    if (!validColors) return;
    setStatus('saving');
    const response = await fetch(`/api/admin/tenants/${tenantId}/design`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(settings),
    });
    if (!response.ok) {
      setStatus('error');
      return;
    }
    setSettings(await response.json());
    setStatus('saved');
  }

  async function uploadHeader(file: File) {
    setUploading(true);
    const data = new FormData();
    data.append('file', file);
    const response = await fetch(`/api/admin/tenants/${tenantId}/assets`, { method: 'POST', body: data });
    setUploading(false);
    if (!response.ok) {
      setStatus('error');
      return;
    }
    const asset = (await response.json()) as UploadedAsset;
    setSettings((current) => ({
      ...current,
      headerVariants: [
        ...current.headerVariants,
        {
          id: nanoid(),
          name: asset.originalFilename.replace(/\.[^.]+$/, '') || 'Header',
          imageUrl: asset.publicUrl,
          alt: 'Newsletter Header',
          roundedCorners: false,
        },
      ],
    }));
    setStatus('idle');
  }

  return (
    <section className="rounded-xl bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">{t('admin.designTitle')}</h2>
          <p className="mt-1 max-w-3xl text-sm text-slate-600">{t('admin.designIntro')}</p>
        </div>
        <button
          type="button"
          className="rounded bg-blue-700 px-4 py-2 text-white disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!validColors || status === 'saving'}
          onClick={() => void save()}
        >
          {status === 'saving' ? t('save.saving') : t('admin.saveDesign')}
        </button>
      </div>

      {status === 'saved' ? <p className="mt-4 text-sm text-green-700">{t('admin.designSaved')}</p> : null}
      {status === 'error' ? <p className="mt-4 text-sm text-red-700">{t('admin.designFailed')}</p> : null}
      {!validColors ? <p className="mt-4 text-sm text-red-700">{t('admin.invalidColor')}</p> : null}

      <div className="mt-8 border-t pt-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold">{t('admin.colorsTitle')}</h3>
            <p className="mt-1 max-w-3xl text-sm text-slate-600">{t('admin.colorsIntro')}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded border px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!validColors}
              onClick={exportTheme}
            >
              {t('admin.exportTheme')}
            </button>
            <label className="cursor-pointer rounded border px-3 py-2 text-sm">
              {t('admin.importTheme')}
              <input
                className="sr-only"
                type="file"
                accept=".yaml,.yml,application/yaml,text/yaml"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void importTheme(file);
                  event.target.value = '';
                }}
              />
            </label>
          </div>
        </div>
        {importStatus === 'success' ? <p className="mt-3 text-sm text-green-700">{t('admin.themeImported')}</p> : null}
        {importStatus === 'error' ? <p className="mt-3 text-sm text-red-700">{t('admin.themeImportInvalid')}</p> : null}
        <div className="mt-4 overflow-x-auto rounded-lg border">
          <table className="w-full min-w-2xl border-collapse text-left">
            <thead className="bg-slate-50 text-sm text-slate-700">
              <tr>
                <th scope="col" className="w-1/4 px-4 py-3 font-semibold">
                  {t('admin.colorRole')}
                </th>
                <th scope="col" className="px-4 py-3 font-semibold">
                  {t('admin.lightMode')}
                </th>
                <th scope="col" className="px-4 py-3 font-semibold">
                  {t('admin.darkMode')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {newsletterThemeColorTokens.map((token) => (
                <tr key={token}>
                  <th scope="row" className="px-4 py-3 text-sm font-medium text-slate-800">
                    {colorLabels[token]}
                  </th>
                  {(['light', 'dark'] as const).map((mode) => (
                    <td key={mode} className="px-4 py-3">
                      <label className="flex items-center gap-2">
                        <span className="sr-only">
                          {colorLabels[token]} – {mode === 'light' ? t('admin.lightMode') : t('admin.darkMode')}
                        </span>
                        <input
                          type="color"
                          className="h-10 w-12 rounded border bg-white p-1"
                          value={
                            /^#[0-9a-fA-F]{6}$/.test(settings.colors[mode][token])
                              ? settings.colors[mode][token]
                              : '#000000'
                          }
                          onChange={(event) => updateColor(mode, token, event.target.value)}
                        />
                        <input
                          className="min-w-0 flex-1 rounded border p-2 font-mono"
                          value={settings.colors[mode][token]}
                          maxLength={7}
                          onChange={(event) => updateColor(mode, token, event.target.value)}
                        />
                      </label>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <ThemePreview colors={settings.colors} />
      </div>

      <div className="mt-8 border-t pt-6">
        <h3 className="text-lg font-semibold">{t('admin.headerDefaults')}</h3>
        <p className="mt-1 text-sm text-slate-600">{t('admin.headerDefaultsIntro')}</p>
        <label className="mt-4 inline-flex cursor-pointer rounded bg-blue-700 px-4 py-2 text-white">
          {uploading ? t('save.saving') : t('admin.uploadHeader')}
          <input
            className="sr-only"
            type="file"
            accept="image/jpeg,image/png,image/gif"
            disabled={uploading}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void uploadHeader(file);
            }}
          />
        </label>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {settings.headerVariants.map((variant) => {
            const used = usedHeaderVariantIds.includes(variant.id);
            return (
              <article key={variant.id} className="rounded-lg border p-4">
                <img
                  src={variant.imageUrl}
                  alt={variant.alt}
                  className="h-28 w-full object-contain"
                  style={{ borderRadius: variant.roundedCorners ? ROUNDED_HEADER_IMAGE_RADIUS_PX : 0 }}
                />
                <label className="mt-3 block text-sm font-medium">
                  {t('misc.name')}
                  <input
                    className="mt-1 w-full rounded border p-2"
                    value={variant.name}
                    onChange={(event) => {
                      setSettings((current) => ({
                        ...current,
                        headerVariants: current.headerVariants.map((item) =>
                          item.id === variant.id ? { ...item, name: event.target.value } : item,
                        ),
                      }));
                      setStatus('idle');
                    }}
                  />
                </label>
                <label className="mt-3 block text-sm font-medium">
                  {t('image.alt')}
                  <input
                    className="mt-1 w-full rounded border p-2"
                    value={variant.alt}
                    onChange={(event) => {
                      setSettings((current) => ({
                        ...current,
                        headerVariants: current.headerVariants.map((item) =>
                          item.id === variant.id ? { ...item, alt: event.target.value } : item,
                        ),
                      }));
                      setStatus('idle');
                    }}
                  />
                </label>
                <label className="mt-3 flex items-center gap-2 text-sm font-medium">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300"
                    checked={variant.roundedCorners}
                    onChange={(event) => {
                      setSettings((current) => ({
                        ...current,
                        headerVariants: current.headerVariants.map((item) =>
                          item.id === variant.id ? { ...item, roundedCorners: event.target.checked } : item,
                        ),
                      }));
                      setStatus('idle');
                    }}
                  />
                  {t('misc.roundHeaderImage')}
                </label>
                <button
                  type="button"
                  className="mt-3 rounded border px-3 py-2 text-sm text-red-700 disabled:text-slate-400"
                  disabled={used}
                  title={used ? t('admin.headerInUse') : t('admin.deleteHeader')}
                  onClick={() => {
                    setSettings((current) => ({
                      ...current,
                      headerVariants: current.headerVariants.filter((item) => item.id !== variant.id),
                    }));
                    setStatus('idle');
                  }}
                >
                  {used ? t('admin.headerInUse') : t('admin.deleteHeader')}
                </button>
              </article>
            );
          })}
        </div>
      </div>

      <div className="mt-8 border-t pt-6">
        <h3 className="text-lg font-semibold">{t('admin.footerDefault')}</h3>
        <p className="mb-4 mt-1 text-sm text-slate-600">{t('admin.footerDefaultIntro')}</p>
        <FooterEditor
          value={settings.footerRichText}
          onChange={(footerRichText) => {
            setSettings((current) => ({ ...current, footerRichText }));
            setStatus('idle');
          }}
        />
      </div>
    </section>
  );
}
