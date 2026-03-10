import { useRef, useEffect } from 'react';
import styles from './MessageList.module.css';
import { UserMessage } from './UserMessage';
import { AssistantMessage } from './AssistantMessage';
import { ToolCallBlock } from './ToolCallBlock';
import { useSimulationContext } from '../simulation/SimulationContext';

export function MessageList() {
  const { state, toggleToolExpand } = useSimulationContext();
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (listRef.current) { listRef.current.scrollTop = listRef.current.scrollHeight; }
  }, [state.messages, state.streamedText, state.phase]);

  return (
    <div className={styles.list} ref={listRef}>
      <div className={styles.greeting}>
        <div className={styles.greetingAvatar}>✦</div>
        <div className={styles.greetingBubble}>
          I can help you explore mathematical concepts visually. Choose a formula from the dropdown or describe a concept you'd like to visualize!
        </div>
      </div>
      {state.messages.map((msg) => {
        if (msg.role === 'user') return <UserMessage key={msg.id} content={msg.content} />;
        if (msg.role === 'tool-call') return (
          <ToolCallBlock key={msg.id} toolName={msg.content} payload={msg.toolPayload} isExpanded={msg.isExpanded ?? false} onToggle={() => toggleToolExpand(msg.id)} />
        );
        if (msg.role === 'assistant') return <AssistantMessage key={msg.id} content={msg.content} />;
        return null;
      })}
      {state.phase === 'thinking' && (
        <div className={styles.thinking}>
          <div className={styles.thinkingAvatar}>✦</div>
          <div className={styles.thinkingText}>
            <span className={styles.thinkingDot}>●</span>{' '}
            {state.activeScenario?.thinking ?? 'Analyzing the mathematical concept...'}
          </div>
        </div>
      )}
      {state.phase === 'streaming' && state.streamedText && (
        <AssistantMessage content={state.streamedText} isStreaming />
      )}
    </div>
  );
}
