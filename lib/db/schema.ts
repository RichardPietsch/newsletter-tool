import { sql } from 'drizzle-orm';
import { check, index, integer, jsonb, pgTable, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';
import type { PersistedGlobalSettings } from '@/lib/settings/schema';

export type TenantStatus = 'active' | 'inactive';
export type UserRole = 'platform_admin' | 'tenant_member';
export type UserStatus = 'active' | 'inactive';
export type AuditSeverity = 'info' | 'warning' | 'error';
export type AuditOutcome = 'succeeded' | 'failed' | 'blocked';
export type BootstrapSource = 'cli' | 'environment';

export const tenants = pgTable(
  'tenants',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    status: text('status').$type<TenantStatus>().default('active').notNull(),
    adminNotes: text('admin_notes'),
    lastActivityAt: timestamp('last_activity_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    statusCheck: check('tenants_status_check', sql`${table.status} in ('active', 'inactive')`),
    nameCheck: check('tenants_name_check', sql`length(btrim(${table.name})) > 0`),
    statusIdx: index('tenants_status_idx').on(table.status),
    activityIdx: index('tenants_activity_idx').on(table.lastActivityAt),
  }),
);

export const users = pgTable(
  'users',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id').references(() => tenants.id),
    role: text('role').$type<UserRole>().default('tenant_member').notNull(),
    status: text('status').$type<UserStatus>().default('active').notNull(),
    email: text('email').notNull().unique(),
    name: text('name'),
    emailVerifiedAt: timestamp('email_verified_at'),
    lastLoginAt: timestamp('last_login_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    roleCheck: check('users_role_check', sql`${table.role} in ('platform_admin', 'tenant_member')`),
    statusCheck: check('users_status_check', sql`${table.status} in ('active', 'inactive')`),
    membershipCheck: check(
      'users_membership_check',
      sql`(${table.role} = 'platform_admin' and ${table.tenantId} is null) or (${table.role} = 'tenant_member' and ${table.tenantId} is not null)`,
    ),
    normalizedEmailCheck: check('users_normalized_email_check', sql`${table.email} = lower(btrim(${table.email}))`),
    oneAdminIdx: uniqueIndex('users_single_platform_admin_idx')
      .on(table.role)
      .where(sql`${table.role} = 'platform_admin'`),
    normalizedEmailIdx: uniqueIndex('users_email_lower_idx').on(sql`lower(${table.email})`),
    tenantStatusIdx: index('users_tenant_status_idx').on(table.tenantId, table.status),
    tenantLoginIdx: index('users_tenant_login_idx').on(table.tenantId, table.lastLoginAt),
  }),
);

export const installationState = pgTable(
  'installation_state',
  {
    id: text('id').primaryKey(),
    initialAdminUserId: text('initial_admin_user_id')
      .references(() => users.id)
      .notNull(),
    bootstrapSource: text('bootstrap_source').$type<BootstrapSource>().notNull(),
    bootstrapCompletedAt: timestamp('bootstrap_completed_at').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    singletonCheck: check('installation_state_singleton_check', sql`${table.id} = 'primary'`),
    sourceCheck: check('installation_state_source_check', sql`${table.bootstrapSource} in ('cli', 'environment')`),
    adminIdx: uniqueIndex('installation_state_initial_admin_idx').on(table.initialAdminUserId),
  }),
);

export const newsletters = pgTable(
  'newsletters',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id')
      .references(() => tenants.id)
      .notNull(),
    title: text('title').notNull(),
    document: jsonb('document').notNull(),
    seedKey: text('seed_key'),
    sentAt: timestamp('sent_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    tenantUpdatedIdx: index('newsletters_tenant_updated_idx').on(table.tenantId, table.updatedAt),
    tenantSeedIdx: uniqueIndex('newsletters_tenant_seed_idx').on(table.tenantId, table.seedKey),
  }),
);

export const assets = pgTable(
  'assets',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id')
      .references(() => tenants.id)
      .notNull(),
    storageKey: text('storage_key').notNull(),
    publicUrl: text('public_url').notNull(),
    originalFilename: text('original_filename').notNull(),
    title: text('title'),
    altText: text('alt_text'),
    mimeType: text('mime_type').notNull(),
    width: integer('width').notNull(),
    height: integer('height').notNull(),
    sizeBytes: integer('size_bytes').notNull(),
    seedKey: text('seed_key'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    tenantCreatedIdx: index('assets_tenant_created_idx').on(table.tenantId, table.createdAt),
    tenantStorageIdx: uniqueIndex('assets_tenant_storage_idx').on(table.tenantId, table.storageKey),
    tenantSeedIdx: uniqueIndex('assets_tenant_seed_idx').on(table.tenantId, table.seedKey),
  }),
);

export const events = pgTable(
  'events',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id')
      .references(() => tenants.id)
      .notNull(),
    category: text('category'),
    title: text('title').notNull(),
    speakerName: text('speaker_name'),
    speakerRole: text('speaker_role'),
    date: text('date'),
    location: text('location'),
    description: text('description'),
    buttonLabel: text('button_label'),
    buttonUrl: text('button_url'),
    image: jsonb('image').$type<{
      assetId?: string;
      src?: string;
      alt?: string;
      decorative?: boolean;
    }>(),
    externalSource: text('external_source'),
    externalId: text('external_id'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    tenantUpdatedIdx: index('events_tenant_updated_idx').on(table.tenantId, table.updatedAt),
    tenantExternalIdx: uniqueIndex('events_tenant_external_idx').on(
      table.tenantId,
      table.externalSource,
      table.externalId,
    ),
  }),
);

export const appSettings = pgTable(
  'app_settings',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id')
      .references(() => tenants.id)
      .notNull(),
    settings: jsonb('settings').$type<PersistedGlobalSettings>().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({ tenantIdx: uniqueIndex('app_settings_tenant_idx').on(table.tenantId) }),
);

export const authMagicLinks = pgTable(
  'auth_magic_links',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .references(() => users.id)
      .notNull(),
    email: text('email').notNull(),
    tokenHash: text('token_hash').notNull().unique(),
    expiresAt: timestamp('expires_at').notNull(),
    consumedAt: timestamp('consumed_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    requestedIp: text('requested_ip'),
    userAgent: text('user_agent'),
  },
  (table) => ({
    emailIdx: index('magic_links_email_idx').on(table.email),
    createdIdx: index('magic_links_created_idx').on(table.createdAt),
    expiresIdx: index('magic_links_expires_idx').on(table.expiresAt),
  }),
);

export const sessions = pgTable(
  'sessions',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .references(() => users.id)
      .notNull(),
    sessionTokenHash: text('session_token_hash').notNull().unique(),
    expiresAt: timestamp('expires_at').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    lastSeenAt: timestamp('last_seen_at').defaultNow().notNull(),
    revokedAt: timestamp('revoked_at'),
    supportTenantId: text('support_tenant_id').references(() => tenants.id),
    supportStartedAt: timestamp('support_started_at'),
    userAgent: text('user_agent'),
    ipAddress: text('ip_address'),
  },
  (table) => ({
    userIdx: index('sessions_user_idx').on(table.userId),
    expiresIdx: index('sessions_expires_idx').on(table.expiresAt),
    supportIdx: index('sessions_support_tenant_idx').on(table.supportTenantId),
  }),
);

export const auditEvents = pgTable(
  'audit_events',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id').references(() => tenants.id),
    actorUserId: text('actor_user_id').references(() => users.id),
    eventType: text('event_type').notNull(),
    severity: text('severity').$type<AuditSeverity>().default('info').notNull(),
    outcome: text('outcome').$type<AuditOutcome>().default('succeeded').notNull(),
    summary: text('summary').notNull(),
    correlationId: text('correlation_id').notNull(),
    entityType: text('entity_type'),
    entityId: text('entity_id'),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    severityCheck: check('audit_events_severity_check', sql`${table.severity} in ('info', 'warning', 'error')`),
    outcomeCheck: check('audit_events_outcome_check', sql`${table.outcome} in ('succeeded', 'failed', 'blocked')`),
    summarySizeCheck: check('audit_events_summary_size_check', sql`length(${table.summary}) <= 240`),
    metadataSizeCheck: check('audit_events_metadata_size_check', sql`octet_length(${table.metadata}::text) <= 4096`),
    tenantCreatedIdx: index('audit_events_tenant_created_idx').on(table.tenantId, table.createdAt),
    tenantTypeCreatedIdx: index('audit_events_tenant_type_created_idx').on(
      table.tenantId,
      table.eventType,
      table.createdAt,
    ),
    severityCreatedIdx: index('audit_events_severity_created_idx').on(table.severity, table.createdAt),
    actorCreatedIdx: index('audit_events_actor_created_idx').on(table.actorUserId, table.createdAt),
    correlationIdx: index('audit_events_correlation_idx').on(table.correlationId),
  }),
);

export const authRateLimits = pgTable(
  'auth_rate_limits',
  {
    id: text('id').primaryKey(),
    scope: text('scope').notNull(),
    keyHash: text('key_hash').notNull(),
    windowStartedAt: timestamp('window_started_at').notNull(),
    count: integer('count').default(1).notNull(),
    expiresAt: timestamp('expires_at').notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    windowIdx: uniqueIndex('auth_rate_limits_window_idx').on(table.scope, table.keyHash, table.windowStartedAt),
    expiresIdx: index('auth_rate_limits_expires_idx').on(table.expiresAt),
  }),
);
