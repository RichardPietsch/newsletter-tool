import { expect, test, type Page } from '@playwright/test';
import { and, count, eq, inArray, isNotNull, sql } from 'drizzle-orm';
import { AUTH_COOKIE_NAME } from '@/lib/auth/config';
import { hashToken } from '@/lib/auth/tokens';
import { db, pool } from '@/lib/db';
import { appSettings, assets, auditEvents, newsletters, sessions, tenants, users } from '@/lib/db/schema';
import { createBlock, createDefaultDocument } from '@/lib/newsletter/defaults';
import { insertBlock } from '@/lib/newsletter/operations';
import { seedNewsletterTemplatesForTenant } from '@/lib/newsletter/template-files';
import { createDefaultSettings } from '@/lib/settings/defaults';
import type { EventBlock, ImageBlock, NewsletterDocument } from '@/lib/newsletter/schema';

const e2eUser = {
  id: 'e2e-user',
  email: 'e2e@example.test',
};
const e2eSessionToken = 'e2e-session-token';
const e2eTenantId = 'e2e-tenant';
const e2eNewsletterId = 'e2e-demo-newsletter';
const e2eAssetId = 'e2e-asset';

const securityTenantIds = ['e2e-security-tenant-a', 'e2e-security-tenant-b'] as const;
const securityUsers = {
  a1: { id: 'e2e-security-user-a1', tenantId: securityTenantIds[0], email: 'security-a1@example.test' },
  a2: { id: 'e2e-security-user-a2', tenantId: securityTenantIds[0], email: 'security-a2@example.test' },
  b: { id: 'e2e-security-user-b', tenantId: securityTenantIds[1], email: 'security-b@example.test' },
} as const;
const securityTokens = {
  a1: 'e2e-security-token-a1',
  a2: 'e2e-security-token-a2',
  b: 'e2e-security-token-b',
  admin: 'e2e-security-token-admin',
} as const;
const securityNewsletterIds = ['e2e-security-newsletter-a', 'e2e-security-newsletter-b'] as const;
const securityAdminFixtureId = 'e2e-security-admin';
let securityAdminId = securityAdminFixtureId;
let securityAdminCreated = false;

function createE2eDocument(): NewsletterDocument {
  let document = createDefaultDocument('E2E Demo Newsletter');
  document = insertBlock(document, 1, {
    ...(createBlock('event') as EventBlock),
    id: 'e2e-event-block',
    title: 'E2E Veranstaltungsabend',
    date: '16. Juli 2026, 19:00 Uhr',
    location: 'Clubhaus',
    description: 'Ein reproduzierbarer Testtermin für den Editor.',
  });
  document = insertBlock(document, 2, {
    ...(createBlock('image') as ImageBlock),
    id: 'e2e-image-block',
    src: 'http://192.168.1.10/e2e-hero.jpg',
    alt: 'E2E Hero Bild',
    decorative: false,
  });
  return document;
}

async function cleanupE2eData() {
  await db.execute(sql`delete from sessions where user_id = ${e2eUser.id}`);
  await db.delete(auditEvents).where(eq(auditEvents.tenantId, e2eTenantId));
  await db.execute(sql`delete from assets where tenant_id = ${e2eTenantId}`);
  await db.execute(sql`delete from newsletters where tenant_id = ${e2eTenantId}`);
  await db.execute(sql`delete from app_settings where tenant_id = ${e2eTenantId}`);
  await db.execute(sql`delete from users where id = ${e2eUser.id}`);
  await db.execute(sql`delete from tenants where id = ${e2eTenantId}`);
}

async function cleanupSecurityData() {
  const userIds = Object.values(securityUsers).map((user) => user.id);
  await db
    .delete(sessions)
    .where(
      inArray(sessions.id, [
        'e2e-security-session-a1',
        'e2e-security-session-a2',
        'e2e-security-session-b',
        'e2e-security-session-admin',
        'e2e-security-session-a1-reactivated',
        'e2e-security-session-a1-tenant-reactivated',
      ]),
    );
  await db.delete(auditEvents).where(inArray(auditEvents.tenantId, [...securityTenantIds]));
  await db.delete(assets).where(inArray(assets.tenantId, [...securityTenantIds]));
  await db.delete(newsletters).where(inArray(newsletters.tenantId, [...securityTenantIds]));
  await db.delete(appSettings).where(inArray(appSettings.tenantId, [...securityTenantIds]));
  await db.delete(users).where(inArray(users.id, userIds));
  await db.delete(tenants).where(inArray(tenants.id, [...securityTenantIds]));
  await db.delete(users).where(eq(users.id, securityAdminFixtureId));
}

async function prepareSecurityData() {
  await cleanupSecurityData();
  const now = new Date();
  await db.insert(tenants).values([
    { id: securityTenantIds[0], name: 'Security Tenant A', status: 'active' },
    { id: securityTenantIds[1], name: 'Security Tenant B', status: 'active' },
  ]);
  await db.insert(users).values(
    Object.values(securityUsers).map((user) => ({
      ...user,
      role: 'tenant_member' as const,
      status: 'active' as const,
      emailVerifiedAt: now,
    })),
  );

  const [existingAdmin] = await db.select().from(users).where(eq(users.role, 'platform_admin'));
  if (existingAdmin) {
    if (existingAdmin.status !== 'active') throw new Error('The existing platform administrator is inactive.');
    securityAdminId = existingAdmin.id;
    securityAdminCreated = false;
  } else {
    securityAdminId = securityAdminFixtureId;
    securityAdminCreated = true;
    await db.insert(users).values({
      id: securityAdminId,
      tenantId: null,
      role: 'platform_admin',
      status: 'active',
      email: 'security-admin@example.test',
      emailVerifiedAt: now,
    });
  }

  await db.insert(sessions).values([
    {
      id: 'e2e-security-session-a1',
      userId: securityUsers.a1.id,
      sessionTokenHash: hashToken(securityTokens.a1),
      expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
      userAgent: 'playwright-security',
    },
    {
      id: 'e2e-security-session-a2',
      userId: securityUsers.a2.id,
      sessionTokenHash: hashToken(securityTokens.a2),
      expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
      userAgent: 'playwright-security',
    },
    {
      id: 'e2e-security-session-b',
      userId: securityUsers.b.id,
      sessionTokenHash: hashToken(securityTokens.b),
      expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
      userAgent: 'playwright-security',
    },
    {
      id: 'e2e-security-session-admin',
      userId: securityAdminId,
      sessionTokenHash: hashToken(securityTokens.admin),
      expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
      userAgent: 'playwright-security',
    },
  ]);
  await db.insert(newsletters).values([
    {
      id: securityNewsletterIds[0],
      tenantId: securityTenantIds[0],
      title: 'Security Newsletter A',
      document: createDefaultDocument('Security Newsletter A'),
    },
    {
      id: securityNewsletterIds[1],
      tenantId: securityTenantIds[1],
      title: 'Security Newsletter B',
      document: createDefaultDocument('Security Newsletter B'),
    },
  ]);
}

async function prepareE2eData() {
  await cleanupE2eData();
  const now = new Date();
  await db.insert(tenants).values({ id: e2eTenantId, name: 'E2E Tenant', status: 'active' });
  await db.insert(users).values({
    id: e2eUser.id,
    tenantId: e2eTenantId,
    role: 'tenant_member',
    status: 'active',
    email: e2eUser.email,
    emailVerifiedAt: now,
    lastLoginAt: now,
  });
  await db.insert(sessions).values({
    id: 'e2e-session',
    userId: e2eUser.id,
    sessionTokenHash: hashToken(e2eSessionToken),
    expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
    userAgent: 'playwright',
  });
  await db.insert(newsletters).values({
    id: e2eNewsletterId,
    tenantId: e2eTenantId,
    title: 'E2E Demo Newsletter',
    document: createE2eDocument(),
    createdAt: now,
    updatedAt: now,
  });
  await db.insert(assets).values({
    id: e2eAssetId,
    tenantId: e2eTenantId,
    storageKey: 'e2e/hero.jpg',
    publicUrl: 'https://assets.example.com/e2e/hero.jpg',
    originalFilename: 'e2e-hero.jpg',
    title: 'E2E Hero',
    altText: 'E2E Hero Alt',
    mimeType: 'image/jpeg',
    width: 1200,
    height: 800,
    sizeBytes: 42_000,
  });
  await db.insert(appSettings).values({
    id: e2eUser.id,
    tenantId: e2eTenantId,
    settings: createDefaultSettings(),
    updatedAt: now,
  });
}

async function installTestSession(page: Page) {
  await installSession(page, e2eSessionToken);
  await page.addInitScript((email) => {
    const initializedKey = 'newsletter:e2e:onboarding-initialized';
    if (!sessionStorage.getItem(initializedKey)) {
      localStorage.setItem(`newsletter:onboarding:completed:${email}`, 'true');
      localStorage.removeItem(`newsletter:onboarding:step:${email}`);
      sessionStorage.setItem(initializedKey, 'true');
    }
  }, e2eUser.email);
}

async function installSession(page: Page, token: string) {
  await page.context().addCookies([
    {
      name: AUTH_COOKIE_NAME,
      value: token,
      url: 'http://127.0.0.1:3000',
      httpOnly: true,
      sameSite: 'Lax',
    },
  ]);
}

async function createReplacementSession(id: string, userId: string, token: string) {
  await db.insert(sessions).values({
    id,
    userId,
    sessionTokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    userAgent: 'playwright-security',
  });
}

async function advanceTourStep(page: Page, stepId: string) {
  const dialog = page.getByRole('dialog');
  await expect(dialog).toHaveAttribute('data-onboarding-step', stepId);
  await dialog.getByRole('button', { name: 'Weiter' }).click();
}

test.beforeAll(async () => {
  await prepareE2eData();
  await prepareSecurityData();
});

test.afterAll(async () => {
  await cleanupSecurityData();
  await cleanupE2eData();
  if (securityAdminCreated) await db.delete(users).where(eq(users.id, securityAdminId));
  await pool.end();
});

test.beforeEach(async ({ page }) => {
  await installTestSession(page);
});

test('covers the main authenticated editor flow', async ({ page }) => {
  await page.goto('/newsletters');
  await expect(page.getByRole('heading', { name: 'Newsletter' })).toBeVisible();

  await page.getByRole('link', { name: /E2E Demo Newsletter/ }).click();
  await expect(page).toHaveURL(/\/newsletters\/e2e-demo-newsletter$/);
  await expect(page.getByLabel('Newsletter-Titel')).toHaveValue('E2E Demo Newsletter');

  const editorInterface = page.locator('[data-editor-interface="newsletter-editor"]');
  const newsletterPreview = page.locator('.newsletter-export-preview');
  const lockedGlobalHint = page.locator('[data-editor-ui="locked-global"]').first();
  const darkModeSwitch = page.getByRole('switch', { name: 'Dark-Mode-Vorschau umschalten' });
  await expect(editorInterface).toHaveCSS('background-color', 'rgb(244, 241, 236)');
  await expect(newsletterPreview).toHaveAttribute('data-newsletter-theme', 'light');
  await expect(darkModeSwitch).not.toBeChecked();
  await darkModeSwitch.click();
  await expect(newsletterPreview).toHaveAttribute('data-newsletter-theme', 'dark');
  await expect(newsletterPreview).toHaveCSS('background-color', 'rgb(16, 25, 30)');
  await expect(editorInterface).toHaveCSS('background-color', 'rgb(244, 241, 236)');
  await expect(lockedGlobalHint).toHaveCSS('background-color', 'rgb(241, 245, 249)');
  await expect(lockedGlobalHint).toHaveCSS('color', 'rgb(71, 85, 105)');
  await expect(darkModeSwitch).toBeChecked();

  await page.getByText('E2E Veranstaltungsabend').click();
  const inspector = page.locator('[data-tour="inspector"]');
  await expect(inspector.getByLabel('Newsletter-Titel')).toHaveValue('E2E Veranstaltungsabend');

  await inspector.getByLabel('Newsletter-Titel').fill('');
  await expect(page.getByText('Speichern fehlgeschlagen')).toBeVisible({ timeout: 5000 });
  await page.getByLabel('Speicherfehler anzeigen').click();
  await expect(page.getByRole('dialog', { name: 'Speichern nicht erfolgreich' })).toContainText(
    'Titel ist erforderlich',
  );
  await page.getByRole('button', { name: 'Schließen' }).click();
  await inspector.getByLabel('Newsletter-Titel').fill('E2E Validierter Abend');

  await page.getByLabel('Komponente an dieser Stelle hinzufügen').first().click();
  await page.getByRole('button', { name: /Zitat/ }).click();
  await expect(inspector.getByRole('textbox', { name: 'Zitat *', exact: true })).toHaveValue(
    'Ein prägnantes Zitat für den Newsletter.',
  );

  await page.getByLabel('Medien').click();
  await expect(page.getByRole('dialog', { name: 'Medien' })).toContainText('E2E Hero');
  await page.getByRole('button', { name: 'Medien schließen' }).click();

  await page.getByLabel('Newsletter exportieren').click();
  const exportIssues = page.getByRole('dialog', { name: 'Export nicht möglich' });
  await expect(exportIssues).toContainText('Newsletter kann nicht exportiert werden.');
  await expect(exportIssues).toContainText('Bild-URLs müssen in der öffentlichen Testumgebung HTTPS verwenden.');
});

test('allows restarting and completing the onboarding tour manually', async ({ page }) => {
  await page.goto('/newsletters');
  await page.getByLabel('Account').click();
  await expect(page.getByRole('dialog', { name: 'Account' })).toBeVisible();
  await page.getByRole('button', { name: 'Einführung erneut starten' }).click();

  await expect(page.getByRole('dialog', { name: 'Willkommen im Newsletter Tool' })).toBeVisible();
  for (const stepId of ['welcome', 'overview-nav', 'media-nav', 'settings-nav', 'account-nav']) {
    await advanceTourStep(page, stepId);
  }

  const demoDialog = page.getByRole('dialog');
  await expect(demoDialog).toHaveAttribute('data-onboarding-step', 'demo-newsletter');
  await Promise.all([
    page.waitForURL(/\/newsletters\/e2e-demo-newsletter$/),
    demoDialog.getByRole('button', { name: 'Weiter' }).click(),
  ]);

  for (const stepId of ['canvas', 'module', 'add-module', 'inspector']) {
    await advanceTourStep(page, stepId);
  }

  const exportDialog = page.getByRole('dialog');
  await expect(exportDialog).toHaveAttribute('data-onboarding-step', 'export');
  await Promise.all([page.waitForURL(/\/newsletters$/), exportDialog.getByRole('button', { name: 'Fertig' }).click()]);

  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('enforces shared tenant access and cross-tenant isolation', async ({ page }) => {
  await installSession(page, securityTokens.a1);
  const own = await page.context().request.get(`/api/newsletters/${securityNewsletterIds[0]}`);
  expect(own.status()).toBe(200);

  await installSession(page, securityTokens.a2);
  const shared = await page.context().request.get(`/api/newsletters/${securityNewsletterIds[0]}`);
  expect(shared.status()).toBe(200);

  await installSession(page, securityTokens.b);
  const foreign = await page.context().request.get(`/api/newsletters/${securityNewsletterIds[0]}`);
  expect(foreign.status()).toBe(404);
  const forcedTenant = await page.context().request.get(`/api/newsletters?tenantId=${securityTenantIds[0]}`);
  expect((await forcedTenant.json()).map((row: { id: string }) => row.id)).toEqual([securityNewsletterIds[1]]);
});

test('keeps platform administration separate and support mode read-only', async ({ page }) => {
  await db
    .update(sessions)
    .set({ supportTenantId: null, supportStartedAt: null })
    .where(eq(sessions.id, 'e2e-security-session-admin'));

  await installSession(page, securityTokens.a1);
  expect((await page.context().request.get('/admin')).status()).toBe(404);

  await installSession(page, securityTokens.admin);
  const adminPage = await page.context().request.get('/admin');
  expect(adminPage.status()).toBe(200);
  const adminHtml = await adminPage.text();
  expect(adminHtml).toContain('Security Tenant A');
  expect(adminHtml).toContain('Security Tenant B');
  expect((await page.context().request.get('/api/newsletters')).status()).toBe(403);

  const origin = { origin: 'http://127.0.0.1:3000' };
  const start = await page.context().request.post('/api/admin/support', {
    form: { tenantId: securityTenantIds[0] },
    headers: origin,
    maxRedirects: 0,
  });
  expect(start.status()).toBe(303);
  expect((await page.context().request.get(`/api/newsletters/${securityNewsletterIds[0]}`)).status()).toBe(200);

  const blocked = await page.context().request.put(`/api/newsletters/${securityNewsletterIds[0]}`, {
    data: {},
    headers: origin,
  });
  expect(blocked.status()).toBe(403);

  const [blockedEvents] = await db
    .select({ value: count() })
    .from(auditEvents)
    .where(
      and(
        eq(auditEvents.tenantId, securityTenantIds[0]),
        eq(auditEvents.actorUserId, securityAdminId),
        eq(auditEvents.eventType, 'support.write_blocked'),
      ),
    );
  expect(blockedEvents.value).toBe(1);

  const end = await page.context().request.post('/api/admin/support/end', {
    headers: origin,
    maxRedirects: 0,
  });
  expect(end.status()).toBe(303);
  const [supportEvents] = await db
    .select({ value: count() })
    .from(auditEvents)
    .where(
      and(
        eq(auditEvents.tenantId, securityTenantIds[0]),
        eq(auditEvents.actorUserId, securityAdminId),
        inArray(auditEvents.eventType, ['support.started', 'support.ended']),
      ),
    );
  expect(supportEvents.value).toBe(2);
});

test('revokes sessions on account and tenant deactivation without deleting content', async ({ page }) => {
  await db
    .update(sessions)
    .set({ supportTenantId: null, supportStartedAt: null })
    .where(eq(sessions.id, 'e2e-security-session-admin'));
  const origin = { origin: 'http://127.0.0.1:3000' };

  await installSession(page, securityTokens.admin);
  const deactivateAccount = await page
    .context()
    .request.post(`/api/admin/tenants/${securityTenantIds[0]}/accounts/${securityUsers.a1.id}`, {
      form: { operation: 'deactivate', confirmation: securityUsers.a1.id },
      headers: origin,
      maxRedirects: 0,
    });
  expect(deactivateAccount.status()).toBe(303);

  await installSession(page, securityTokens.a1);
  expect((await page.context().request.get('/api/newsletters')).status()).toBe(401);

  await installSession(page, securityTokens.admin);
  const reactivateAccount = await page
    .context()
    .request.post(`/api/admin/tenants/${securityTenantIds[0]}/accounts/${securityUsers.a1.id}`, {
      form: { operation: 'reactivate', confirmation: securityUsers.a1.id },
      headers: origin,
      maxRedirects: 0,
    });
  expect(reactivateAccount.status()).toBe(303);
  const accountToken = 'e2e-security-token-a1-reactivated';
  await createReplacementSession('e2e-security-session-a1-reactivated', securityUsers.a1.id, accountToken);
  await installSession(page, accountToken);
  expect((await page.context().request.get('/api/newsletters')).status()).toBe(200);

  await installSession(page, securityTokens.admin);
  const deactivateTenant = await page.context().request.post(`/api/admin/tenants/${securityTenantIds[0]}`, {
    form: { operation: 'deactivate', confirmation: securityTenantIds[0] },
    headers: origin,
    maxRedirects: 0,
  });
  expect(deactivateTenant.status()).toBe(303);

  await installSession(page, accountToken);
  expect((await page.context().request.get('/api/newsletters')).status()).toBe(401);

  await installSession(page, securityTokens.admin);
  const reactivateTenant = await page.context().request.post(`/api/admin/tenants/${securityTenantIds[0]}`, {
    form: { operation: 'reactivate', confirmation: securityTenantIds[0] },
    headers: origin,
    maxRedirects: 0,
  });
  expect(reactivateTenant.status()).toBe(303);
  const tenantToken = 'e2e-security-token-a1-tenant-reactivated';
  await createReplacementSession('e2e-security-session-a1-tenant-reactivated', securityUsers.a1.id, tenantToken);
  await installSession(page, tenantToken);
  expect((await page.context().request.get('/api/newsletters')).status()).toBe(200);

  const [content] = await db
    .select({ value: count() })
    .from(newsletters)
    .where(and(eq(newsletters.tenantId, securityTenantIds[0]), eq(newsletters.id, securityNewsletterIds[0])));
  expect(content.value).toBe(1);
});

test('seeds tenant templates idempotently', async () => {
  await seedNewsletterTemplatesForTenant(securityTenantIds[1]);
  const [first] = await db
    .select({ value: count() })
    .from(newsletters)
    .where(and(eq(newsletters.tenantId, securityTenantIds[1]), isNotNull(newsletters.seedKey)));
  await seedNewsletterTemplatesForTenant(securityTenantIds[1]);
  const [second] = await db
    .select({ value: count() })
    .from(newsletters)
    .where(and(eq(newsletters.tenantId, securityTenantIds[1]), isNotNull(newsletters.seedKey)));
  expect(first.value).toBe(1);
  expect(second.value).toBe(first.value);
});
