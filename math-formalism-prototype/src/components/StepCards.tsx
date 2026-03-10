import { useRef, useEffect } from 'react';
import katex from 'katex';
import gsap from 'gsap';
import styles from './StepCards.module.css';
import { useSimulationContext } from '../simulation/SimulationContext';

export function StepCards() {
  const { state, setStep } = useSimulationContext();
  const payload = state.payload;
  const panelRef = useRef<HTMLDivElement>(null);
  const algebraRefs = useRef<(HTMLDivElement | null)[]>([]);
  const hasAnimated = useRef(false);

  // GSAP entrance animation
  useEffect(() => {
    if (!panelRef.current || !payload || hasAnimated.current) return;
    hasAnimated.current = true;
    const cards = panelRef.current.querySelectorAll('[data-step-card]');
    gsap.from(cards, { opacity: 0, y: 20, duration: 0.4, stagger: 0.2, ease: 'power2.out' });
  }, [payload]);

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

  if (!payload) return null;

  // Reset animation flag when payload changes
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => { hasAnimated.current = false; }, [payload?.formula.latex]);

  return (
    <div className={styles.panel} ref={panelRef}>
      {payload.steps.map((step, i) => {
        const isActive = i === state.activeStepIndex;
        return (
          <div key={step.id} data-step-card className={`${styles.card} ${isActive ? styles.cardActive : ''}`} onClick={() => setStep(i)}>
            <div className={`${styles.stepLabel} ${isActive ? styles.stepLabelActive : ''}`}>Step {i + 1}</div>
            <div className={styles.title}>{step.title}</div>
            {isActive && (
              <>
                <div className={styles.narrative}>{step.narrative}</div>
                <div className={styles.algebra} ref={(el) => { algebraRefs.current[i] = el; }} />
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
