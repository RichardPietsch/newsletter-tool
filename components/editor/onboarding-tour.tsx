'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { t } from '@/lib/i18n';

type TourVariant = 'overview' | 'editor';

type TourStep = {
  id: string;
  variant: TourVariant;
  selector?: string;
  title: string;
  body: string;
  advanceHref?: string;
};

type HighlightRect = {
  top: number;
  left: number;
  width: number;
  height: number;
};

const completedKey = (email: string) => `newsletter:onboarding:completed:${email}`;
const stepKey = (email: string) => `newsletter:onboarding:step:${email}`;
const restartEventName = 'newsletter:onboarding:start';

export function restartOnboardingTour() {
  window.dispatchEvent(new Event(restartEventName));
}

export function OnboardingTour({ variant, accountEmail, firstNewsletterHref }: { variant: TourVariant; accountEmail: string; firstNewsletterHref?: string }) {
  const steps = useMemo<TourStep[]>(() => [
    { id: 'welcome', variant: 'overview', title: t('onboarding.welcomeTitle'), body: t('onboarding.welcomeBody') },
    { id: 'overview-nav', variant: 'overview', selector: '[data-tour="nav-overview"]', title: t('onboarding.overviewTitle'), body: t('onboarding.overviewBody') },
    { id: 'media-nav', variant: 'overview', selector: '[data-tour="nav-media"]', title: t('onboarding.mediaTitle'), body: t('onboarding.mediaBody') },
    { id: 'settings-nav', variant: 'overview', selector: '[data-tour="nav-settings"]', title: t('onboarding.settingsTitle'), body: t('onboarding.settingsBody') },
    { id: 'account-nav', variant: 'overview', selector: '[data-tour="nav-account"]', title: t('onboarding.accountTitle'), body: t('onboarding.accountBody') },
    { id: 'demo-newsletter', variant: 'overview', selector: '[data-tour="newsletter-card"]', title: t('onboarding.demoTitle'), body: t('onboarding.demoBody'), advanceHref: firstNewsletterHref },
    { id: 'canvas', variant: 'editor', selector: '[data-tour="editor-canvas"]', title: t('onboarding.canvasTitle'), body: t('onboarding.canvasBody') },
    { id: 'module', variant: 'editor', selector: '[data-tour="newsletter-module"]', title: t('onboarding.moduleTitle'), body: t('onboarding.moduleBody') },
    { id: 'add-module', variant: 'editor', selector: '[data-tour="add-module"]', title: t('onboarding.addModuleTitle'), body: t('onboarding.addModuleBody') },
    { id: 'inspector', variant: 'editor', selector: '[data-tour="inspector"]', title: t('onboarding.inspectorTitle'), body: t('onboarding.inspectorBody') },
    { id: 'export', variant: 'editor', selector: '[data-tour="nav-export"]', title: t('onboarding.exportTitle'), body: t('onboarding.exportBody') },
  ], [firstNewsletterHref]);
  const initialEditorStep = steps.findIndex((step) => step.variant === 'editor');
  const [active, setActive] = useState(false);
  const [index, setIndex] = useState(0);
  const [highlight, setHighlight] = useState<HighlightRect | null>(null);
  const step = steps[index];

  const complete = useCallback(() => {
    localStorage.setItem(completedKey(accountEmail), 'true');
    localStorage.removeItem(stepKey(accountEmail));
    setActive(false);
  }, [accountEmail]);

  const moveTo = useCallback((nextIndex: number) => {
    if (nextIndex >= steps.length) {
      complete();
      return;
    }
    localStorage.setItem(stepKey(accountEmail), String(nextIndex));
    setIndex(nextIndex);
  }, [accountEmail, complete, steps.length]);

  useEffect(() => {
    const storedStep = Number(localStorage.getItem(stepKey(accountEmail)) ?? '0');
    const hasStoredStep = Number.isFinite(storedStep) && storedStep > 0 && storedStep < steps.length;
    const hasCompleted = localStorage.getItem(completedKey(accountEmail)) === 'true';
    if (!hasCompleted || hasStoredStep) {
      setIndex(hasStoredStep ? storedStep : variant === 'editor' ? initialEditorStep : 0);
      setActive(true);
    }

    const restart = () => {
      const startIndex = variant === 'editor' ? initialEditorStep : 0;
      localStorage.removeItem(completedKey(accountEmail));
      localStorage.setItem(stepKey(accountEmail), String(startIndex));
      setIndex(startIndex);
      setActive(true);
    };
    window.addEventListener(restartEventName, restart);
    return () => window.removeEventListener(restartEventName, restart);
  }, [accountEmail, initialEditorStep, steps.length, variant]);

  useEffect(() => {
    if (!active || !step || step.variant !== variant) return;
    const updateHighlight = () => {
      if (!step.selector) {
        setHighlight(null);
        return;
      }
      const target = document.querySelector<HTMLElement>(step.selector);
      if (!target) {
        setHighlight(null);
        return;
      }
      target.scrollIntoView({ block: 'center', inline: 'center', behavior: 'smooth' });
      const rect = target.getBoundingClientRect();
      setHighlight({ top: rect.top - 8, left: rect.left - 8, width: rect.width + 16, height: rect.height + 16 });
    };
    updateHighlight();
    window.addEventListener('resize', updateHighlight);
    window.addEventListener('scroll', updateHighlight, true);
    return () => {
      window.removeEventListener('resize', updateHighlight);
      window.removeEventListener('scroll', updateHighlight, true);
    };
  }, [active, step, variant]);

  useEffect(() => {
    if (!active) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') complete();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [active, complete]);

  if (!active || !step || step.variant !== variant) return null;

  const isLastStep = index === steps.length - 1;
  const canGoBack = index > 0;
  const next = () => {
    const nextIndex = index + 1;
    localStorage.setItem(stepKey(accountEmail), String(nextIndex));
    if (step.advanceHref) {
      window.location.href = step.advanceHref;
      return;
    }
    if (steps[nextIndex]?.variant !== variant) {
      complete();
      return;
    }
    moveTo(nextIndex);
  };

  return (
    <div className="fixed inset-0 z-[120] pointer-events-none" aria-live="polite">
      <div className="absolute inset-0 bg-slate-950/40" />
      {highlight ? <div className="absolute rounded-xl border-2 border-white shadow-[0_0_0_9999px_rgba(15,23,42,0.35)] transition-all" style={highlight} /> : null}
      <section className="pointer-events-auto fixed bottom-6 right-6 w-[min(28rem,calc(100vw-3rem))] rounded-2xl bg-white p-6 shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="onboarding-title">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">{t('onboarding.progress').replace('{current}', String(index + 1)).replace('{total}', String(steps.length))}</p>
        <h2 id="onboarding-title" className="mt-2 text-xl font-semibold text-slate-950">{step.title}</h2>
        <p className="mt-3 text-sm leading-6 text-slate-700">{step.body}</p>
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <button type="button" className="text-sm text-slate-500 underline" onClick={complete}>{t('onboarding.skip')}</button>
          <div className="flex gap-2">
            {canGoBack ? <button type="button" className="rounded border px-3 py-2 text-sm" onClick={() => moveTo(index - 1)}>{t('onboarding.back')}</button> : null}
            <button type="button" className="rounded bg-blue-700 px-4 py-2 text-sm font-medium text-white" onClick={next}>{isLastStep ? t('onboarding.finish') : t('onboarding.next')}</button>
          </div>
        </div>
      </section>
    </div>
  );
}
