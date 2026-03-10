import styles from './App.module.css';
import { ChatPanel } from './components/ChatPanel';
import { VisualizationPanel } from './components/VisualizationPanel';
import { SimulationContext } from './simulation/SimulationContext';
import { useSimulation } from './simulation/useSimulation';

export function App() {
  const simulation = useSimulation();
  return (
    <SimulationContext.Provider value={simulation}>
      <div className={styles.app}>
        <ChatPanel />
        <VisualizationPanel />
      </div>
    </SimulationContext.Provider>
  );
}
