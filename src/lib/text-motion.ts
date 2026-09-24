import { canAnimate, onMotionDisabled } from './motion';
import { graphemes } from './utils';

type Span = { type: 'equal' | 'insert' | 'delete'; start: number; end: number };
type Partition = { a0: number; a1: number; b0: number; b1: number };
type TextEdit = { type: 'insert' | 'delete'; index: number; text: string };

const WORK_PER_YIELD = 256;
const PLANNING_SLICE_MS = 3;

/**
 * Find a middle point on a shortest edit path (Myers' bidirectional search).
 * Coordinates refer to the original arrays, so recursive partitions need no
 * copies. Only two O(N + M) frontiers are retained, not an O(D²) trace.
 * Yielding is cooperative; it changes scheduling, never the chosen edit path.
 */
function* bisect(a: string[], b: string[], a0: number, a1: number, b0: number, b1: number): Generator<void, { a: number; b: number } | null> {
  const n = a1 - a0;
  const m = b1 - b0;
  const depth = Math.ceil((n + m) / 2);
  const offset = depth + 1;
  const forward = new Int32Array(2 * depth + 3).fill(-1);
  const backward = new Int32Array(2 * depth + 3).fill(-1);
  forward[offset + 1] = backward[offset + 1] = 0;
  const delta = n - m;
  const odd = delta % 2 !== 0;
  let forwardStart = 0;
  let forwardEnd = 0;
  let backwardStart = 0;
  let backwardEnd = 0;
  let work = 0;

  for (let d = 0; d <= depth; d += 1) {
    for (let k = -d + forwardStart; k <= d - forwardEnd; k += 2) {
      const index = offset + k;
      let x = k === -d || (k !== d && forward[index - 1] < forward[index + 1])
        ? forward[index + 1] : forward[index - 1] + 1;
      let y = x - k;
      while (x < n && y < m && a[a0 + x] === b[b0 + y]) {
        x += 1;
        y += 1;
        if (++work % WORK_PER_YIELD === 0) yield;
      }
      forward[index] = x;
      if (x > n) forwardEnd += 2;
      else if (y > m) forwardStart += 2;
      else if (odd) {
        const opposite = offset + delta - k;
        if (opposite >= 0 && opposite < backward.length && backward[opposite] !== -1
            && x >= n - backward[opposite]) {
          return { a: a0 + x, b: b0 + y };
        }
      }
      if (++work % WORK_PER_YIELD === 0) yield;
    }

    for (let k = -d + backwardStart; k <= d - backwardEnd; k += 2) {
      const index = offset + k;
      let x = k === -d || (k !== d && backward[index - 1] < backward[index + 1])
        ? backward[index + 1] : backward[index - 1] + 1;
      let y = x - k;
      while (x < n && y < m && a[a1 - x - 1] === b[b1 - y - 1]) {
        x += 1;
        y += 1;
        if (++work % WORK_PER_YIELD === 0) yield;
      }
      backward[index] = x;
      if (x > n) backwardEnd += 2;
      else if (y > m) backwardStart += 2;
      else if (!odd) {
        const opposite = offset + delta - k;
        if (opposite >= 0 && opposite < forward.length && forward[opposite] !== -1
            && forward[opposite] >= n - x) {
          const splitX = forward[opposite];
          return { a: a0 + splitX, b: b0 + splitX - (delta - k) };
        }
      }
      if (++work % WORK_PER_YIELD === 0) yield;
    }
  }
  return null;
}

function* spansFor(a: string[], b: string[]): Generator<void, Span[]> {
  const spans: Span[] = [];
  const pending: Array<Span | Partition> = [{ a0: 0, a1: a.length, b0: 0, b1: b.length }];
  let work = 0;

  while (pending.length) {
    const part = pending.pop()!;
    if ('type' in part) {
      spans.push(part);
      continue;
    }
    let { a0, a1, b0, b1 } = part;
    const prefixStart = a0;
    while (a0 < a1 && b0 < b1 && a[a0] === b[b0]) {
      a0 += 1;
      b0 += 1;
      if (++work % WORK_PER_YIELD === 0) yield;
    }
    if (a0 > prefixStart) spans.push({ type: 'equal', start: prefixStart, end: a0 });

    const suffixEnd = a1;
    while (a0 < a1 && b0 < b1 && a[a1 - 1] === b[b1 - 1]) {
      a1 -= 1;
      b1 -= 1;
      if (++work % WORK_PER_YIELD === 0) yield;
    }
    if (a1 < suffixEnd) pending.push({ type: 'equal', start: a1, end: suffixEnd });

    if (a0 === a1) {
      if (b0 < b1) spans.push({ type: 'insert', start: b0, end: b1 });
      continue;
    }
    if (b0 === b1) {
      spans.push({ type: 'delete', start: a0, end: a1 });
      continue;
    }

    if (a1 - a0 === 1 || b1 - b0 === 1) {
      const singleA = a1 - a0 === 1;
      const longer = singleA ? b : a;
      const start = singleA ? b0 : a0;
      const end = singleA ? b1 : a1;
      const value = singleA ? a[a0] : b[b0];
      const type = singleA ? 'insert' : 'delete';
      let match = -1;
      for (let i = start; i < end; i += 1) {
        if (longer[i] === value) { match = i; break; }
        if (++work % WORK_PER_YIELD === 0) yield;
      }
      if (match === -1) {
        spans.push({ type: 'delete', start: a0, end: a1 });
        spans.push({ type: 'insert', start: b0, end: b1 });
      } else {
        if (match > start) spans.push({ type, start, end: match });
        spans.push({ type: 'equal', start: singleA ? a0 : match, end: (singleA ? a0 : match) + 1 });
        if (match + 1 < end) spans.push({ type, start: match + 1, end });
      }
      continue;
    }

    // An empty alphabet intersection proves LCS = 0. This exact shortcut makes
    // a large Chinese-to-Latin (or entirely different) replacement inexpensive.
    if (Math.min(a1 - a0, b1 - b0) > 64) {
      const alphabet = new Set();
      for (let i = a0; i < a1; i += 1) {
        alphabet.add(a[i]);
        if (++work % WORK_PER_YIELD === 0) yield;
      }
      let shared = false;
      for (let i = b0; i < b1; i += 1) {
        if (alphabet.has(b[i])) { shared = true; break; }
        if (++work % WORK_PER_YIELD === 0) yield;
      }
      if (!shared) {
        spans.push({ type: 'delete', start: a0, end: a1 });
        spans.push({ type: 'insert', start: b0, end: b1 });
        continue;
      }
    }

    const split = yield* bisect(a, b, a0, a1, b0, b1);
    if (!split) {
      spans.push({ type: 'delete', start: a0, end: a1 });
      spans.push({ type: 'insert', start: b0, end: b1 });
      continue;
    }
    if ((split.a === a0 && split.b === b0) || (split.a === a1 && split.b === b1)) {
      throw new Error('Shortest edit path did not partition the text.');
    }
    pending.push({ a0: split.a, a1, b0: split.b, b1 });
    pending.push({ a0, a1: split.a, b0, b1: split.b });
  }
  return spans;
}

function* planFor(a: string[], b: string[]): Generator<void, TextEdit[]> {
  const spans = yield* spansFor(a, b);
  const plan: TextEdit[] = [];
  let cursor = 0;
  let work = 0;
  for (let i = 0; i < spans.length;) {
    if (spans[i].type === 'equal') {
      cursor += spans[i].end - spans[i].start;
      i += 1;
      continue;
    }
    const removed: string[] = [];
    const added: string[] = [];
    while (i < spans.length && spans[i].type !== 'equal') {
      const span = spans[i++];
      const source = span.type === 'delete' ? a : b;
      const destination = span.type === 'delete' ? removed : added;
      for (let j = span.start; j < span.end; j += 1) {
        destination.push(source[j]);
        if (++work % WORK_PER_YIELD === 0) yield;
      }
    }
    // Backspace each changed run, then type its replacement left to right.
    // Ordering within a changed run does not alter the minimum edit count.
    for (let j = removed.length - 1; j >= 0; j -= 1) {
      plan.push({ type: 'delete', index: cursor + j, text: removed[j] });
      if (++work % WORK_PER_YIELD === 0) yield;
    }
    for (let j = 0; j < added.length; j += 1) {
      plan.push({ type: 'insert', index: cursor + j, text: added[j] });
      if (++work % WORK_PER_YIELD === 0) yield;
    }
    cursor += added.length;
  }
  return plan;
}

/**
 * Animate an aria-hidden visual text layer. Keep the complete target in a
 * separate stable accessible node and use the target as the copy/export source.
 * set() resolves true on completion, false when superseded or destroyed.
 */
export function createTextMorph(element: HTMLElement) {
  let target = element.textContent ?? '';
  let running = false;
  let destroyed = false;
  let frame: number | null = null;
  let revision = 0;
  let resolveCurrent: ((finished: boolean) => void) | null = null;
  let currentPromise = Promise.resolve(true);

  function finish(value: boolean) {
    running = false;
    if (frame !== null) cancelAnimationFrame(frame);
    frame = null;
    const resolve = resolveCurrent;
    resolveCurrent = null;
    resolve?.(value);
  }

  function showTarget() {
    element.textContent = target;
    finish(true);
  }

  const unsubscribe = onMotionDisabled(() => {
    if (running) { revision += 1; showTarget(); }
  });

  return {
    set(next: string) {
      if (destroyed) return Promise.resolve(false);
      if (next === target && running && canAnimate()) return currentPromise;
      revision += 1;
      const ownRevision = revision;
      finish(false);
      target = next;
      if (!canAnimate() || element.textContent === next) {
        element.textContent = next;
        currentPromise = Promise.resolve(true);
        return currentPromise;
      }

      // Read the displayed text, not the previous requested target. A canceled
      // deletion/typing pass can never append its remaining stale characters.
      const current = graphemes(element.textContent ?? '');
      const planner = planFor(current, graphemes(next));
      running = true;
      currentPromise = new Promise((resolve) => { resolveCurrent = resolve; });

      function begin(plan: TextEdit[]) {
        if (!plan.length) { showTarget(); return; }
        const erasing = plan.every((edit) => edit.type === 'delete');
        const duration = Math.min(
          erasing ? 200 : 360,
          Math.max(100, plan.length * (erasing ? 3 : 6)),
        );
        const start = performance.now();
        let applied = 0;

        function paint(now: number) {
          if (ownRevision !== revision || destroyed) return;
          const progress = Math.min(1, Math.max(0, (now - start) / duration));
          const count = Math.floor(progress * plan.length);
          if (count > applied) {
            while (applied < count) {
              const edit = plan[applied++];
              if (edit.type === 'delete') current.splice(edit.index, 1);
              else current.splice(edit.index, 0, edit.text);
            }
            element.textContent = current.join('');
          }
          if (progress === 1) showTarget();
          else frame = requestAnimationFrame(paint);
        }
        frame = requestAnimationFrame(paint);
      }

      function planSlice() {
        if (ownRevision !== revision || destroyed) return;
        const sliceStart = performance.now();
        let result;
        do {
          result = planner.next();
          if (result.done) { begin(result.value); return; }
        } while (performance.now() - sliceStart < PLANNING_SLICE_MS);
        frame = requestAnimationFrame(planSlice);
      }

      // The small first slice avoids a full frame of startup delay for reports.
      planSlice();
      return currentPromise;
    },

    stop() { revision += 1; finish(false); },

    destroy() {
      if (destroyed) return;
      destroyed = true;
      revision += 1;
      finish(false);
      unsubscribe();
    },
  };
}
