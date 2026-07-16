import type { Dispatch, SetStateAction } from 'react';

export type AccountInfo = {
  email: string;
  lastLoginAt: string | null;
};

export type EditorOverlay = 'media' | 'settings' | 'account' | 'newsletter' | 'export' | null;
export type SetEditorOverlay = Dispatch<SetStateAction<EditorOverlay>>;
