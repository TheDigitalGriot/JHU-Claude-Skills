import { useReducer, useCallback, useRef } from 'react';
import type { SimulationState, Scenario } from '../types';
import { type SimulationAction, runSimulation } from './engine';
import { evaluateWithParameters } from '../eval/evaluator';

const initialState: SimulationState = {
  phase: 'idle',
  messages: [],
  activeScenario: null,
  payload: null,
  activeStepIndex: 0,
  parameterValues: {},
  isPlaying: false,
  streamedText: '',
};

function reducer(state: SimulationState, action: SimulationAction): SimulationState {
  switch (action.type) {
    case 'START_SIMULATION':
      return { ...initialState, phase: 'idle', activeScenario: action.scenario };
    case 'ADVANCE_PHASE': {
      const messages = action.message
        ? [...state.messages, action.message]
        : state.messages;
      return {
        ...state,
        phase: action.phase,
        messages,
        streamedText: action.phase === 'complete' ? '' : state.streamedText,
      };
    }
    case 'STREAM_TEXT':
      return { ...state, streamedText: action.text };
    case 'SET_PAYLOAD': {
      const parameterValues: Record<string, number> = {};
      for (const p of action.payload.parameters) {
        parameterValues[p.name] = p.default;
      }
      return {
        ...state,
        payload: action.payload,
        parameterValues,
        activeStepIndex: 0,
      };
    }
    case 'SET_STEP':
      return { ...state, activeStepIndex: action.index };
    case 'UPDATE_PARAMETER':
      return {
        ...state,
        parameterValues: {
          ...state.parameterValues,
          [action.name]: action.value,
        },
      };
    case 'TOGGLE_TOOL_EXPAND':
      return {
        ...state,
        messages: state.messages.map((m) =>
          m.id === action.messageId ? { ...m, isExpanded: !m.isExpanded } : m,
        ),
      };
    case 'TOGGLE_PLAY':
      return { ...state, isPlaying: !state.isPlaying };
    default:
      return state;
  }
}

export function useSimulation() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const cancelRef = useRef<(() => void) | null>(null);

  const startSimulation = useCallback((scenario: Scenario) => {
    cancelRef.current?.();
    dispatch({ type: 'START_SIMULATION', scenario });
    const cancel = runSimulation(scenario, dispatch);
    cancelRef.current = cancel;
  }, []);

  const setStep = useCallback((index: number) => {
    dispatch({ type: 'SET_STEP', index });
  }, []);

  const updateParameter = useCallback((name: string, value: number) => {
    dispatch({ type: 'UPDATE_PARAMETER', name, value });
  }, []);

  const togglePlay = useCallback(() => {
    dispatch({ type: 'TOGGLE_PLAY' });
  }, []);

  const toggleToolExpand = useCallback((messageId: string) => {
    dispatch({ type: 'TOGGLE_TOOL_EXPAND', messageId });
  }, []);

  const graphData =
    state.payload
      ? evaluateWithParameters(
          state.payload,
          state.parameterValues,
          state.payload.steps[state.activeStepIndex]?.graphState ?? { data: [] },
        )
      : null;

  return {
    state,
    graphData,
    startSimulation,
    setStep,
    updateParameter,
    togglePlay,
    toggleToolExpand,
    dispatch,
  };
}
