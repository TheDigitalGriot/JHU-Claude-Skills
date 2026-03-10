import type { Scenario, SimulationPhase, Message, FormulaPayload } from '../types';

export type SimulationAction =
  | { type: 'START_SIMULATION'; scenario: Scenario }
  | { type: 'ADVANCE_PHASE'; phase: SimulationPhase; message?: Message }
  | { type: 'STREAM_TEXT'; text: string }
  | { type: 'SET_PAYLOAD'; payload: FormulaPayload }
  | { type: 'SET_STEP'; index: number }
  | { type: 'UPDATE_PARAMETER'; name: string; value: number }
  | { type: 'TOGGLE_TOOL_EXPAND'; messageId: string }
  | { type: 'TOGGLE_PLAY' };

let idCounter = 0;
function nextId(): string {
  return `msg-${++idCounter}`;
}

export function runSimulation(
  scenario: Scenario,
  dispatch: (action: SimulationAction) => void,
): () => void {
  const timeouts: ReturnType<typeof setTimeout>[] = [];

  function schedule(fn: () => void, delay: number) {
    timeouts.push(setTimeout(fn, delay));
  }

  let elapsed = 0;

  // 1. User message appears instantly
  dispatch({
    type: 'ADVANCE_PHASE',
    phase: 'thinking',
    message: { id: nextId(), role: 'user', content: scenario.prompt },
  });

  // 2. Thinking indicator (400ms) - phase already set

  // 3. Tool call appears (1.2s after thinking starts)
  elapsed += 1600;
  schedule(() => {
    dispatch({
      type: 'ADVANCE_PHASE',
      phase: 'tool-call',
      message: {
        id: nextId(),
        role: 'tool-call',
        content: scenario.toolCallName,
        toolPayload: scenario.payload,
        isExpanded: false,
      },
    });
  }, elapsed);

  // 4. Response streaming begins (600ms after tool call)
  elapsed += 600;
  const streamStart = elapsed;
  const responseText = scenario.response;
  const charDelay = 30;

  schedule(() => {
    dispatch({ type: 'ADVANCE_PHASE', phase: 'streaming' });
    dispatch({ type: 'SET_PAYLOAD', payload: scenario.payload });

    for (let i = 0; i <= responseText.length; i++) {
      schedule(() => {
        dispatch({ type: 'STREAM_TEXT', text: responseText.slice(0, i) });
        if (i === responseText.length) {
          dispatch({
            type: 'ADVANCE_PHASE',
            phase: 'complete',
            message: { id: nextId(), role: 'assistant', content: responseText },
          });
        }
      }, i * charDelay);
    }
  }, streamStart);

  return () => {
    timeouts.forEach(clearTimeout);
  };
}
