import katex from "katex";
import type { StepV2 } from "../types.js";

const scrollPanel = document.getElementById("scroll-panel")!;

/**
 * Render all step cards into the scroll panel.
 * Returns the created card elements for ScrollTrigger binding.
 */
export function renderSteps(steps: StepV2[]): HTMLElement[] {
  scrollPanel.innerHTML = "";
  const cards: HTMLElement[] = [];

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    const card = document.createElement("div");
    card.className = "step-card";
    card.dataset.stepIndex = String(i);
    card.dataset.stepId = step.id;

    const numberEl = document.createElement("div");
    numberEl.className = "step-number";
    numberEl.textContent = `Step ${i + 1}`;

    const titleEl = document.createElement("div");
    titleEl.className = "step-title";
    titleEl.textContent = step.title;

    const narrativeEl = document.createElement("div");
    narrativeEl.className = "step-narrative";
    narrativeEl.textContent = step.narrative;

    // Only show algebra toggle if algebraDetail is present
    if (step.algebraDetail) {
      const toggleBtn = document.createElement("button");
      toggleBtn.className = "expand-toggle";
      toggleBtn.textContent = "Show algebra \u25B8";

      const algebraEl = document.createElement("div");
      algebraEl.className = "algebra-detail";

      katex.render(step.algebraDetail, algebraEl, {
        displayMode: true,
        throwOnError: false,
      });

      toggleBtn.addEventListener("click", () => {
        const isExpanded = algebraEl.classList.toggle("expanded");
        toggleBtn.textContent = isExpanded
          ? "Hide algebra \u25BE"
          : "Show algebra \u25B8";
      });

      card.append(numberEl, titleEl, narrativeEl, toggleBtn, algebraEl);
    } else {
      card.append(numberEl, titleEl, narrativeEl);
    }
    scrollPanel.appendChild(card);
    cards.push(card);
  }

  return cards;
}

/**
 * Set the active step card (visual highlight).
 */
export function setActiveStep(index: number, cards: HTMLElement[]): void {
  for (let i = 0; i < cards.length; i++) {
    cards[i].classList.toggle("active", i === index);
  }
}
