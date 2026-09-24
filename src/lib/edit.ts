import { holdUserEdit, showEditError } from './api';

/** Keep the edit lock while an input or dropdown has focus. */
export function editLock(node: HTMLElement) {
  let hold: ReturnType<typeof holdUserEdit> | null = null;

  function release() {
    hold?.release();
    hold = null;
  }

  function focusIn() {
    if (hold) return;
    const current = hold = holdUserEdit();
    void current.ready.then((result) => {
      if (hold !== current) return;
      if (!result.ok) { release(); showEditError(result.error); }
      else if (!node.contains(document.activeElement)) release();
    });
  }

  function focusOut(event: FocusEvent) {
    // focusout follows the input's blur/save handler.
    if (!(event.relatedTarget instanceof Node) || !node.contains(event.relatedTarget)) release();
  }

  node.addEventListener('focusin', focusIn);
  node.addEventListener('focusout', focusOut);
  window.addEventListener('blur', release);
  return { destroy() {
    node.removeEventListener('focusin', focusIn);
    node.removeEventListener('focusout', focusOut);
    window.removeEventListener('blur', release);
    release();
  } };
}
