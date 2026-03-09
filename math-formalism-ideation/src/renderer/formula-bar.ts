import katex from "katex";
import type { Annotation, Parameter } from "../types.js";
import { getAnnotationColor } from "../types.js";

const formulaDisplay = document.getElementById("formula-display")!;
const parameterValuesEl = document.getElementById("parameter-values")!;

/**
 * Wraps each annotation's latexFragment in a \htmlClass{} macro so we can
 * target sub-expressions with data attributes for highlighting.
 *
 * KaTeX supports \htmlClass, \htmlId, and \htmlData for custom attributes.
 * We use \htmlClass to apply a CSS class with the annotation ID.
 */
function buildAnnotatedLatex(
  latex: string,
  annotations: Annotation[],
): string {
  let annotatedLatex = latex;

  for (const annotation of annotations) {
    // Wrap the first occurrence of the fragment in \htmlClass
    const escaped = annotation.latexFragment.replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&",
    );
    const regex = new RegExp(escaped);
    annotatedLatex = annotatedLatex.replace(
      regex,
      `\\htmlClass{ann-${annotation.id}}{${annotation.latexFragment}}`,
    );
  }

  return annotatedLatex;
}

/**
 * Render the formula into the formula bar with KaTeX.
 */
export function renderFormulaBar(
  latex: string,
  annotations: Annotation[],
): void {
  const annotatedLatex = buildAnnotatedLatex(latex, annotations);

  katex.render(annotatedLatex, formulaDisplay, {
    displayMode: true,
    throwOnError: false,
    trust: true, // Required for \htmlClass
  });

  // After rendering, find each annotation span and add data attributes + color
  for (let i = 0; i < annotations.length; i++) {
    const annotation = annotations[i];
    const elements = formulaDisplay.querySelectorAll(`.ann-${annotation.id}`);
    elements.forEach((el) => {
      (el as HTMLElement).dataset.annotationId = annotation.id;
      (el as HTMLElement).title = annotation.label;
      (el as HTMLElement).style.setProperty(
        "--highlight-color",
        getAnnotationColor(i),
      );
    });
  }
}

/**
 * Update the parameter values display beneath the formula.
 */
export function updateParameterDisplay(
  parameters: Parameter[],
  values: Record<string, number>,
): void {
  parameterValuesEl.innerHTML = parameters
    .map((p) => {
      const val = values[p.name] ?? p.default;
      return `<span>${p.name} = ${val}</span>`;
    })
    .join("");
}
