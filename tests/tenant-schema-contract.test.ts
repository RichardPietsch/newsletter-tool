// @vitest-environment node

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('tenant schema contract', () => {
  const schema = readFileSync(path.join(process.cwd(), 'lib/db/schema.ts'), 'utf8');
  const templates = readFileSync(path.join(process.cwd(), 'lib/newsletter/template-files.ts'), 'utf8');
  const adminOperations = readFileSync(path.join(process.cwd(), 'lib/admin/operations.ts'), 'utf8');
  const developmentSeed = readFileSync(path.join(process.cwd(), 'drizzle/seed.ts'), 'utf8');
  const bootstrap = readFileSync(path.join(process.cwd(), 'lib/admin/bootstrap.ts'), 'utf8');
  const settingsDefaults = readFileSync(path.join(process.cwd(), 'lib/settings/defaults.ts'), 'utf8');
  const productionCompose = readFileSync(path.join(process.cwd(), 'docker-compose.prod.yml'), 'utf8');
  const deploymentScript = readFileSync(path.join(process.cwd(), 'scripts/deploy-production.sh'), 'utf8');

  it('requires tenant IDs on every business-data table', () => {
    for (const table of ['newsletters', 'assets', 'events', 'appSettings']) {
      const section = schema.slice(
        schema.indexOf(`export const ${table}`),
        schema.indexOf(');', schema.indexOf(`export const ${table}`)) + 2,
      );
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

  it('persists complete design defaults when a tenant is created', () => {
    expect(adminOperations).toContain('tx.insert(appSettings)');
    expect(adminOperations).toContain('createDefaultSettings()');
    expect(settingsDefaults).toContain('colors:');
    expect(settingsDefaults).toContain('headerVariants: createDefaultHeaderVariants()');
    expect(settingsDefaults).toContain('footerRichText: defaultFooterRichText');
  });

  it('account status changes never delete newsletters', () => {
    const operation = adminOperations.slice(adminOperations.indexOf('export async function setAccountStatus'));
    expect(operation).not.toContain('delete(newsletters)');
    expect(schema).not.toMatch(/newsletters[\s\S]{0,500}references\(\(\) => users\.id\)/);
  });

  it('creates a local-only, idempotent platform administrator with a configurable email', () => {
    expect(developmentSeed).toContain('if (serverEnv.isProduction) throw new Error');
    expect(developmentSeed).toContain("process.env.DEV_ADMIN_EMAIL || 'admin@example.test'");
    expect(developmentSeed).toContain("role: 'platform_admin'");
    expect(developmentSeed).toContain('.onConflictDoNothing()');
  });

  it('persists and serializes the one-time production administrator bootstrap', () => {
    expect(schema).toContain("'installation_state'");
    expect(schema).toContain('installation_state_singleton_check');
    expect(bootstrap).toContain('pg_advisory_xact_lock');
    expect(bootstrap).toContain("eventType: 'system.bootstrap_admin_initialized'");
    expect(productionCompose).toContain('bootstrap-admin:');
    expect(deploymentScript).toContain('run --rm --no-deps bootstrap-admin');
  });
});
