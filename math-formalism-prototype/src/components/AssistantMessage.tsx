import styles from './AssistantMessage.module.css';
interface AssistantMessageProps { content: string; isStreaming?: boolean; }
export function AssistantMessage({ content, isStreaming = false }: AssistantMessageProps) {
  return (
    <div className={styles.wrapper}>
      <div className={styles.avatar}>✦</div>
      <div className={styles.bubble}>
        {content}
        {isStreaming && <span className={styles.cursor} />}
      </div>
    </div>
  );
}
