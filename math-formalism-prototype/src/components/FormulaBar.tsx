import { useRef, useEffect } from 'react';
import katex from 'katex';
import styles from './FormulaBar.module.css';
import type { Annotation } from '../types';
import { getAnnotationColor } from '../types';
import { useSimulationContext } from '../simulation/SimulationContext';

function buildAnnotatedLatex(latex: string, annotations: Annotation[]): string {
  let annotated = latex;
  for (const ann of annotations) {
    const escaped = ann.latexFragment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escaped);
    annotated = annotated.replace(regex, `\\htmlClass{ann-${ann.id}}{${ann.latexFragment}}`);
  }
  return annotated;
}

export function FormulaBar() {
  const { state } = useSimulationContext();
  const formulaRef = useRef<HTMLDivElement>(null);
  const payload = state.payload;

  useEffect(() => {
    if (!formulaRef.current || !payload) return;
    const annotated = buildAnnotatedLatex(payload.formula.latex, payload.annotations);
    try {
      katex.render(annotated, formulaRef.current, { displayMode: true, throwOnError: false, trust: true });
    } catch {
      if (formulaRef.current) formulaRef.current.textContent = payload.formula.latex;
    }
    for (let i = 0; i < payload.annotations.length; i++) {
      const ann = payload.annotations[i];
      const els = formulaRef.current.querySelectorAll(`.ann-${ann.id}`);
      els.forEach((el) => {
        (el as HTMLElement).dataset.annotationId = ann.id;
        (el as HTMLElement).title = ann.label;
        (el as HTMLElement).style.setProperty('--highlight-color', getAnnotationColor(i));
      });
    }
    const activeStep = payload.steps[state.activeStepIndex];
    if (activeStep) {
      formulaRef.current.querySelectorAll('[data-annotation-id]').forEach((el) => {
        el.classList.toggle('active', activeStep.highlightIds.includes((el as HTMLElement).dataset.annotationId!));
      });
    }
  }, [payload, state.activeStepIndex]);

  if (!payload) return null;
  const activeStep = payload.steps[state.activeStepIndex];
  const hasActiveStep = activeStep && activeStep.highlightIds.length > 0;
  return (
    <div className={`${styles.bar} ${hasActiveStep ? styles.hasActiveStep : ''}`}>
      <div className={styles.formula} ref={formulaRef} />
      <div className={styles.description}>{payload.formula.description}</div>
    </div>
  );
}
