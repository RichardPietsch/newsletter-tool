import { expect, test, type Page } from '@playwright/test';
import { sql } from 'drizzle-orm';
import { AUTH_COOKIE_NAME } from '@/lib/auth/config';
import { hashToken } from '@/lib/auth/tokens';
import { db, pool } from '@/lib/db';
import { appSettings, assets, newsletters, sessions, users } from '@/lib/db/schema';
import { createBlock, createDefaultDocument } from '@/lib/newsletter/defaults';
import { insertBlock } from '@/lib/newsletter/operations';
import { createDefaultSettings } from '@/lib/settings/defaults';
import type { EventBlock, ImageBlock, NewsletterDocument } from '@/lib/newsletter/schema';

const e2eUser = {
  id: 'e2e-user',
  email: 'e2e@example.test',
};
const e2eSessionToken = 'e2e-session-token';
const e2eNewsletterId = 'e2e-demo-newsletter';
const e2eAssetId = 'e2e-asset';

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
  await db.execute(sql`delete from assets where owner_id = ${e2eUser.id}`);
  await db.execute(sql`delete from newsletters where owner_id = ${e2eUser.id}`);
  await db.execute(sql`delete from app_settings where owner_id = ${e2eUser.id}`);
  await db.execute(sql`delete from users where id = ${e2eUser.id}`);
}

async function prepareE2eData() {
  await cleanupE2eData();
  const now = new Date();
  await db.insert(users).values({
    id: e2eUser.id,
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
    ownerId: e2eUser.id,
    title: 'E2E Demo Newsletter',
    document: createE2eDocument(),
    createdAt: now,
    updatedAt: now,
  });
  await db.insert(assets).values({
    id: e2eAssetId,
    ownerId: e2eUser.id,
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
    ownerId: e2eUser.id,
    settings: createDefaultSettings(),
    updatedAt: now,
  });
}

async function installTestSession(page: Page) {
  await page.context().addCookies([
    {
      name: AUTH_COOKIE_NAME,
      value: e2eSessionToken,
      url: 'http://127.0.0.1:3000',
      httpOnly: true,
      sameSite: 'Lax',
    },
  ]);
  await page.addInitScript((email) => {
    localStorage.setItem(`newsletter:onboarding:completed:${email}`, 'true');
    localStorage.removeItem(`newsletter:onboarding:step:${email}`);
  }, e2eUser.email);
}

test.beforeAll(async () => {
  await prepareE2eData();
});

test.afterAll(async () => {
  await cleanupE2eData();
  await pool.end();
});

test.beforeEach(async ({ page }) => {
  await installTestSession(page);
});

test('covers the main authenticated editor flow', async ({ page }) => {
  await page.goto('/newsletters');
  await expect(page.getByRole('heading', { name: 'Newsletter' })).toBeVisible();

  await page.getByRole('link', { name: /E2E Demo Newsletter/ }).click();
  await expect(page.getByLabel('Newsletter-Titel')).toHaveValue('E2E Demo Newsletter');

  await page.getByText('E2E Veranstaltungsabend').click();
  const inspector = page.locator('[data-tour="inspector"]');
  await expect(inspector).toContainText('E2E Veranstaltungsabend');

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
  await expect(page.getByText('Ein prägnantes Zitat für den Newsletter.')).toBeVisible();

  await page.getByLabel('Medien').click();
  await expect(page.getByRole('dialog', { name: 'Medien' })).toContainText('E2E Hero');
  await page.getByRole('button', { name: 'Medien schließen' }).click();

  await page.getByLabel('Newsletter exportieren').click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: /Export als HTML/ }).click();
  await expect((await downloadPromise).suggestedFilename()).toMatch(/e2e-demo-newsletter\.html/i);
});

test('allows restarting and completing the onboarding tour manually', async ({ page }) => {
  await page.goto('/newsletters');
  await page.getByLabel('Account').click();
  await page.getByRole('button', { name: 'Einführung erneut starten' }).click();

  await expect(page.getByRole('dialog', { name: 'Willkommen im Newsletter Tool' })).toBeVisible();
  for (let step = 0; step < 12; step += 1) {
    const finish = page.getByRole('button', { name: 'Fertig' });
    if (await finish.isVisible().catch(() => false)) {
      await finish.click();
      break;
    }
    await page.getByRole('button', { name: 'Weiter' }).click();
  }

  await expect(page.getByRole('dialog')).toHaveCount(0);
});
