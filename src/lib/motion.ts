import { derived, writable } from 'svelte/store';

export const MOTION = { fade: 120, reveal: 160, layout: 240, reorder: 320, ink: 240, check: 160 } as const;
const easing = 'cubic-bezier(.22,.68,0,1)';
export const reorderEasing = 'cubic-bezier(.34,1.56,.64,1)';

export const animationsEnabled = writable(true);
export function setAnimationsEnabled(value: boolean): void {
  animationsEnabled.set(value);
}

const media = matchMedia('(prefers-reduced-motion: reduce)');
const reduced = writable(media.matches);
const onMediaChange = () => reduced.set(media.matches);
media.addEventListener('change', onMediaChange);
export const motionEnabled = derived([animationsEnabled, reduced], ([enabled, reduce]) => enabled && !reduce);

let enabled = true;
const finishers = new Set<() => void>();
const unsubscribeMotion = motionEnabled.subscribe((value) => {
  enabled = value;
  document.documentElement.dataset.motion = value ? 'on' : 'off';
  if (!value) {
    for (const finish of [...finishers]) finish();
    // Existing CSS transitions can outlive a duration change. Settle those too.
    for (const animation of document.getAnimations()) {
      try { animation.finish(); } catch { animation.cancel(); }
    }
  }
});

if (import.meta.hot) import.meta.hot.dispose(() => {
  media.removeEventListener('change', onMediaChange);
  unsubscribeMotion();
  for (const finish of [...finishers]) finish();
});

export const canAnimate = () => enabled;
export function onMotionDisabled(finish: () => void): () => void {
  finishers.add(finish);
  return () => finishers.delete(finish);
}

/** One reversible progress value; a new target starts at the current pen position. */
export function createProgress(render: (value: number) => void, duration: number, initial = 0) {
  let value = initial;
  let target = initial;
  let from = initial;
  let started = 0;
  let travel = 0;
  let frame = 0;
  let disposed = false;
  let resolve: ((finished: boolean) => void) | undefined;
  let pending = Promise.resolve(true);

  function sample(now: number) {
    const fraction = travel ? Math.min(1, Math.max(0, (now - started) / travel)) : 1;
    value = from + (target - from) * fraction;
    render(value);
    return fraction === 1;
  }
  function settle(finished: boolean) {
    const done = resolve;
    resolve = undefined;
    done?.(finished);
  }
  function tick(now: number) {
    if (sample(now)) { frame = 0; settle(true); }
    else frame = requestAnimationFrame(tick);
  }
  function stop() {
    if (frame) {
      const finished = sample(performance.now());
      cancelAnimationFrame(frame);
      frame = 0;
      settle(finished);
    }
  }
  function set(next: number): Promise<boolean> {
    if (disposed) return Promise.resolve(false);
    if (target === next && frame && enabled) return pending;
    stop();
    target = next;
    if (!enabled || value === target) {
      value = target;
      render(value);
      return Promise.resolve(true);
    }
    from = value;
    started = performance.now();
    travel = duration * Math.abs(target - value);
    pending = new Promise((done) => { resolve = done; });
    frame = requestAnimationFrame(tick);
    return pending;
  }
  const unsubscribe = onMotionDisabled(() => {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    value = target;
    render(value);
    settle(true);
  });
  render(initial);
  return {
    set, stop,
    get value() { return value; },
    destroy() { stop(); disposed = true; unsubscribe(); },
  };
}

const active = new WeakMap<HTMLElement, Map<string, Animation>>();

/** Position, size and opacity have separate owners, so reflow cannot cancel a fade. */
export function animate(node: HTMLElement, key: string, frames: Keyframe[], options: KeyframeAnimationOptions = {}): Promise<boolean> {
  let slots = active.get(node);
  if (!slots) active.set(node, slots = new Map());
  slots.get(key)?.cancel();
  if (!enabled) return Promise.resolve(true);
  const animation = node.animate(frames, { duration: MOTION.layout, easing, ...options });
  slots.set(key, animation);
  const unsubscribe = onMotionDisabled(() => animation.finish());
  return animation.finished.then(() => true, () => false).finally(() => {
    unsubscribe();
    if (slots.get(key) === animation) slots.delete(key);
  });
}

export function cancelAnimations(node: HTMLElement) {
  for (const animation of active.get(node)?.values() ?? []) animation.cancel();
}

export function capture(container: HTMLElement | undefined): Map<HTMLElement, DOMRect> {
  return new Map(container?.getClientRects().length
    ? Array.from(container.children, (child) => [child as HTMLElement, child.getBoundingClientRect()]) : []);
}

export function reflow(container: HTMLElement, before: Map<HTMLElement, DOMRect>, revealNew = true, options: KeyframeAnimationOptions = {}) {
  if (!container.getClientRects().length) return;
  const children = Array.from(container.children) as HTMLElement[];
  for (const node of children) active.get(node)?.get('position')?.cancel();
  const after = capture(container);
  for (const node of children) {
    const previous = before.get(node);
    const next = after.get(node)!;
    if (previous) {
      const x = previous.left - next.left;
      const y = previous.top - next.top;
      if (Math.abs(x) + Math.abs(y) > .3) {
        void animate(node, 'position', [{ transform: `translate(${x}px, ${y}px)` }, { transform: 'translate(0, 0)' }], options);
      }
    } else if (revealNew) {
      void animate(node, 'presence', [{ opacity: 0 }, { opacity: 1 }], { duration: MOTION.reveal, delay: 60, fill: 'backwards' });
    }
  }
}

export function fadeOut(node: HTMLElement): Promise<boolean> {
  const opacity = getComputedStyle(node).opacity;
  node.inert = true;
  node.style.opacity = '0';
  return animate(node, 'presence', [{ opacity }, { opacity: 0 }], { duration: MOTION.fade });
}

/** Observe natural content, animate its outer box. Menus and focus rings stay unclipped. */
export function autoHeight(node: HTMLElement) {
  const content = node.firstElementChild as HTMLElement;
  let target = content.getBoundingClientRect().height;
  let disposed = false;
  node.style.height = `${target}px`;
  const observer = new ResizeObserver(() => {
    if (disposed) return;
    // Hidden panels have no layout box. Keep their last natural size.
    if (!node.getClientRects().length) return;
    const next = content.getBoundingClientRect().height;
    if (Math.abs(next - target) < .3) return;
    const current = node.getBoundingClientRect().height;
    target = next;
    node.style.height = `${next}px`;
    void animate(node, 'height', [{ height: `${current}px` }, { height: `${next}px` }]);
  });
  observer.observe(content);
  return { destroy() { disposed = true; observer.disconnect(); cancelAnimations(node); } };
}

/** Keep a panel mounted through its reversible exit, but remove it from tab order immediately. */
export function presence(node: HTMLElement, visible: boolean) {
  let wanted = visible;
  node.hidden = !visible;
  const progress = createProgress((value) => {
    node.style.opacity = String(value);
    node.style.transform = `translateY(${(1 - value) * -6}px)`;
  }, MOTION.reveal, visible ? 1 : 0);
  function update(next: boolean) {
    wanted = next;
    node.inert = !next;
    node.setAttribute('aria-hidden', String(!next));
    if (next) node.hidden = false;
    void progress.set(next ? 1 : 0).then((finished) => {
      if (finished && !wanted) node.hidden = true;
    });
  }
  update(visible);
  return { update, destroy: () => progress.destroy() };
}
