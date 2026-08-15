// @vitest-environment node

import { describe, expect, it, vi } from 'vitest';
import { enforceAdminApiContext, enforceTenantApiContext } from '@/lib/auth/current-user';
import { isSessionPrincipalActive, type AuthContext } from '@/lib/auth/session';

function context(mode: AuthContext['mode'], tenantStatus: 'active' | 'inactive' = 'active'): AuthContext {
  return {
    mode,
    sessionId: 'session-1',
    user: {
      id: mode === 'member' ? 'member-1' : 'admin-1',
      tenantId: mode === 'member' ? 'tenant-1' : null,
      role: mode === 'member' ? 'tenant_member' : 'platform_admin',
      status: 'active',
      email: 'user@example.test',
      name: 'User',
      emailVerifiedAt: null,
      lastLoginAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    tenant:
      mode === 'admin'
        ? null
        : {
            id: 'tenant-1',
            name: 'Tenant One',
            status: tenantStatus,
            adminNotes: null,
            lastActivityAt: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
  };
}

describe('tenant authorization', () => {
  it('allows members and support admins to read the server-derived tenant', async () => {
    const member = await enforceTenantApiContext(context('member'));
    const support = await enforceTenantApiContext(context('support'));
    expect(member.context?.tenant.id).toBe('tenant-1');
    expect(support.context?.tenant.id).toBe('tenant-1');
  });

  it('blocks and audits support-mode writes server-side', async () => {
    const recorder = vi.fn(async () => true);
    const request = new Request('https://newsletter.example.test/api/newsletters/foreign', { method: 'PUT' });
    const result = await enforceTenantApiContext(context('support'), request, true, recorder);
    expect(result.response?.status).toBe(403);
    expect(recorder).toHaveBeenCalledOnce();
    expect(recorder).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'support.write_blocked',
        tenantId: 'tenant-1',
        actorUserId: 'admin-1',
        outcome: 'blocked',
      }),
    );
  });

  it('does not give a regular admin an implicit tenant context', async () => {
    const result = await enforceTenantApiContext(context('admin'));
    expect(result.context).toBeNull();
    expect(result.response?.status).toBe(403);
  });

  it('hides admin APIs from tenant members', async () => {
    const result = await enforceAdminApiContext(context('member'));
    expect(result.context).toBeNull();
    expect(result.response?.status).toBe(404);
  });

  it('invalidates deactivated accounts and tenants and accepts controlled reactivation', () => {
    const activeMember = context('member');
    expect(isSessionPrincipalActive(activeMember.user, activeMember.tenant)).toBe(true);
    expect(isSessionPrincipalActive({ ...activeMember.user, status: 'inactive' }, activeMember.tenant)).toBe(false);
    expect(isSessionPrincipalActive(activeMember.user, { ...activeMember.tenant!, status: 'inactive' })).toBe(false);
    expect(isSessionPrincipalActive(activeMember.user, { ...activeMember.tenant!, status: 'active' })).toBe(true);
  });
});
