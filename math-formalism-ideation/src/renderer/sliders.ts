import type { Parameter } from "../types.js";

const slidersContainer = document.getElementById("sliders-container")!;

export type SliderChangeCallback = (values: Record<string, number>) => void;

let currentValues: Record<string, number> = {};

/**
 * Render parameter sliders. Returns initial values.
 */
export function renderSliders(
  parameters: Parameter[],
  onChange: SliderChangeCallback,
): Record<string, number> {
  slidersContainer.innerHTML = "";
  currentValues = {};

  if (parameters.length === 0) {
    slidersContainer.style.display = "none";
    return currentValues;
  }

  slidersContainer.style.display = "block";

  for (const param of parameters) {
    currentValues[param.name] = param.default;

    const group = document.createElement("div");
    group.className = "slider-group";

    const label = document.createElement("label");

    const nameSpan = document.createElement("span");
    nameSpan.textContent = param.label;

    const valueSpan = document.createElement("span");
    valueSpan.className = "slider-value";
    valueSpan.textContent = String(param.default);

    label.append(nameSpan, valueSpan);

    const input = document.createElement("input");
    input.type = "range";
    input.min = String(param.min);
    input.max = String(param.max);
    input.step = String(param.step);
    input.value = String(param.default);

    input.addEventListener("input", () => {
      const val = parseFloat(input.value);
      currentValues[param.name] = val;
      valueSpan.textContent = String(val);
      onChange({ ...currentValues });
    });

    group.append(label, input);
    slidersContainer.appendChild(group);
  }

  return { ...currentValues };
}

export function getSliderValues(): Record<string, number> {
  return { ...currentValues };
}
