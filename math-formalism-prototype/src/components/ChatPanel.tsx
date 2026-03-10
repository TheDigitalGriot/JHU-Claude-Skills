import styles from './ChatPanel.module.css';
import { MessageList } from './MessageList';
import { InputBar } from './InputBar';

export function ChatPanel() {
  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <div className={styles.logo}>✦</div>
        <span className={styles.title}>Claude</span>
        <span className={styles.subtitle}>Math Formalism Ideation</span>
      </div>
      <MessageList />
      <InputBar />
    </div>
  );
}
