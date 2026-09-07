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
    expect(result.stderr).toMatch(/first\.tsx:\d+:\d+: Editor wird geladen …/);
    expect(result.stderr).toMatch(/second\.tsx:\d+:\d+: Zweiter Fehler/);
  });

  it('accepts UI copy referenced through the dictionary', () => {
    const fixture = createFixture({
      'text-rich-editor.tsx': "export const Loading = () => <p>{t('editor.textLoading')}</p>;",
    });

    expect(() => execFileSync(process.execPath, [checker, fixture])).not.toThrow();
  });

  it('rejects API error responses without a structured error code', () => {
    const fixture = createFixture({
      'route.ts':
        "export const GET = () => NextResponse.json({ error: 'Newsletter nicht gefunden' }, { status: 404 });",
    });

    const result = spawnSync(process.execPath, [checker, fixture], { encoding: 'utf8' });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Dezentral gepflegte Interface-Texte gefunden');
    expect(result.stderr).toMatch(/route\.ts:\d+:\d+: Newsletter nicht gefunden/);
  });

  it('catches single-word JSX labels and copy in conditional expressions', () => {
    const fixture = createFixture({
      'filters.tsx':
        "export const Filters = ({ loading }: { loading: boolean }) => <><button>{loading ? 'Laden' : 'Filtern'}</button><option>info</option><p>Event-Register wird geladen</p></>;",
    });

    const result = spawnSync(process.execPath, [checker, fixture], { encoding: 'utf8' });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Laden');
    expect(result.stderr).toContain('Filtern');
    expect(result.stderr).toContain('info');
    expect(result.stderr).toContain('Event-Register wird geladen');
  });

  it('catches copy stored indirectly in arrays', () => {
    const fixture = createFixture({
      'module-picker.tsx':
        "const cards = [['image', 'Bild', 'Inhaltliches Bild']]; export const Picker = () => cards.map(String);",
    });

    const result = spawnSync(process.execPath, [checker, fixture], { encoding: 'utf8' });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Bild');
    expect(result.stderr).toContain('Inhaltliches Bild');
  });

  it('allows technical identifiers, routes, styles and keyboard values', () => {
    const fixture = createFixture({
      'technical.tsx': `
        const route = '/api/newsletters';
        const storageKey = \`newsletter:onboarding:completed:\${route}\`;
        function fieldStateClass(invalid: boolean) {
          return invalid ? 'border-red-500 outline outline-2 outline-red-500' : '';
        }
        export const Button = () => (
          <button className="rounded-md px-2" data-testid="save" onKeyDown={(event) => event.key === 'Escape'}>
            {t('admin.save')}
          </button>
        );
      `,
    });

    expect(() => execFileSync(process.execPath, [checker, fixture])).not.toThrow();
  });
});
