// @vitest-environment node

import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (file: string) => readFileSync(path.join(root, file), 'utf8');

describe('production deployment safety contract', () => {
  const infrastructureCompose = read('docker-compose.infra.yml');
  const applicationCompose = read('docker-compose.prod.yml');
  const dockerfile = read('Dockerfile');
  const productionCommon = read('scripts/_production-common.sh');
  const initScript = read('scripts/init-production-infrastructure.sh');
  const backupScript = read('scripts/backup-production.sh');
  const deployScript = read('scripts/deploy-production.sh');
  const restoreScript = read('scripts/restore-production.sh');
  const startScript = read('scripts/start-production.sh');
  const stopScript = read('scripts/stop-production.sh');
  const auditCleanupScript = read('scripts/run-audit-cleanup.sh');

  it('keeps persistent services and volumes outside the application stack', () => {
    expect(infrastructureCompose).toContain('db:');
    expect(infrastructureCompose).toContain('minio:');
    expect(infrastructureCompose.match(/external: true/g)).toHaveLength(3);
    expect(infrastructureCompose).toContain("name: '${POSTGRES_DATA_VOLUME:");
    expect(infrastructureCompose).toContain("name: '${MINIO_DATA_VOLUME:");
    expect(applicationCompose).not.toMatch(/^\s{2}(db|minio):/m);
    expect(applicationCompose).not.toContain('/var/lib/postgresql/data');
    expect(applicationCompose).not.toContain('minio-data:/data');
  });

  it('never creates missing production data volumes implicitly', () => {
    expect(initScript).toContain('--create-empty-data-volumes');
    expect(initScript).toContain('if [[ "$create_empty_volumes" != true ]]');
    expect(initScript).toContain('docker volume inspect');
    expect(productionCommon).toContain('Backup directory does not exist');
    expect(productionCommon).not.toContain('mkdir -p -- "$requested_root"');
  });

  it('validates recovery prerequisites before overwriting the database', () => {
    expect(startScript).toContain('validate_production_image "$app_image"');
    const imageValidationPosition = restoreScript.indexOf('validate_production_image');
    const safetyBackupPosition = restoreScript.indexOf('backup-production.sh');
    const stopPosition = restoreScript.indexOf('stop --timeout 30 web audit-cleanup');
    const restorePosition = restoreScript.indexOf('pg_restore --clean');
    expect(imageValidationPosition).toBeGreaterThan(-1);
    expect(safetyBackupPosition).toBeGreaterThan(imageValidationPosition);
    expect(stopPosition).toBeGreaterThan(safetyBackupPosition);
    expect(restorePosition).toBeGreaterThan(stopPosition);
  });

  it('requires a validated database and asset backup before deployment', () => {
    expect(backupScript).toContain('pg_dump --format=custom');
    expect(backupScript).toContain('pg_restore --list');
    expect(backupScript).toContain('mc mirror --overwrite');
    expect(backupScript).toContain('checksum_verify');

    const backupPosition = deployScript.indexOf('backup-production.sh');
    expect(productionCommon).toContain('test -f /app/.next/BUILD_ID');
    const imageValidationPosition = deployScript.indexOf('validate_production_image');
    const migrationPosition = deployScript.indexOf('run --rm --no-deps migrate');
    const rolloutPosition = deployScript.indexOf("info 'Replacing only the stateless application containers'");
    expect(backupPosition).toBeGreaterThan(-1);
    expect(imageValidationPosition).toBeGreaterThan(backupPosition);
    expect(migrationPosition).toBeGreaterThan(imageValidationPosition);
    expect(rolloutPosition).toBeGreaterThan(migrationPosition);
  });

  it('embeds the deployed Git revision in locally built production images', () => {
    expect(applicationCompose).toContain("APP_BUILD_SHA: '${APP_BUILD_SHA:-unknown}'");
    expect(dockerfile).toContain('ARG APP_BUILD_SHA=unknown');
    expect(dockerfile).toContain('org.opencontainers.image.revision=$APP_BUILD_SHA');
    expect(deployScript).toContain('--build-arg "APP_BUILD_SHA=$git_revision"');
  });

  it('stops services without deleting containers or volumes', () => {
    expect(stopScript).toContain('stop --timeout 30 web audit-cleanup');
    expect(stopScript).toContain('stop --timeout 60 minio');
    expect(stopScript).toContain('stop --timeout 60 db');
    expect(stopScript).not.toMatch(/compose[^\n]*(down|prune)/);
    expect(stopScript).not.toContain('docker volume rm');
    expect(auditCleanupScript).toContain('trap terminate TERM INT');
    expect(applicationCompose).not.toMatch(/command:\s+(pnpm|sh -c)/);
  });

  it('keeps post-baseline database migrations non-destructive by default', () => {
    const migrationFiles = readdirSync(path.join(root, 'drizzle'))
      .filter((file) => /^\d+.*\.sql$/.test(file) && !file.startsWith('0000_'))
      .map((file) => ({ file, sql: read(`drizzle/${file}`) }));

    for (const migration of migrationFiles) {
      expect(migration.sql, migration.file).not.toMatch(/\b(DROP\s+(TABLE|COLUMN)|TRUNCATE|DELETE\s+FROM)\b/i);
    }
  });
});
