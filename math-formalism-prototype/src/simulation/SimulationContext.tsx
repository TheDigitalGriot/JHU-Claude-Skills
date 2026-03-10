import { createContext, useContext } from 'react';
import type { SimulationState, Scenario, GraphState } from '../types';

interface SimulationContextValue {
  state: SimulationState;
  graphData: GraphState | null;
  startSimulation: (scenario: Scenario) => void;
  setStep: (index: number) => void;
  updateParameter: (name: string, value: number) => void;
  togglePlay: () => void;
  toggleToolExpand: (messageId: string) => void;
}

export const SimulationContext = createContext<SimulationContextValue | null>(null);

export function useSimulationContext(): SimulationContextValue {
  const ctx = useContext(SimulationContext);
  if (!ctx)
    throw new Error(
      'useSimulationContext must be used within SimulationContext.Provider',
    );
  return ctx;
}
