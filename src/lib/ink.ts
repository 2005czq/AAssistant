import { createProgress, MOTION } from './motion';

let nextMaskId = 0;
const coordinate = (value: number) => Number(value.toFixed(3));
function svgElement<K extends keyof SVGElementTagNameMap>(name: K, attributes: Record<string, string | number> = {}): SVGElementTagNameMap[K] {
  const node = document.createElementNS('http://www.w3.org/2000/svg', name);
  for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, String(value));
  return node;
}

/** Draw a counterclockwise stroke with varying pen pressure. */
export function errorCircle(node: HTMLElement, invalid: boolean) {
  node.classList.add('ink-field');
  const host = document.createElement('span');
  host.className = 'error-ink';
  host.setAttribute('aria-hidden', 'true');
  node.append(host);
  const maskId = `ink-circle-mask-${++nextMaskId}`;
  const svg = svgElement('svg', { 'aria-hidden': 'true', focusable: 'false' });
  const mask = svgElement('mask', { id: maskId, maskUnits: 'userSpaceOnUse', maskContentUnits: 'userSpaceOnUse' });
  const sector = svgElement('path', { fill: 'white' });
  mask.append(sector);
  const defs = svgElement('defs');
  defs.append(mask);
  const ink = svgElement('path', { fill: 'var(--danger-color)', opacity: '.88', mask: `url(#${maskId})` });
  svg.append(defs, ink);
  host.append(svg);
  let progress = 0;
  let target = 0;
  let parameters: { start: number; sweep: number; phaseA: number; phaseB: number; pressure: number; direction: number; pitch: number; launch: number; lift: number; fullness: number; asymmetry: number; tilt: number } | null = null;
  let geometry: { start: number; sweep: number } | null = null;
  const initialSize = host.getBoundingClientRect();
  let width = initialSize.width || 120;
  let height = initialSize.height || 40;

  function newPen() {
    // Randomness belongs to one complete mark, never to an animation frame.
    parameters = {
      start: (-165 + Math.random() * 180) * Math.PI / 180,
      sweep: -(318 + Math.random() * 18) * Math.PI / 180,
      phaseA: Math.random() * Math.PI * 2,
      phaseB: Math.random() * Math.PI * 2,
      pressure: 2.55 + Math.random() * .5,
      direction: Math.random() < .5 ? -1 : 1,
      pitch: .12 + Math.random() * .07,
      launch: .025 + Math.random() * .035,
      lift: .21 + Math.random() * .07,
      fullness: .035 + Math.random() * .035,
      asymmetry: .025 + Math.random() * .035,
      tilt: (Math.random() < .5 ? -1 : 1) * (4 + Math.random() * 6) * Math.PI / 180,
    };
    buildOutline();
  }

  function buildOutline() {
    if (!parameters) return;
    const w = Math.max(24, width);
    const h = Math.max(24, height);
    const rx = w / 2;
    const ry = h / 2;
    // Limit the vertical tilt of a long field, not every mark to one tiny angle.
    const tilt = Math.sign(parameters.tilt) * Math.min(Math.abs(parameters.tilt), Math.atan2(ry * .38, rx));
    const cosine = Math.cos(tilt);
    const sine = Math.sin(tilt);
    const samples: Array<{ x: number; y: number; angle: number; halfWidth: number; tx: number; ty: number; nx: number; ny: number }> = [];
    const count = 180;
    for (let index = 0; index <= count; index += 1) {
      const t = index / count;
      const angle = parameters.start + parameters.sweep * t;
      // This is an open spiral gesture. Its non-periodic pitch separates the
      // starting and finishing tracks; the final lift keeps travelling away
      // from the starting track even if the gesture is continued past t = 1.
      const departure = parameters.direction * (
        parameters.pitch * (t - .5)
        - parameters.launch * (1 - t) ** 3
        + parameters.lift * t ** 7
      );
      const radius = 1 + departure
        + parameters.fullness * Math.sin(angle * 2 + parameters.phaseA)
        + parameters.asymmetry * Math.sin(angle + parameters.phaseB)
        + .012 * Math.sin(angle * 3 + parameters.phaseB);
      const x = rx * Math.cos(angle) * radius;
      const y = ry * Math.sin(angle) * radius;
      const pressure = .96 + .065 * Math.sin(t * Math.PI * 2 + parameters.phaseA)
        + .025 * Math.sin(t * Math.PI * 7 + parameters.phaseB);
      samples.push({
        x: x * cosine - y * sine,
        y: x * sine + y * cosine,
        angle, tx: 0, ty: 0, nx: 0, ny: 0,
        halfWidth: Math.max(.17, parameters.pressure * (1 - .84 * t ** 1.25) * pressure / 2),
      });
    }

    // Fit the actual tilted trajectory, leaving room for the widest pressure.
    // The same affine map drives the radial mask, so rotation cannot make its
    // advancing edge reveal a disconnected piece of the stroke.
    const margin = Math.max(...samples.map(point => point.halfWidth)) + .8;
    const minX = Math.min(...samples.map(point => point.x));
    const maxX = Math.max(...samples.map(point => point.x));
    const minY = Math.min(...samples.map(point => point.y));
    const maxY = Math.max(...samples.map(point => point.y));
    const scaleX = (w - margin * 2) / (maxX - minX);
    const scaleY = (h - margin * 2) / (maxY - minY);
    const cx = margin - minX * scaleX;
    const cy = margin - minY * scaleY;
    const a = scaleX * rx * cosine;
    const b = scaleY * rx * sine;
    const c = -scaleX * ry * sine;
    const d = scaleY * ry * cosine;
    const determinant = a * d - b * c;
    for (const point of samples) {
      point.x = cx + point.x * scaleX;
      point.y = cy + point.y * scaleY;
    }

    for (let index = 0; index < samples.length; index += 1) {
      const previous = samples[Math.max(0, index - 1)];
      const next = samples[Math.min(count, index + 1)];
      const length = Math.hypot(next.x - previous.x, next.y - previous.y);
      const point = samples[index];
      point.tx = (next.x - previous.x) / length;
      point.ty = (next.y - previous.y) / length;
      point.nx = point.ty;
      point.ny = -point.tx;
    }

    const outline = samples.map(point => ({
      x: point.x + point.nx * point.halfWidth,
      y: point.y + point.ny * point.halfWidth,
      angle: point.angle,
    }));
    const last = samples[samples.length - 1];
    for (let index = 1; index <= 8; index += 1) {
      const angle = Math.PI * index / 8;
      outline.push({
        x: last.x + last.halfWidth * (last.nx * Math.cos(angle) + last.tx * Math.sin(angle)),
        y: last.y + last.halfWidth * (last.ny * Math.cos(angle) + last.ty * Math.sin(angle)),
        angle: last.angle,
      });
    }
    for (let index = count - 1; index >= 0; index -= 1) {
      const point = samples[index];
      outline.push({
        x: point.x - point.nx * point.halfWidth,
        y: point.y - point.ny * point.halfWidth,
        angle: point.angle,
      });
    }
    const first = samples[0];
    for (let index = 1; index <= 8; index += 1) {
      const angle = Math.PI + Math.PI * index / 8;
      outline.push({
        x: first.x + first.halfWidth * (first.nx * Math.cos(angle) + first.tx * Math.sin(angle)),
        y: first.y + first.halfWidth * (first.ny * Math.cos(angle) + first.ty * Math.sin(angle)),
        angle: first.angle,
      });
    }

    // Include both caps in the radial sweep, avoiding an endpoint pop at 100%.
    const angles = outline.map(point => {
      const x = point.x - cx;
      const y = point.y - cy;
      const angle = Math.atan2((a * y - b * x) / determinant, (d * x - c * y) / determinant);
      return angle + Math.PI * 2 * Math.round((point.angle - angle) / (Math.PI * 2));
    });
    const start = Math.max(...angles) + .002;
    const end = Math.min(...angles) - .002;
    geometry = { start, sweep: end - start };
    svg.setAttribute('viewBox', `0 0 ${coordinate(w)} ${coordinate(h)}`);
    svg.setAttribute('preserveAspectRatio', 'none');
    mask.setAttribute('x', '0');
    mask.setAttribute('y', '0');
    mask.setAttribute('width', String(w));
    mask.setAttribute('height', String(h));
    ink.setAttribute('d', outline.map((point, index) =>
      `${index ? 'L' : 'M'}${coordinate(point.x)} ${coordinate(point.y)}`).join(' ') + 'Z');
    sector.setAttribute('transform', `matrix(${[a, b, c, d, cx, cy].map(value => Number(value.toFixed(6))).join(' ')})`);
    render();
  }

  function render() {
    if (!geometry || progress <= 0) {
      sector.setAttribute('d', '');
      return;
    }
    const { start, sweep } = geometry;
    const end = start + sweep * progress;
    // This unit-circle sector is mapped onto the tilted gesture. Six decimal
    // places keep its edge accurate even across a 900px host.
    const radial = (value: number) => Number((value * 4).toFixed(6));
    sector.setAttribute('d', `M0 0 L${radial(Math.cos(start))} ${radial(Math.sin(start))} A4 4 0 ${Math.abs(sweep * progress) > Math.PI ? 1 : 0} 0 ${radial(Math.cos(end))} ${radial(Math.sin(end))} Z`);
  }

  const controller = createProgress((value) => { progress = value; render(); }, MOTION.ink);
  function update(next: boolean) {
    if (next && controller.value === 0 && !target) newPen();
    target = next ? 1 : 0;
    void controller.set(target);
  }
  const observer = new ResizeObserver(([entry]) => {
    const size = entry.contentRect;
    if (size.width > 0 && size.height > 0 && (width !== size.width || height !== size.height)) {
      width = size.width;
      height = size.height;
      buildOutline();
    }
  });
  observer.observe(host);
  update(invalid);
  return { update, destroy() { controller.destroy(); observer.disconnect(); host.remove(); } };
}

/** Mask the existing Lucide check without changing its path, weight or dimensions. */
export function checkInk(node: HTMLElement, checked: boolean) {
  const svg = node.querySelector('svg')!;
  const id = `ink-check-mask-${++nextMaskId}`;
  const defs = svgElement('defs');
  const mask = svgElement('mask', { id, maskUnits: 'userSpaceOnUse', x: 0, y: 0, width: 24, height: 24 });
  const reveal = svgElement('path', {
    d: 'M3 11 L9 17 L21 5', fill: 'none', stroke: 'white', 'stroke-width': 6,
    'stroke-linecap': 'butt', 'stroke-linejoin': 'round', pathLength: 1,
    'stroke-dasharray': '1 1', 'stroke-dashoffset': 1,
  });
  mask.append(reveal);
  defs.append(mask);
  const paths = Array.from(svg.children);
  for (const path of paths) path.setAttribute('mask', `url(#${id})`);
  svg.append(defs);
  const controller = createProgress((value) => {
    reveal.setAttribute('stroke-dashoffset', String(1 - value));
  }, MOTION.check, checked ? 1 : 0);
  return {
    update(next: boolean) { void controller.set(next ? 1 : 0); },
    destroy() { controller.destroy(); defs.remove(); for (const path of paths) path.removeAttribute('mask'); },
  };
}
