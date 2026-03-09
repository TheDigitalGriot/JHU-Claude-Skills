export type NavigateCallback = (direction: "prev" | "next") => void;
export type PlayCallback = (playing: boolean) => void;

const btnPrev = document.getElementById("btn-prev") as HTMLButtonElement;
const btnNext = document.getElementById("btn-next") as HTMLButtonElement;
const btnPlay = document.getElementById("btn-play") as HTMLButtonElement;
const stepIndicator = document.getElementById("step-indicator")!;

let isPlaying = false;
let playInterval: number | null = null;

export function initControls(
  onNavigate: NavigateCallback,
  onPlay: PlayCallback,
): void {
  btnPrev.addEventListener("click", () => onNavigate("prev"));
  btnNext.addEventListener("click", () => onNavigate("next"));
  btnPlay.addEventListener("click", () => {
    isPlaying = !isPlaying;
    btnPlay.innerHTML = isPlaying ? "&#9646;&#9646; Pause" : "&#9654; Play";
    onPlay(isPlaying);
  });
}

export function updateControls(
  currentStep: number,
  totalSteps: number,
): void {
  stepIndicator.textContent = `Step ${currentStep + 1} of ${totalSteps}`;
  btnPrev.disabled = currentStep <= 0;
  btnNext.disabled = currentStep >= totalSteps - 1;
  btnPrev.removeAttribute("disabled");
  btnNext.removeAttribute("disabled");
  if (currentStep <= 0) btnPrev.setAttribute("disabled", "");
  if (currentStep >= totalSteps - 1) btnNext.setAttribute("disabled", "");
}

export function enableControls(): void {
  btnPrev.disabled = false;
  btnNext.disabled = false;
  btnPlay.disabled = false;
}

export function setPlaying(playing: boolean): void {
  isPlaying = playing;
  btnPlay.innerHTML = isPlaying ? "&#9646;&#9646; Pause" : "&#9654; Play";
}

export function startAutoPlay(
  advanceFn: () => void,
  intervalMs = 3000,
): void {
  stopAutoPlay();
  playInterval = window.setInterval(advanceFn, intervalMs);
}

export function stopAutoPlay(): void {
  if (playInterval !== null) {
    clearInterval(playInterval);
    playInterval = null;
  }
}
