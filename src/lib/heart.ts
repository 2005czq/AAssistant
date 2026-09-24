const between = (min: number, max: number) => min + Math.random() * (max - min);
const round = (value: number) => Math.round(value * 100) / 100;

/** Make one two-stroke drawing for the image footer. */
export function createHeart() {
  const angle = between(-9, 10) * Math.PI / 180;
  const cleftX = between(46, 54);
  const cleftY = between(30, 38);
  const tipX = between(44, 57);
  const tipY = between(81, 88);
  const left = between(11, 19);
  const right = between(81, 90);
  const leftTop = between(12, 23);
  const rightTop = between(12, 23);

  // Rotate the actual coordinates, so SVG and Canvas need no separate transform.
  const point = (x: number, y: number) => [
    round(50 + (x - 50) * Math.cos(angle) - (y - 50) * Math.sin(angle)),
    round(50 + (x - 50) * Math.sin(angle) + (y - 50) * Math.cos(angle)),
  ].join(' ');

  const first = [
    `M ${point(cleftX - between(.5, 2.5), cleftY - between(0, 2))}`,
    `C ${point(cleftX - between(8, 15), leftTop - between(2, 5))} ${point(left + between(2, 7), leftTop - between(1, 4))} ${point(left, between(28, 35))}`,
    `C ${point(left - between(0, 3), between(47, 56))} ${point(tipX - between(17, 27), tipY - between(19, 28))} ${point(tipX + between(-2, 1), tipY + between(-1, 2))}`,
  ].join(' ');
  const second = [
    `M ${point(cleftX + between(.5, 3), cleftY + between(-1, 3))}`,
    `C ${point(cleftX + between(9, 16), rightTop - between(3, 6))} ${point(right - between(1, 6), rightTop - between(1, 4))} ${point(right, between(29, 38))}`,
    `C ${point(right + between(-1, 2), between(47, 57))} ${point(tipX + between(16, 27), tipY - between(20, 31))} ${point(tipX + between(2, 6), tipY + between(-5, 1))}`,
  ].join(' ');

  // Neither end is stitched to the other stroke. A gap or tiny overlap is natural.
  return Object.freeze({
    strokes: Object.freeze([
      Object.freeze({ path: first, width: round(between(3.7, 4.7)) }),
      Object.freeze({ path: second, width: round(between(3.5, 4.5)) }),
    ]),
  });
}


type Heart = ReturnType<typeof createHeart>;

/** Include the round caps when fitting the drawing to the neighbouring glyphs. */
function heartBounds(heart: Heart) {
  const xs: number[] = [];
  const ys: number[] = [];
  for (const stroke of heart.strokes) {
    const values = stroke.path.match(/-?\d+(?:\.\d+)?/g)!.map(Number);
    let x = values[0], y = values[1];
    for (let i = 2; i < values.length; i += 6) {
      for (let step = 0; step <= 32; step += 1) {
        const t = step / 32, u = 1 - t;
        const px = u ** 3 * x + 3 * u ** 2 * t * values[i] + 3 * u * t ** 2 * values[i + 2] + t ** 3 * values[i + 4];
        const py = u ** 3 * y + 3 * u ** 2 * t * values[i + 1] + 3 * u * t ** 2 * values[i + 3] + t ** 3 * values[i + 5];
        xs.push(px - stroke.width / 2, px + stroke.width / 2);
        ys.push(py - stroke.width / 2, py + stroke.width / 2);
      }
      x = values[i + 4]; y = values[i + 5];
    }
  }
  const x = Math.min(...xs), y = Math.min(...ys);
  return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y };
}

export function measureHeart(heart: Heart, height: number): number {
  const bounds = heartBounds(heart);
  return bounds.width * (height / bounds.height);
}

export function drawHeart(ctx: CanvasRenderingContext2D, heart: Heart, x: number, y: number, height: number, color: string): number {
  const bounds = heartBounds(heart);
  const scale = height / bounds.height;
  ctx.save();
  ctx.translate(x - bounds.x * scale, y - bounds.y * scale);
  ctx.scale(scale, scale);
  ctx.setLineDash([]);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = color;
  for (const stroke of heart.strokes) { ctx.lineWidth = stroke.width; ctx.stroke(new Path2D(stroke.path)); }
  ctx.restore();
  return bounds.width * scale;
}
