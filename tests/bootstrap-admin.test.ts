// @vitest-environment node

import { describe, expect, it } from 'vitest';
import { decideInitialAdminBootstrap } from '@/lib/admin/bootstrap';

const activeAdmin = { id: 'admin-1', email: 'owner@example.test', status: 'active' as const };

describe('initial administrator bootstrap decision', () => {
  it('creates the administrator only for an uninitialized installation without an admin', () => {
    expect(decideInitialAdminBootstrap('owner@example.test', null, null)).toEqual({ kind: 'create' });
  });

  it('registers a matching administrator from an installation created before state tracking', () => {
    expect(decideInitialAdminBootstrap('owner@example.test', null, activeAdmin)).toEqual({
      kind: 'register',
      admin: activeAdmin,
    });
  });

  it('is an idempotent no-op after initialization and does not reactivate an inactive admin', () => {
    const inactiveAdmin = { ...activeAdmin, status: 'inactive' as const };
    expect(
      decideInitialAdminBootstrap('owner@example.test', { initialAdminUserId: activeAdmin.id }, inactiveAdmin),
    ).toEqual({ kind: 'already_initialized', admin: inactiveAdmin });
  });

  it('rejects a changed environment email after initialization', () => {
    expect(() =>
      decideInitialAdminBootstrap('attacker@example.test', { initialAdminUserId: activeAdmin.id }, activeAdmin),
    ).toThrow(/Changing BOOTSTRAP_ADMIN_EMAIL never changes privileges/);
  });

  it('rejects a different existing administrator instead of replacing it', () => {
    expect(() => decideInitialAdminBootstrap('other@example.test', null, activeAdmin)).toThrow(
      /already exists with a different email/,
    );
  });

  it('rejects inconsistent persisted installation state', () => {
    expect(() =>
      decideInitialAdminBootstrap('owner@example.test', { initialAdminUserId: 'missing-admin' }, activeAdmin),
    ).toThrow(/does not match/);
  });
});
