import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'fs';
import path from 'path';
import { publicAppUrl } from '@/lib/app-url';

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const filename = path.join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(filename);
    return /\.[cm]?[jt]sx?$/.test(entry.name) ? [filename] : [];
  });
}

describe('public application URLs', () => {
  it('uses the configured public URL instead of an internal request host', () => {
    expect(publicAppUrl('/auth/magic-link/confirm', 'https://newsletter.example.com').toString()).toBe(
      'https://newsletter.example.com/auth/magic-link/confirm',
    );
  });

  it('does not build redirects from the reverse proxy request URL', () => {
    const applicationSource = sourceFiles(path.join(process.cwd(), 'app'))
      .map((filename) => readFileSync(filename, 'utf8'))
      .join('\n');

    expect(applicationSource).not.toMatch(/new URL\([^)]*,\s*request\.url\)/);
    expect(applicationSource).not.toMatch(/Location[^\n]*request\.url/);
  });
});
