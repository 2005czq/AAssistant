interface EdgePoint { position: number; depth: number }
const round = (value: number) => Number(value.toFixed(3));

/** Correlated, uneven fibres; depths stay in pixels when the paper grows. */
export function createPaperShape() {
  const corners = Array.from({ length: 4 }, () => 6 + Math.random() * 4);
  const edges = Array.from({ length: 4 }, () => {
    const points: EdgePoint[] = [];
    let position = 0;
    let wander = .65 + Math.random() * 1.4;
    while (true) {
      wander = Math.max(.3, Math.min(2.75, wander * .64 + (.2 + Math.random() * 2.7) * .36));
      const fiber = Math.random() < .2 ? .65 + Math.random() * .85 : 0;
      const depth = round(Math.max(.22, Math.min(3.45, wander + (Math.random() - .5) * .7 + fiber)) * 2.2);
      points.push({ position: round(position), depth });
      if (position === 100) return points;
      position = Math.min(100, position + 1.25 + Math.random() * 3.1);
    }
  });
  const along = (position: number, start: number, end: number) => {
    const inset = round(start * (1 - position / 100) - end * position / 100);
    return `calc(${round(position)}% ${inset < 0 ? '-' : '+'} ${Math.abs(inset)}px)`;
  };
  const points = [
    ...edges[0].map(({ position, depth }) => `${along(position, corners[0], corners[1])} ${depth}px`),
    ...edges[1].map(({ position, depth }) => `calc(100% - ${depth}px) ${along(position, corners[1], corners[2])}`),
    ...edges[2].map(({ position, depth }) => `${along(100 - position, corners[3], corners[2])} calc(100% - ${depth}px)`),
    ...edges[3].map(({ position, depth }) => `${depth}px ${along(100 - position, corners[0], corners[3])}`),
  ];
  return `polygon(${points.join(',')})`;
}
