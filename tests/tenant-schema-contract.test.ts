// @vitest-environment node

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('tenant schema contract', () => {
  const schema = readFileSync(path.join(process.cwd(), 'lib/db/schema.ts'), 'utf8');
  const templates = readFileSync(path.join(process.cwd(), 'lib/newsletter/template-files.ts'), 'utf8');
  const adminOperations = readFileSync(path.join(process.cwd(), 'lib/admin/operations.ts'), 'utf8');

  it('requires tenant IDs on every business-data table', () => {
    for (const table of ['newsletters', 'assets', 'appSettings']) {
      const section = schema.slice(schema.indexOf(`export const ${table}`), schema.indexOf(');', schema.indexOf(`export const ${table}`)) + 2);
      expect(section).toContain("text('tenant_id')");
      expect(section).toContain('.notNull()');
      expect(section).not.toContain("text('owner_id')");
    }
  });

  it('enforces one tenant per member and at most one platform administrator', () => {
    expect(schema).toContain('users_membership_check');
    expect(schema).toContain('users_single_platform_admin_idx');
  });

  it('seeds exactly one idempotent template copy per tenant', () => {
    expect(schema).toContain('newsletters_tenant_seed_idx');
    expect(templates).toContain('.onConflictDoNothing({ target: [newsletters.tenantId, newsletters.seedKey] })');
  });

  it('account status changes never delete newsletters', () => {
    const operation = adminOperations.slice(adminOperations.indexOf('export async function setAccountStatus'));
    expect(operation).not.toContain('delete(newsletters)');
    expect(schema).not.toMatch(/newsletters[\s\S]{0,500}references\(\(\) => users\.id\)/);
  });
});
