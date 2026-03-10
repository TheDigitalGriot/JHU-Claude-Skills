import styles from './StepControls.module.css';
import { useSimulationContext } from '../simulation/SimulationContext';

export function StepControls() {
  const { state, setStep, scrollToStepRef } = useSimulationContext();
  const payload = state.payload;
  if (!payload) return null;
  const total = payload.steps.length;
  const current = state.activeStepIndex;

  const goToStep = (index: number) => {
    if (scrollToStepRef.current) {
      scrollToStepRef.current(index);
    } else {
      setStep(index);
    }
  };

  return (
    <div className={styles.bar}>
      <button className={styles.btn} onClick={() => goToStep(current - 1)} disabled={current <= 0}>&#9664; Prev</button>
      <span className={styles.indicator}>Step {current + 1} of {total}</span>
      <button className={styles.btn} onClick={() => goToStep(current + 1)} disabled={current >= total - 1}>Next &#9654;</button>
    </div>
  );
}
