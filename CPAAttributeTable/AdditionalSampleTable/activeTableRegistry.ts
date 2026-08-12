let activeContainer: HTMLElement | null = null;

type Listener = (activeEl: HTMLElement | null) => void;
const listeners = new Set<Listener>();

export function setActiveTableContainer(el: HTMLElement | null) {
  if (activeContainer === el) return; // tránh notify thừa khi không đổi
  activeContainer = el;
  listeners.forEach((listener) => listener(activeContainer));
}

export function getActiveTableContainer(): HTMLElement | null {
  return activeContainer;
}

export function subscribeActiveTableContainer(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}