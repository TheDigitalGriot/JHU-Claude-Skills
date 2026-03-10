import { useRef, useEffect } from 'react';
import * as Plot from '@observablehq/plot';
import gsap from 'gsap';
import styles from './GraphPanel.module.css';
import { useSimulationContext } from '../simulation/SimulationContext';
import type { Annotation, GraphState, GraphType } from '../types';
import { getAnnotationColor } from '../types';

function buildPlot(
  container: HTMLElement, graphType: GraphType, graphState: GraphState,
  _config: Record<string, unknown>, annotations?: Annotation[],
): HTMLElement | SVGElement {
  const marks: Plot.Markish[] = [];
  const width = container.clientWidth - 32;
  const height = Math.max(250, container.clientHeight - 32);
  const options: Plot.PlotOptions = {
    width, height,
    style: { background: 'transparent', color: '#999' },
    x: { label: graphState.axes?.x?.label ?? 'x', domain: graphState.axes?.x?.domain },
    y: { label: graphState.axes?.y?.label ?? 'y', domain: graphState.axes?.y?.domain },
  };

  switch (graphType) {
    case 'function-plot':
      marks.push(Plot.line(graphState.data, { x: 'x', y: 'y', stroke: '#6366f1', strokeWidth: 2 }), Plot.gridX(), Plot.gridY());
      break;
    case 'distribution':
      marks.push(
        Plot.areaY(graphState.data, { x: 'x', y: 'y', fill: '#6366f1', fillOpacity: 0.3 }),
        Plot.line(graphState.data, { x: 'x', y: 'y', stroke: '#6366f1', strokeWidth: 2 }),
        Plot.gridX(), Plot.gridY(),
      );
      break;
    case 'scatter':
      marks.push(Plot.dot(graphState.data, { x: 'x', y: 'y', fill: '#6366f1', r: 3 }), Plot.gridX(), Plot.gridY());
      break;
    default:
      marks.push(Plot.line(graphState.data, { x: 'x', y: 'y', stroke: '#6366f1' }), Plot.gridX(), Plot.gridY());
  }

  if (graphState.highlightRegions) {
    for (const region of graphState.highlightRegions) {
      const annIndex = annotations?.findIndex(a => a.id === region.annotationId) ?? 0;
      const color = getAnnotationColor(Math.max(0, annIndex));
      if (region.type === 'point') {
        marks.push(Plot.dot([region.coords], { x: 'x', y: 'y', r: 6, fill: color, fillOpacity: 0.8 }));
      }
    }
  }
  return Plot.plot({ ...options, marks });
}

export function GraphPanel() {
  const { state, graphData } = useSimulationContext();
  const containerRef = useRef<HTMLDivElement>(null);
  const payload = state.payload;

  useEffect(() => {
    if (!containerRef.current || !payload || !graphData) return;
    containerRef.current.innerHTML = '';
    if (graphData.data.length === 0) return;
    const plot = buildPlot(containerRef.current, payload.graph.type, graphData, payload.graph.config, payload.annotations);
    containerRef.current.appendChild(plot);
    gsap.from(plot, { opacity: 0, scale: 0.95, duration: 0.5, ease: 'power2.out' });
  }, [payload, graphData, state.activeStepIndex]);

  return (
    <div className={styles.panel}>
      <div className={styles.container} ref={containerRef}>
        {!payload && <span className={styles.placeholder}>Graph will appear here</span>}
      </div>
    </div>
  );
}
