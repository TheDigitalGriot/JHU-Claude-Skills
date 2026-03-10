import styles from './ToolCallBlock.module.css';
import type { FormulaPayload } from '../types';
interface ToolCallBlockProps { toolName: string; payload?: FormulaPayload; isExpanded: boolean; onToggle: () => void; }
export function ToolCallBlock({ toolName, payload, isExpanded, onToggle }: ToolCallBlockProps) {
  return (
    <div className={styles.wrapper}>
      <div className={styles.header} onClick={onToggle}>
        <span className={`${styles.arrow} ${isExpanded ? styles.arrowExpanded : ''}`}>▶</span>
        <span className={styles.toolName}>Using {toolName}</span>
        <span className={styles.hint}>{isExpanded ? 'click to collapse' : 'click to expand'}</span>
      </div>
      {isExpanded && payload && (
        <div className={styles.payload}>{JSON.stringify(payload, null, 2)}</div>
      )}
    </div>
  );
}
