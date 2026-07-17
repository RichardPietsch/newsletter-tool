import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const fixtures: string[] = [];
const checker = path.resolve('scripts/check-ui-copy.mjs');

function createFixture(files: Record<string, string>) {
  const directory = mkdtempSync(path.join(tmpdir(), 'newsletter-ui-copy-'));
  fixtures.push(directory);

  for (const [name, source] of Object.entries(files)) {
    writeFileSync(path.join(directory, name), source);
  }

  return directory;
}

afterEach(() => {
  for (const fixture of fixtures.splice(0)) rmSync(fixture, { recursive: true, force: true });
});

describe('UI copy checker', () => {
  it('reports every decentralized UI text before exiting', () => {
    const fixture = createFixture({
      'first.tsx': 'export const First = () => <p>Editor wird geladen …</p>;',
      'second.tsx': 'export const Second = () => <button title="Zweiter Fehler">OK</button>;',
    });

    const result = spawnSync(process.execPath, [checker, fixture], { encoding: 'utf8' });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('first.tsx: Editor wird geladen …');
    expect(result.stderr).toContain('second.tsx: Zweiter Fehler');
  });

  it('accepts UI copy referenced through the dictionary', () => {
    const fixture = createFixture({
      'text-rich-editor.tsx': "export const Loading = () => <p>{t('editor.textLoading')}</p>;",
    });

    expect(() => execFileSync(process.execPath, [checker, fixture])).not.toThrow();
  });
});
