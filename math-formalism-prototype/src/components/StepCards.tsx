import { useRef, useEffect, useCallback } from 'react';
import katex from 'katex';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ScrollToPlugin } from 'gsap/ScrollToPlugin';
import styles from './StepCards.module.css';
import { useSimulationContext } from '../simulation/SimulationContext';

gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);

export function StepCards() {
  const { state, setStep, scrollToStepRef } = useSimulationContext();
  const payload = state.payload;
  const panelRef = useRef<HTMLDivElement>(null);
  const algebraRefs = useRef<(HTMLDivElement | null)[]>([]);
  const triggersRef = useRef<ScrollTrigger[]>([]);
  const hasAnimated = useRef(false);
  const isScrollingTo = useRef(false);

  // Programmatic scroll-to-step (used by StepControls)
  const scrollToStep = useCallback((index: number) => {
    if (!panelRef.current) return;
    const cards = panelRef.current.querySelectorAll<HTMLElement>('[data-step-card]');
    if (!cards[index]) return;
    isScrollingTo.current = true;
    gsap.to(panelRef.current, {
      scrollTo: { y: cards[index], offsetY: panelRef.current.clientHeight * 0.3 },
      duration: 0.6,
      ease: 'power2.inOut',
      onComplete: () => { isScrollingTo.current = false; },
    });
    setStep(index);
  }, [setStep]);

  // Register scrollToStep on context ref for StepControls
  useEffect(() => {
    scrollToStepRef.current = scrollToStep;
    return () => { scrollToStepRef.current = null; };
  }, [scrollToStep, scrollToStepRef]);

  // Set up GSAP ScrollTrigger for scroll-driven step activation
  useEffect(() => {
    if (!panelRef.current || !payload) return;

    // Clean up previous triggers
    for (const t of triggersRef.current) t.kill();
    triggersRef.current = [];

    const cards = panelRef.current.querySelectorAll<HTMLElement>('[data-step-card]');

    // Entrance animation (once per payload)
    if (!hasAnimated.current) {
      hasAnimated.current = true;
      gsap.from(cards, { opacity: 0, y: 30, duration: 0.5, stagger: 0.15, ease: 'power2.out' });
    }

    // Create ScrollTrigger for each card
    cards.forEach((card, i) => {
      const trigger = ScrollTrigger.create({
        trigger: card,
        scroller: panelRef.current!,
        start: 'top center',
        end: 'bottom center',
        onEnter: () => { if (!isScrollingTo.current) setStep(i); },
        onEnterBack: () => { if (!isScrollingTo.current) setStep(i); },
      });
      triggersRef.current.push(trigger);
    });

    return () => {
      for (const t of triggersRef.current) t.kill();
      triggersRef.current = [];
    };
  }, [payload, setStep]);

  // Render KaTeX algebra detail for all steps
  useEffect(() => {
    if (!payload) return;
    payload.steps.forEach((step, i) => {
      const el = algebraRefs.current[i];
      if (el) {
        try { katex.render(step.algebraDetail, el, { displayMode: false, throwOnError: false }); }
        catch { el.textContent = step.algebraDetail; }
      }
    });
  }, [payload]);

  // Reset animation flag when formula changes
  useEffect(() => { hasAnimated.current = false; }, [payload?.formula.latex]);

  if (!payload) return null;

  return (
    <div className={styles.panel} ref={panelRef}>
      {payload.steps.map((step, i) => {
        const isActive = i === state.activeStepIndex;
        return (
          <div
            key={step.id}
            data-step-card
            className={`${styles.card} ${isActive ? styles.cardActive : ''}`}
            onClick={() => scrollToStep(i)}
          >
            <div className={`${styles.stepLabel} ${isActive ? styles.stepLabelActive : ''}`}>Step {i + 1}</div>
            <div className={styles.title}>{step.title}</div>
            <div className={`${styles.narrative} ${isActive ? styles.narrativeActive : ''}`}>{step.narrative}</div>
            <div
              className={`${styles.algebra} ${isActive ? styles.algebraActive : ''}`}
              ref={(el) => { algebraRefs.current[i] = el; }}
            />
          </div>
        );
      })}
      {/* Bottom spacer so the last card can scroll to center */}
      <div className={styles.bottomSpacer} />
    </div>
  );
}
