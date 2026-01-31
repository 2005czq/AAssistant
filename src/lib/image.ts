import QRCode from 'qrcode';
import { DEMO_URL } from './constants';
import { t } from './i18n';
import type { Lang } from './types';

interface LineItem {
  text: string;
  type: 'time' | 'gap' | 'title' | 'normal' | 'bullet-bill' | 'bullet-settle';
}

interface WrappedItem {
  lines: string[];
  type: LineItem['type'];
  lineHeight: number;
}

export async function generateAndDownloadImage(
  lang: Lang,
  currentTime: string,
  billSection: string,
  settlementSection: string
): Promise<void> {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const context = ctx;

  const titleBill = t(lang, 'details_bill_title');
  const titleSettlement = t(lang, 'settlement_title');
  const footer = t(lang, 'footer_made_with');

  const padding = 40;
  const lineHeight = 26;
  const titleLineHeight = 36;
  const footerHeight = 140;
  const qrSize = 60;
  const width = 500;
  const maxTextWidth = width - padding * 2;

  function wrapText(text: string, font: string, maxWidth: number, indentContinuation = ''): string[] {
    context.font = font;
    const words = text.split('');
    const lines: string[] = [];
    let currentLine = '';
    let isFirstLine = true;

    for (let i = 0; i < words.length; i += 1) {
      const testLine = currentLine + words[i];
      const testWidth = context.measureText(testLine).width;
      if (testWidth > maxWidth && currentLine.length > 0) {
        lines.push(currentLine);
        currentLine = isFirstLine ? indentContinuation + words[i] : indentContinuation + words[i];
        isFirstLine = false;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) lines.push(currentLine);
    return lines;
  }

  const allLines: LineItem[] = [];
  allLines.push({ text: currentTime, type: 'time' });
  allLines.push({ text: '', type: 'gap' });
  allLines.push({ text: titleBill, type: 'title' });
  billSection.split('\n').forEach((line) => {
    if (line.trim()) {
      allLines.push({ text: line, type: line.trim().startsWith('·') ? 'bullet-bill' : 'normal' });
    }
  });

  if (settlementSection) {
    allLines.push({ text: '', type: 'gap' });
    allLines.push({ text: titleSettlement, type: 'title' });
    settlementSection.split('\n').forEach((line) => {
      if (line.trim()) {
        allLines.push({ text: line, type: line.trim().startsWith('·') ? 'bullet-settle' : 'normal' });
      }
    });
  }

  context.font = '18px "CustomHandwriting", cursive, sans-serif';
  let totalHeight = padding;
  const wrappedLines: WrappedItem[] = [];

  allLines.forEach((item) => {
    if (item.type === 'gap') {
      wrappedLines.push({ lines: [''], type: 'gap', lineHeight: 16 });
    } else if (item.type === 'time') {
      wrappedLines.push({ lines: [item.text], type: 'time', lineHeight: 30 });
    } else if (item.type === 'title') {
      wrappedLines.push({ lines: [item.text], type: 'title', lineHeight: titleLineHeight });
    } else {
      const font = '18px "CustomHandwriting", cursive, sans-serif';
      let indent = '';
      if (item.type === 'bullet-bill') {
        indent = '      ';
      } else if (item.type === 'bullet-settle') {
        indent = '  ';
      }
      const wrapped = wrapText(item.text, font, maxTextWidth, indent);
      wrappedLines.push({ lines: wrapped, type: item.type, lineHeight });
    }
  });

  wrappedLines.forEach((item) => {
    totalHeight += item.lineHeight * item.lines.length;
  });
  totalHeight += footerHeight + padding;

  const scale = 2;
  canvas.width = width * scale;
  canvas.height = totalHeight * scale;
  context.scale(scale, scale);

  context.fillStyle = '#fdfbf7';
  context.fillRect(0, 0, width, totalHeight);

  context.strokeStyle = 'rgba(0,0,0,0.05)';
  context.lineWidth = 1;
  for (let y = 0; y < totalHeight; y += 20) {
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(width, y);
    context.stroke();
  }
  for (let x = 0; x < width; x += 20) {
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x, totalHeight);
    context.stroke();
  }

  context.fillStyle = '#3a3026';
  let y = padding + 20;

  wrappedLines.forEach((item) => {
    item.lines.forEach((line) => {
      if (item.type === 'time') {
        context.font = '16px "CustomHandwriting", cursive, sans-serif';
        context.fillStyle = '#888';
        context.fillText(line, padding, y);
        context.fillStyle = '#3a3026';
      } else if (item.type === 'title') {
        context.font = 'bold 20px "CustomHandwriting", cursive, sans-serif';
        context.fillStyle = '#3a3026';
        context.fillText(line, padding, y);
        context.beginPath();
        context.setLineDash([5, 5]);
        context.strokeStyle = '#c8b8a0';
        context.moveTo(padding, y + 10);
        context.lineTo(width - padding, y + 10);
        context.stroke();
        context.setLineDash([]);
      } else if (item.type === 'gap') {
        // skip
      } else {
        context.font = '18px "CustomHandwriting", cursive, sans-serif';
        context.fillStyle = '#3a3026';
        context.fillText(line, padding, y);
      }
      y += item.lineHeight;
    });
  });

  const footerY = totalHeight - footerHeight + 20;
  context.strokeStyle = '#a08060';
  context.lineWidth = 2;
  context.setLineDash([]);
  context.beginPath();
  context.moveTo(padding, footerY);
  context.lineTo(width - padding, footerY);
  context.stroke();

  context.font = '14px "CustomHandwriting", cursive, sans-serif';
  context.fillStyle = '#666';
  context.fillText(footer, padding, footerY + 30);

  try {
    const qrCanvas = document.createElement('canvas');
    await QRCode.toCanvas(qrCanvas, DEMO_URL, {
      width: qrSize,
      margin: 0,
      color: { dark: '#3a3026', light: '#fdfbf7' }
    });

    context.drawImage(qrCanvas, width - padding - qrSize - 30, footerY + 20, qrSize, qrSize);

    context.font = '12px "CustomHandwriting", cursive, sans-serif';
    context.fillStyle = '#888';
    context.textAlign = 'center';
    const qrCenterX = width - padding - qrSize - 30 + qrSize / 2;
    context.fillText(t(lang, 'footer_qr_text'), qrCenterX, footerY + qrSize + 35);
    context.textAlign = 'left';
  } catch (error) {
    console.error('QR code generation failed', error);
  }

  downloadCanvas(canvas);
}

function downloadCanvas(canvas: HTMLCanvasElement): void {
  const link = document.createElement('a');
  link.download = 'bill-details.png';
  link.href = canvas.toDataURL('image/png');
  link.click();
}
