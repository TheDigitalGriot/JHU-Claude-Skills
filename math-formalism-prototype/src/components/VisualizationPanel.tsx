import styles from './VisualizationPanel.module.css';
import { FormulaBar } from './FormulaBar';
import { StepCards } from './StepCards';
import { GraphPanel } from './GraphPanel';
import { ParameterSliders } from './ParameterSliders';
import { StepControls } from './StepControls';
import { useSimulationContext } from '../simulation/SimulationContext';

export function VisualizationPanel() {
  const { state } = useSimulationContext();
  if (!state.payload) {
    return (<div className={styles.panel}><div className={styles.empty}>Submit a prompt to see the visualization</div></div>);
  }
  return (
    <div className={styles.panel}>
      <FormulaBar />
      <div className={styles.contentArea}>
        <StepCards />
        <div className={styles.stickyRight}>
          <GraphPanel />
          <ParameterSliders />
        </div>
      </div>
      <StepControls />
    </div>
  );
}
