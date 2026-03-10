import { useState, useCallback } from 'react';
import styles from './InputBar.module.css';
import type { Scenario } from '../types';
import { useSimulationContext } from '../simulation/SimulationContext';
import exponentialDecay from '../scenarios/exponential-decay.json';
import normalDistribution from '../scenarios/normal-distribution.json';

const scenarios: Record<string, Scenario> = {
  'exponential-decay': exponentialDecay as unknown as Scenario,
  'normal-distribution': normalDistribution as unknown as Scenario,
};
const scenarioLabels: Record<string, string> = {
  'exponential-decay': 'Exponential Decay',
  'normal-distribution': 'Normal Distribution',
};

export function InputBar() {
  const { state, startSimulation } = useSimulationContext();
  const [selectedKey, setSelectedKey] = useState('exponential-decay');
  const isRunning = state.phase !== 'idle' && state.phase !== 'complete';

  const handleSubmit = useCallback(() => {
    const scenario = scenarios[selectedKey];
    if (scenario) startSimulation(scenario);
  }, [selectedKey, startSimulation]);

  return (
    <div className={styles.bar}>
      <select className={styles.select} value={selectedKey} onChange={(e) => setSelectedKey(e.target.value)} disabled={isRunning}>
        {Object.entries(scenarioLabels).map(([key, label]) => (
          <option key={key} value={key}>{label}</option>
        ))}
      </select>
      <button className={styles.submit} onClick={handleSubmit} disabled={isRunning}>Submit</button>
    </div>
  );
}
