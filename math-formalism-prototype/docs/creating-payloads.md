# Creating Custom Payloads

This guide explains how to create new scenario files for the Math Formalism Prototype.

## The Scenario Schema

Each scenario is a JSON file in `src/scenarios/` with this structure:

```json
{
  "prompt": "The user's question or request",
  "thinking": "Optional flavor text shown during the thinking phase",
  "toolCallName": "visualize_formula",
  "response": "Claude's text explanation that streams with typewriter effect",
  "payload": { }
}
```

## The FormulaPayload Schema

```json
{
  "formula": {
    "latex": "LaTeX expression (e.g., 'f(x) = x^2')",
    "description": "Human-readable description",
    "domain": "One of: calculus, linear-algebra, statistics, algebra, physics, finance, general"
  },
  "annotations": [
    {
      "id": "unique-id",
      "latexFragment": "The LaTeX substring to highlight",
      "label": "Short label",
      "description": "What this part of the formula means"
    }
  ],
  "steps": [
    {
      "id": "step-1",
      "title": "Step Title",
      "narrative": "Prose explanation of this step",
      "algebraDetail": "LaTeX showing the algebra for this step",
      "highlightIds": ["annotation-ids", "to-highlight"],
      "graphState": {
        "data": [],
        "axes": {
          "x": { "label": "x-axis label", "domain": [-10, 10] },
          "y": { "label": "y-axis label", "domain": [0, 100] }
        }
      }
    }
  ],
  "parameters": [
    {
      "name": "variable_name",
      "label": "Display Label",
      "min": 0,
      "max": 100,
      "default": 50,
      "step": 1
    }
  ],
  "graph": {
    "type": "One of: function-plot, distribution, scatter, bar, vector-field, surface-3d",
    "config": {
      "expression": "math.js expression using parameter names and x as the variable"
    }
  }
}
```

## Using Claude to Generate Payloads

### Prompt Template 1: From a concept

```
Generate a FormulaPayload JSON for the concept of [CONCEPT NAME].
Include 4 steps, annotations for each meaningful part, a math.js expression in graph.config.expression, and 2-3 interactive parameters.
```

### Prompt Template 2: From a formula

```
I want to visualize this formula: [FORMULA IN LATEX]
Generate a complete FormulaPayload JSON that breaks it into annotated components, creates 4 progressive steps, includes interactive parameters, and uses a math.js expression for the graph.
```

## Adding a Scenario to the Prototype

1. Save your JSON file to `src/scenarios/your-scenario.json`
2. Open `src/components/InputBar.tsx`
3. Add an import: `import yourScenario from '../scenarios/your-scenario.json';`
4. Add to the `scenarios` object: `'your-scenario': yourScenario as unknown as Scenario`
5. Add to `scenarioLabels`: `'your-scenario': 'Your Scenario Name'`

## Tips

- Keep `graphState.data` arrays empty for `function-plot` and `distribution` types
- Parameter names in the expression must match the `name` field in `parameters`
- Use `x` as the independent variable in expressions
- Test your expression at [mathjs.org](https://mathjs.org/) before adding it
