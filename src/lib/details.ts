import type { Bill, Lang } from './types';
import { t } from './i18n';
import { calculateRatioShares, calculateTransfers } from './calculations';
import { formatNumberDisplay } from './utils';

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>');
}

export function generateBillTextSections(lang: Lang, members: string[], bills: Bill[]): {
  billSection: string;
  settlementSection: string;
} {
  let billSection = '';
  let hasAnyBill = false;

  bills.forEach((bill) => {
    if (!bill.payer || !members.includes(bill.payer)) return;
    if (!bill.amount || bill.amount <= 0) return;

    let shouldPayLines = '';

    let involved: string[] = [];
    if (bill.type === 'AA') involved = [...members];
    else if (bill.type === 'Join') involved = bill.involved.filter((m) => members.includes(m));
    else if (bill.type === 'Remove') {
      involved = members.filter((m) => !(bill.involved || []).includes(m));
    }

    if (bill.type === 'Distribution') {
      for (const [name, val] of Object.entries(bill.distribution)) {
        if (name === bill.payer || !members.includes(name) || val <= 0) continue;
        shouldPayLines += `    · ${t(lang, 'should_pay', { name, amount: val.toFixed(2) }).trim()}\n`;
      }
    } else if (bill.type === 'Ratio') {
      const shares = calculateRatioShares(bill, members);
      for (const [name, val] of Object.entries(shares)) {
        if (val <= 0) continue;
        shouldPayLines += `    · ${t(lang, 'should_pay', { name, amount: val.toFixed(2) }).trim()}\n`;
      }
    } else {
      const count = involved.length;
      if (count > 0) {
        const share = Math.ceil((bill.amount * 100) / count) / 100;
        involved.forEach((name) => {
          if (name === bill.payer) return;
          shouldPayLines += `    · ${t(lang, 'should_pay', { name, amount: share.toFixed(2) }).trim()}\n`;
        });
      }
    }

    if (shouldPayLines) {
      billSection += `${t(lang, 'bill_pays_for', { payer: bill.payer, reason: bill.reason })}\n`;
      billSection += shouldPayLines;
      hasAnyBill = true;
    }
  });

  if (!hasAnyBill) {
    billSection = lang === 'zh' ? '没有产生账单' : 'No bills generated';
  }

  let settlementSection = '';
  const transfers = calculateTransfers(members, bills);
  if (transfers.length > 0) {
    transfers.forEach((tr) => {
      settlementSection += `· ${t(lang, 'should_transfer', {
        from: tr.from,
        to: tr.to,
        amount: tr.amount
      })}\n`;
    });
  } else {
    settlementSection = t(lang, 'no_transfer');
  }

  return { billSection: billSection.trim(), settlementSection: settlementSection.trim() };
}

export function getRatioShareDisplay(
  member: string,
  amount: number,
  ratios: Record<string, number>
): string {
  const totalRatio = Object.values(ratios || {}).reduce((a, b) => a + b, 0);
  const ratioVal = ratios?.[member] || 0;
  if (totalRatio > 0 && ratioVal > 0) {
    return formatNumberDisplay((ratioVal / totalRatio) * amount);
  }
  return '0.00';
}
