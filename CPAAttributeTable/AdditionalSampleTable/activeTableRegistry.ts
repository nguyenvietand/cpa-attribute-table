let activeContainer: HTMLElement | null = null;

export function setActiveTableContainer(el: HTMLElement | null) {
  activeContainer = el;
}

export function getActiveTableContainer(): HTMLElement | null {
  return activeContainer;
}