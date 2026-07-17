'use client';

import { t } from '@/lib/i18n';
import type { NewsletterSaveIssue } from '@/lib/newsletter/save-validation';
import { SaveStatus } from './save-status';
import { UndoRedoControls } from './undo-redo-controls';

export function EditorTopBar({
  title,
  isReadOnly,
  saveIssues,
  onTitleChange,
}: {
  title: string;
  isReadOnly: boolean;
  saveIssues: NewsletterSaveIssue[];
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
        <UndoRedoControls disabled={isReadOnly} />
        <SaveStatus issues={saveIssues} />
      </div>
    </div>
  );
}
