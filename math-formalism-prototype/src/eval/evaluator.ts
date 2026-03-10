import { evaluate } from 'mathjs';
import type { FormulaPayload, GraphState } from '../types';

export function evaluateWithParameters(
  payload: FormulaPayload,
  parameterValues: Record<string, number>,
  graphState: GraphState,
): GraphState {
  if (
    payload.graph.type !== 'function-plot' &&
    payload.graph.type !== 'distribution'
  ) {
    return graphState;
  }

  const expression = payload.graph.config.expression as string | undefined;
  if (!expression) return graphState;

  const xDomain = graphState.axes?.x?.domain ?? [-10, 10];
  const numPoints = 200;
  const step = (xDomain[1] - xDomain[0]) / numPoints;
  const data: Record<string, unknown>[] = [];

  for (let i = 0; i <= numPoints; i++) {
    const x = xDomain[0] + i * step;
    try {
      const scope = { x, ...parameterValues };
      const y = evaluate(expression, scope) as number;
      if (typeof y === 'number' && isFinite(y)) {
        data.push({ x, y });
      }
    } catch {
      /* Skip points that fail evaluation */
    }
  }

  return { ...graphState, data };
}
