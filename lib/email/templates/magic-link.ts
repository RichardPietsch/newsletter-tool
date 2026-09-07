import { t } from '@/lib/i18n';

export function magicLinkEmail({ url, ttlMinutes }: { url: string; ttlMinutes: number }) {
  const intro = t('email.magicLinkIntro');
  const validity = t('email.magicLinkValidity').replace('{minutes}', String(ttlMinutes));
  const text = `${intro} ${url}\n\n${validity}`;
  const html = `<p>${intro}</p><p><a href="${url}">${t('email.magicLinkButton')}</a></p><p>${validity}</p><p>${t('email.magicLinkIgnore')}</p>`;
  return { text, html };
}
