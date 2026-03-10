import styles from './ParameterSliders.module.css';
import { useSimulationContext } from '../simulation/SimulationContext';

export function ParameterSliders() {
  const { state, updateParameter } = useSimulationContext();
  const payload = state.payload;
  if (!payload) return null;

  return (
    <div className={styles.container}>
      {payload.parameters.map((param) => {
        const value = state.parameterValues[param.name] ?? param.default;
        return (
          <div key={param.name} className={styles.slider}>
            <div className={styles.label}>{param.label}: <span className={styles.value}>{value}</span></div>
            <input type="range" className={styles.input} min={param.min} max={param.max} step={param.step} value={value} onChange={(e) => updateParameter(param.name, parseFloat(e.target.value))} />
          </div>
        );
      })}
    </div>
  );
}
