'use client';

import { t } from '@/lib/i18n';
import type { NewsletterSaveIssue } from '@/lib/newsletter/save-validation';
import type { NewsletterPreviewMode } from '@/lib/newsletter/module-styles';
import { SaveStatus } from './save-status';
import { UndoRedoControls } from './undo-redo-controls';

export function EditorTopBar({
  title,
  isReadOnly,
  saveIssues,
  previewMode,
  onPreviewModeChange,
  onTitleChange,
}: {
  title: string;
  isReadOnly: boolean;
  saveIssues: NewsletterSaveIssue[];
  previewMode: NewsletterPreviewMode;
  onPreviewModeChange: (mode: NewsletterPreviewMode) => void;
  onTitleChange: (title: string) => void;
}) {
  return (
    <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white p-4">
      <div className="min-w-0 flex-1 pr-6">
        <input
          aria-label={t('editor.titleLabel')}
          className={`w-[min(42rem,55vw)] max-w-full overflow-hidden text-ellipsis whitespace-nowrap bg-transparent pr-10 text-xl font-bold [mask-image:linear-gradient(to_right,#000_calc(100%-2.5rem),transparent)] focus:[mask-image:none] disabled:bg-transparent disabled:text-slate-700 ${saveIssues.some((issue) => issue.fieldKey === 'document.title') ? 'rounded outline outline-2 outline-red-500' : ''}`}
          value={title}
          disabled={isReadOnly}
          onChange={(event) => onTitleChange(event.target.value)}
        />
        {isReadOnly ? <p className="mt-1 text-sm text-green-700">{t('editor.sentReadonly')}</p> : null}
      </div>
      <div className="flex items-center gap-4">
        <button
          type="button"
          role="switch"
          aria-checked={previewMode === 'dark'}
          aria-label={t('editor.darkModePreview')}
          title={t('editor.darkModePreview')}
          className="flex items-center gap-2 rounded-full border border-slate-300 bg-slate-100 p-1 text-slate-700 shadow-inner"
          onClick={() => onPreviewModeChange(previewMode === 'light' ? 'dark' : 'light')}
        >
          <span
            aria-hidden="true"
            className={`flex h-7 w-7 items-center justify-center rounded-full transition-colors ${previewMode === 'light' ? 'bg-white text-amber-500 shadow' : 'text-slate-400'}`}
          >
            ☀
          </span>
          <span
            aria-hidden="true"
            className={`flex h-7 w-7 items-center justify-center rounded-full transition-colors ${previewMode === 'dark' ? 'bg-slate-800 text-indigo-200 shadow' : 'text-slate-400'}`}
          >
            ☾
          </span>
        </button>
        <UndoRedoControls disabled={isReadOnly} />
        <SaveStatus issues={saveIssues} />
      </div>
    </div>
  );
}
