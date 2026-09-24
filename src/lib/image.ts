import QRCode from 'qrcode';
import ReceiptText from 'lucide-svelte/icons/receipt-text';
import HandCoins from 'lucide-svelte/icons/hand-coins';
import { DEMO_URL } from './constants';
import { PALETTES } from './theme';
import { REPORT_STYLE } from './report';
import { t } from './i18n';
import { createHeart, drawHeart, measureHeart } from './heart';
import { graphemes } from './utils';
import type { TextReport } from './types';

export async function generateAndDownloadImage(report: TextReport): Promise<void> {
  // Canvas text can include characters whose subsets have not appeared in the UI.
  await document.fonts.load(REPORT_STYLE.font, `${report.text}\n${t(report.lang, 'footer_made_with')}\n${t(report.lang, 'brand_tagline')}`)
    .catch(() => { /* A failed web font can still export using the configured fallback. */ });
  await document.fonts.ready;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is unavailable');
  const context = ctx;
  const palette = PALETTES[report.theme];
  const { padding, lineHeight, scale, width, columnPadding, qrSize } = REPORT_STYLE;
  const innerWidth = width - padding * 2;
  const dividerX = padding + innerWidth / 2;
  const rightX = dividerX + columnPadding;
  const leftWidth = innerWidth / 2 - columnPadding;
  const rightWidth = width - padding - rightX;

  function wrapText(text: string, font: string, maxWidth: number, continuation = ''): string[] {
    context.font = font;
    const lines: string[] = [];
    for (const paragraph of text.split('\n')) {
      let current = '';
      for (const char of graphemes(paragraph)) {
        if (current && context.measureText(current + char).width > maxWidth) {
          lines.push(current);
          current = continuation + char;
        } else current += char;
      }
      lines.push(current);
    }
    return lines;
  }

  const subjects = wrapText(report.name, REPORT_STYLE.subjectFont, innerWidth);
  const leftLines = report.billSection.split('\n').flatMap((line) =>
    wrapText(line, REPORT_STYLE.font, leftWidth, line.trim().startsWith('·') ? '      ' : ''));
  const rightLines = wrapText(report.settlementSection, REPORT_STYLE.font, rightWidth);
  const subjectY = padding + 28;
  const timeY = subjectY + (subjects.length - 1) * REPORT_STYLE.subjectLineHeight + 22;
  const headerRuleY = timeY + 18;
  const headingY = headerRuleY + 30;
  const bodyY = headingY + 30;
  const bodyBottom = bodyY + (Math.max(leftLines.length, rightLines.length) - 1) * lineHeight + 12;
  const footerY = bodyBottom + 24;
  const qrX = width - padding - qrSize;
  const qrY = footerY + 14;
  const textRightX = qrX - 14;
  const line1Y = qrY + 18;
  const line2Y = line1Y + 22;
  const height = Math.ceil(qrY + qrSize + 16);

  canvas.width = width * scale;
  canvas.height = height * scale;
  context.scale(scale, scale);
  context.save();
  context.fillStyle = palette.paper;
  context.fillRect(0, 0, width, height);
  context.strokeStyle = palette.grid;
  context.lineWidth = 1;
  context.beginPath();
  for (let y = 0; y < height; y += 20) { context.moveTo(0, y); context.lineTo(width, y); }
  for (let x = 0; x < width; x += 20) { context.moveTo(x, 0); context.lineTo(x, height); }
  context.stroke();

  function rule(x1: number, y1: number, x2: number, y2: number) {
    context.save();
    context.strokeStyle = palette.line;
    context.globalAlpha = .68;
    context.lineWidth = 1;
    context.setLineDash([4, 4]);
    context.beginPath(); context.moveTo(x1, y1); context.lineTo(x2, y2); context.stroke();
    context.restore();
  }
  rule(padding, headerRuleY, width - padding, headerRuleY);
  rule(dividerX, headingY - 20, dividerX, bodyBottom);
  rule(padding, footerY, width - padding, footerY);

  context.textAlign = 'center';
  context.font = REPORT_STYLE.subjectFont;
  context.fillStyle = palette.text;
  subjects.forEach((line, i) => context.fillText(line, width / 2, subjectY + i * REPORT_STYLE.subjectLineHeight));
  context.font = REPORT_STYLE.timeFont;
  context.fillStyle = palette.muted;
  context.fillText(report.currentTime, width / 2, timeY);
  context.textAlign = 'left';

  // Render the same icons as the paper, independent of partially animated DOM.
  async function icon(Component: typeof ReceiptText, x: number) {
    const target = document.createElement('div');
    const component = new Component({ target, props: { size: 20, color: palette.muted } });
    const svg = target.querySelector('svg')!;
    svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    const source = svg.outerHTML;
    component.$destroy();
    const image = new Image();
    image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(source)}`;
    await image.decode();
    context.drawImage(image, x, headingY - 17, 20, 20);
  }
  await icon(ReceiptText, padding);
  await icon(HandCoins, rightX);
  context.font = REPORT_STYLE.titleFont;
  context.fillStyle = palette.text;
  context.fillText(t(report.lang, 'details_bill_title'), padding + 28, headingY);
  context.fillText(t(report.lang, 'settlement_title'), rightX + 28, headingY);
  context.font = REPORT_STYLE.font;
  leftLines.forEach((line, i) => context.fillText(line, padding, bodyY + i * lineHeight));
  context.fillStyle = report.settled ? palette.success : palette.text;
  rightLines.forEach((line, i) => context.fillText(line, rightX, bodyY + i * lineHeight));

  try {
    const qrCanvas = document.createElement('canvas');
    await QRCode.toCanvas(qrCanvas, DEMO_URL, {
      width: qrSize * scale,
      margin: 0,
      color: { dark: palette.text, light: palette.paper }
    });
    context.drawImage(qrCanvas, qrX, qrY, qrSize, qrSize);
  } catch (error) {
    console.error('Failed to generate QR code', error);
  }

  context.font = REPORT_STYLE.footerFont;
  context.fillStyle = palette.muted;
  const footer = t(report.lang, 'footer_made_with');
  const [beforeHeart, afterHeart = ''] = footer.split('❤️');
  const metrics = context.measureText(footer.replace('❤️', ''));
  const textHeight = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent || 14;
  const heart = createHeart();
  const heartWidth = measureHeart(heart, textHeight);
  const beforeWidth = context.measureText(beforeHeart).width;
  const afterWidth = context.measureText(afterHeart).width;
  const line1Width = beforeWidth + heartWidth + afterWidth;
  const line1StartX = textRightX - line1Width;
  context.fillText(beforeHeart, line1StartX, line1Y);
  const heartX = line1StartX + beforeWidth;
  drawHeart(context, heart, heartX, line1Y - metrics.actualBoundingBoxAscent, textHeight, palette.danger);
  context.fillText(afterHeart, heartX + heartWidth, line1Y);

  context.font = REPORT_STYLE.taglineFont;
  context.fillStyle = palette.muted;
  const tagline = t(report.lang, 'brand_tagline');
  const line2Width = context.measureText(tagline).width;
  context.fillText(tagline, textRightX - line2Width, line2Y);

  context.restore();

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((value) => value ? resolve(value) : reject(new Error('Image encoding failed')), 'image/png');
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.download = 'bill-details.png';
  link.href = url;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
