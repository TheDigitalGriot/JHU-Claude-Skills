import gsap from "gsap";
import type { SceneDirective, VisualHint, SceneMood } from "../types.js";

// ─── Primitive Renderer Interface ───

export interface PrimitiveRenderer {
  /**
   * Create SVG elements for this primitive and return a GSAP timeline
   * that animates them. Elements should be appended to the provided SVG group.
   */
  render(
    group: SVGGElement,
    config: VisualHint["config"],
    width: number,
    height: number,
    duration: number,
  ): gsap.core.Timeline;
}

// ─── Registry ───

const primitives = new Map<string, PrimitiveRenderer>();

export function registerPrimitive(name: string, renderer: PrimitiveRenderer): void {
  primitives.set(name, renderer);
}

// ─── Mood Presets ───

const MOOD_PRESETS: Record<SceneMood, { ease: string; colorAccent: string; timeScale: number }> = {
  dramatic: { ease: "power3.inOut", colorAccent: "#f59e0b", timeScale: 0.8 },
  calm: { ease: "sine.inOut", colorAccent: "#60a5fa", timeScale: 0.6 },
  urgent: { ease: "power2.out", colorAccent: "#ef4444", timeScale: 1.3 },
  analytical: { ease: "linear", colorAccent: "#60a5fa", timeScale: 1.0 },
};

// ─── Engine State ───

let currentTimeline: gsap.core.Timeline | null = null;
let sceneGroup: SVGGElement | null = null;

/**
 * Build and play a scene from a SceneDirective.
 * Returns the master timeline for external control.
 */
export function playScene(
  svgElement: SVGSVGElement,
  directive: SceneDirective,
  onComplete?: () => void,
): gsap.core.Timeline {
  // Kill any existing scene
  stopScene();

  const width = svgElement.clientWidth || parseInt(svgElement.getAttribute("width") ?? "400");
  const height = svgElement.clientHeight || parseInt(svgElement.getAttribute("height") ?? "300");

  // Create scene group
  const ns = "http://www.w3.org/2000/svg";
  sceneGroup = document.createElementNS(ns, "g");
  sceneGroup.setAttribute("class", "scene-group");
  svgElement.appendChild(sceneGroup);

  const mood = MOOD_PRESETS[directive.mood ?? "analytical"];
  const totalDuration = directive.duration ?? 2000;
  const hintCount = directive.visualHints.length;
  const perHintDuration = hintCount > 0 ? totalDuration / hintCount : totalDuration;

  // Build master timeline
  const master = gsap.timeline({
    onComplete: () => {
      onComplete?.();
    },
  });
  master.timeScale(mood.timeScale);

  // Add narrative text
  const narrativeEl = document.createElementNS(ns, "text");
  narrativeEl.setAttribute("x", String(width / 2));
  narrativeEl.setAttribute("y", String(height - 20));
  narrativeEl.setAttribute("text-anchor", "middle");
  narrativeEl.setAttribute("fill", "var(--color-text-secondary)");
  narrativeEl.setAttribute("font-size", "13");
  narrativeEl.setAttribute("class", "scene-narrative");
  narrativeEl.textContent = directive.narrative;
  sceneGroup.appendChild(narrativeEl);

  master.from(narrativeEl, { opacity: 0, y: "+=10", duration: 0.4, ease: mood.ease });

  // Compose primitives sequentially
  let timeOffset = 0.4; // after narrative fade-in

  for (const hint of directive.visualHints) {
    const renderer = primitives.get(hint.primitive);
    if (!renderer) {
      console.warn(`Unknown scene primitive: ${hint.primitive}`);
      continue;
    }

    const hintGroup = document.createElementNS(ns, "g");
    hintGroup.setAttribute("class", `primitive-${hint.primitive}`);
    sceneGroup.appendChild(hintGroup);

    const extraDelay = (hint.config?.delay ?? 0) / 1000;
    const hintDurationSec = perHintDuration / 1000;

    try {
      const primitiveTimeline = renderer.render(
        hintGroup,
        hint.config,
        width,
        height,
        hintDurationSec,
      );

      master.add(primitiveTimeline, timeOffset + extraDelay);
      timeOffset += hintDurationSec + extraDelay;
    } catch (err) {
      console.warn(`Scene primitive "${hint.primitive}" failed:`, err);
      sceneGroup.removeChild(hintGroup);
    }
  }

  currentTimeline = master;
  return master;
}

/**
 * Play a looping scene (for loading state).
 */
export function playLoopingScene(
  svgElement: SVGSVGElement,
  directive: SceneDirective,
): gsap.core.Timeline {
  const timeline = playScene(svgElement, directive);
  timeline.repeat(-1).repeatDelay(0.5);
  return timeline;
}

/**
 * Stop the current scene and clean up.
 */
export function stopScene(): void {
  if (currentTimeline) {
    currentTimeline.kill();
    currentTimeline = null;
  }
  if (sceneGroup) {
    sceneGroup.remove();
    sceneGroup = null;
  }
}

/**
 * Signal the scene to wrap up — plays exit animation.
 * Returns a promise that resolves when the exit is complete.
 */
export function exitScene(duration: number = 400): Promise<void> {
  return new Promise((resolve) => {
    if (!sceneGroup || !currentTimeline) {
      resolve();
      return;
    }

    // Stop looping
    currentTimeline.repeat(0);

    // Tag elements for potential handoff
    const elements = sceneGroup.querySelectorAll("circle, rect, line, path, ellipse");
    elements.forEach(el => {
      el.setAttribute("data-handoff", "true");
    });

    // Fade out narrative
    const narrative = sceneGroup.querySelector(".scene-narrative");
    if (narrative) {
      gsap.to(narrative, { opacity: 0, duration: duration / 1000 });
    }

    // Resolve after duration (handoff elements remain)
    setTimeout(resolve, duration);
  });
}

/**
 * Clean up scene elements after handoff is complete.
 */
export function cleanupAfterHandoff(): void {
  if (sceneGroup) {
    // Remove only non-handoff elements; handoff elements are now owned by chart engine
    const nonHandoff = sceneGroup.querySelectorAll(":not([data-handoff])");
    nonHandoff.forEach(el => el.remove());

    // Remove the scene group if empty
    if (sceneGroup.childElementCount === 0) {
      sceneGroup.remove();
    }
    sceneGroup = null;
  }
  currentTimeline = null;
}
