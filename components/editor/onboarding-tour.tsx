'use client';

import type { CSSProperties } from 'react';
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

type PopoverPosition = Pick<CSSProperties, 'top' | 'left' | 'transform'>;

const completedKey = (email: string) => `newsletter:onboarding:completed:${email}`;
const stepKey = (email: string) => `newsletter:onboarding:step:${email}`;
const restartEventName = 'newsletter:onboarding:start';
const popoverWidth = 448;
const popoverHeight = 280;
const popoverGap = 20;
const viewportMargin = 24;

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const centeredPopover = (): PopoverPosition => ({
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
});

const positionPopoverNear = (rect: HighlightRect | null): PopoverPosition => {
  if (!rect) return centeredPopover();

  const maxLeft = Math.max(viewportMargin, window.innerWidth - popoverWidth - viewportMargin);
  const maxTop = Math.max(viewportMargin, window.innerHeight - popoverHeight - viewportMargin);
  const centeredTop = clamp(rect.top + rect.height / 2 - popoverHeight / 2, viewportMargin, maxTop);
  const rightLeft = rect.left + rect.width + popoverGap;
  const leftLeft = rect.left - popoverWidth - popoverGap;

  if (rightLeft + popoverWidth <= window.innerWidth - viewportMargin) {
    return { top: centeredTop, left: rightLeft };
  }

  if (leftLeft >= viewportMargin) {
    return { top: centeredTop, left: leftLeft };
  }

  const centeredLeft = clamp(rect.left + rect.width / 2 - popoverWidth / 2, viewportMargin, maxLeft);
  const belowTop = rect.top + rect.height + popoverGap;
  if (belowTop + popoverHeight <= window.innerHeight - viewportMargin) {
    return { top: belowTop, left: centeredLeft };
  }

  return { top: clamp(rect.top - popoverHeight - popoverGap, viewportMargin, maxTop), left: centeredLeft };
};

export function restartOnboardingTour(accountEmail?: string) {
  if (accountEmail) {
    localStorage.removeItem(completedKey(accountEmail));
    localStorage.setItem(stepKey(accountEmail), '0');
  }

  if (window.location.pathname !== '/newsletters') {
    window.location.href = '/newsletters';
    return;
  }

  window.dispatchEvent(new Event(restartEventName));
}

export function OnboardingTour({
  variant,
  accountEmail,
  firstNewsletterHref,
}: {
  variant: TourVariant;
  accountEmail: string;
  firstNewsletterHref?: string;
}) {
  const steps = useMemo<TourStep[]>(
    () => [
      { id: 'welcome', variant: 'overview', title: t('onboarding.welcomeTitle'), body: t('onboarding.welcomeBody') },
      {
        id: 'overview-nav',
        variant: 'overview',
        selector: '[data-tour="nav-overview"]',
        title: t('onboarding.overviewTitle'),
        body: t('onboarding.overviewBody'),
      },
      {
        id: 'media-nav',
        variant: 'overview',
        selector: '[data-tour="nav-media"]',
        title: t('onboarding.mediaTitle'),
        body: t('onboarding.mediaBody'),
      },
      {
        id: 'settings-nav',
        variant: 'overview',
        selector: '[data-tour="nav-settings"]',
        title: t('onboarding.settingsTitle'),
        body: t('onboarding.settingsBody'),
      },
      {
        id: 'account-nav',
        variant: 'overview',
        selector: '[data-tour="nav-account"]',
        title: t('onboarding.accountTitle'),
        body: t('onboarding.accountBody'),
      },
      {
        id: 'demo-newsletter',
        variant: 'overview',
        selector: '[data-tour="newsletter-card"]',
        title: t('onboarding.demoTitle'),
        body: t('onboarding.demoBody'),
        advanceHref: firstNewsletterHref,
      },
      {
        id: 'canvas',
        variant: 'editor',
        selector: '[data-tour="editor-canvas"]',
        title: t('onboarding.canvasTitle'),
        body: t('onboarding.canvasBody'),
      },
      {
        id: 'module',
        variant: 'editor',
        selector: '[data-tour="newsletter-module"]',
        title: t('onboarding.moduleTitle'),
        body: t('onboarding.moduleBody'),
      },
      {
        id: 'add-module',
        variant: 'editor',
        selector: '[data-tour="add-module"]',
        title: t('onboarding.addModuleTitle'),
        body: t('onboarding.addModuleBody'),
      },
      {
        id: 'inspector',
        variant: 'editor',
        selector: '[data-tour="inspector"]',
        title: t('onboarding.inspectorTitle'),
        body: t('onboarding.inspectorBody'),
      },
      {
        id: 'export',
        variant: 'editor',
        selector: '[data-tour="nav-export"]',
        title: t('onboarding.exportTitle'),
        body: t('onboarding.exportBody'),
      },
    ],
    [firstNewsletterHref],
  );
  const initialEditorStep = steps.findIndex((step) => step.variant === 'editor');
  const [active, setActive] = useState(false);
  const [index, setIndex] = useState(0);
  const [highlight, setHighlight] = useState<HighlightRect | null>(null);
  const [popoverPosition, setPopoverPosition] = useState<PopoverPosition>(centeredPopover);
  const step = steps[index];

  const complete = useCallback(() => {
    localStorage.setItem(completedKey(accountEmail), 'true');
    localStorage.removeItem(stepKey(accountEmail));
    setActive(false);

    if (window.location.pathname !== '/newsletters') {
      window.location.href = '/newsletters';
    }
  }, [accountEmail]);

  const moveTo = useCallback(
    (nextIndex: number) => {
      if (nextIndex >= steps.length) {
        complete();
        return;
      }
      localStorage.setItem(stepKey(accountEmail), String(nextIndex));
      setIndex(nextIndex);
    },
    [accountEmail, complete, steps.length],
  );

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
        setPopoverPosition(centeredPopover());
        return;
      }
      const target = document.querySelector<HTMLElement>(step.selector);
      if (!target) {
        setHighlight(null);
        setPopoverPosition(centeredPopover());
        return;
      }
      target.scrollIntoView({ block: 'center', inline: 'center', behavior: 'smooth' });
      const rect = target.getBoundingClientRect();
      const nextHighlight = {
        top: rect.top - 12,
        left: rect.left - 12,
        width: rect.width + 24,
        height: rect.height + 24,
      };
      setHighlight(nextHighlight);
      setPopoverPosition(positionPopoverNear(nextHighlight));
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
    <div className="fixed inset-0 z-[120] pointer-events-auto" aria-live="polite">
      <div className="absolute inset-0 bg-slate-950/25" />
      {highlight ? (
        <div
          className="pointer-events-none absolute rounded-xl border-4 border-[#012aff] bg-[#012aff]/10 shadow-[0_0_0_9999px_rgba(15,23,42,0.25),0_0_0_8px_rgba(1,42,255,0.18)] transition-all"
          style={highlight}
        />
      ) : null}
      <section
        className="pointer-events-auto fixed w-[min(28rem,calc(100vw-3rem))] rounded-2xl border border-[#012aff]/20 bg-white p-6 shadow-2xl ring-4 ring-[#012aff]/10 transition-all"
        style={popoverPosition}
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-title"
      >
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">
          {t('onboarding.progress')
            .replace('{current}', String(index + 1))
            .replace('{total}', String(steps.length))}
        </p>
        <h2 id="onboarding-title" className="mt-2 text-xl font-semibold text-slate-950">
          {step.title}
        </h2>
        <p className="mt-3 text-sm leading-6 text-slate-700">{step.body}</p>
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <button type="button" className="text-sm text-slate-500 underline" onClick={complete}>
            {t('onboarding.skip')}
          </button>
          <div className="flex gap-2">
            {canGoBack ? (
              <button type="button" className="rounded border px-3 py-2 text-sm" onClick={() => moveTo(index - 1)}>
                {t('onboarding.back')}
              </button>
            ) : null}
            <button
              type="button"
              className="rounded bg-blue-700 px-4 py-2 text-sm font-medium text-white"
              onClick={next}
            >
              {isLastStep ? t('onboarding.finish') : t('onboarding.next')}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
