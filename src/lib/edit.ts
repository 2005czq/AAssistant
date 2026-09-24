import { holdUI } from './api';

/** Mark UI as busy while an input or dropdown has focus. */
export function editLock(node: HTMLElement) {
  let releaseHold: (() => void) | null = null;

  function release() {
    if (releaseHold) {
      releaseHold();
      releaseHold = null;
    }
  }

  function focusIn() {
    if (!releaseHold) {
      releaseHold = holdUI();
    }
  }

  function focusOut(event: FocusEvent) {
    // focusout follows the input's blur/save handler.
    if (!(event.relatedTarget instanceof Node) || !node.contains(event.relatedTarget)) {
      release();
    }
  }

  node.addEventListener('focusin', focusIn);
  node.addEventListener('focusout', focusOut);
  window.addEventListener('blur', release);
  return {
    destroy() {
      node.removeEventListener('focusin', focusIn);
      node.removeEventListener('focusout', focusOut);
      window.removeEventListener('blur', release);
      release();
    }
  };
}
