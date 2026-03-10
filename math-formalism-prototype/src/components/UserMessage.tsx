import styles from './UserMessage.module.css';
interface UserMessageProps { content: string; }
export function UserMessage({ content }: UserMessageProps) {
  return (
    <div className={styles.wrapper}>
      <div className={styles.bubble}>{content}</div>
    </div>
  );
}
