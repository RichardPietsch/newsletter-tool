// @vitest-environment node

import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

function routeFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const resolved = path.join(directory, entry.name);
    return entry.isDirectory() ? routeFiles(resolved) : entry.name === 'route.ts' ? [resolved] : [];
  });
}

describe('mutating route inventory', () => {
  it('routes every API mutation through a support-aware server guard', () => {
    const appDirectory = path.join(process.cwd(), 'app');
    const unguarded = routeFiles(appDirectory).filter((file) => {
      const source = readFileSync(file, 'utf8');
      if (!/export async function (POST|PUT|PATCH|DELETE)/.test(source)) return false;
      return ![
        'requireTenantApiContext',
        'requireAdminApiContext',
        'blockSupportMutationIfActive',
      ].some((guard) => source.includes(guard));
    });
    expect(unguarded).toEqual([]);
  });
});
