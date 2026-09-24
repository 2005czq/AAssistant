import type { Bill, Lang, Transfer } from './types';
import { t } from './i18n';
import { calculateBillShares, formatCents, toCents } from './calculations';

export function generateBillTextSections(lang: Lang, members: string[], bills: Bill[], transfers: Transfer[]): {
  billSection: string;
  settlementSection: string;
} {
  let billSection = '';

  bills.forEach((bill) => {
    let shouldPayLines = '';
    const shares = calculateBillShares(bill, members);
    members.forEach((name, index) => {
      if (name === bill.payer || shares[index] === 0) return;
      shouldPayLines += `    · ${t(lang, 'should_pay', { name, amount: formatCents(shares[index]) })}\n`;
    });

    if (shouldPayLines) {
      billSection += `${t(lang, 'bill_pays_for', { payer: bill.payer, reason: bill.reason })}\n`;
      billSection += shouldPayLines;
    } else {
      billSection += `${t(lang, 'bill_paid', { payer: bill.payer, reason: bill.reason, amount: formatCents(toCents(bill.amount)) })}\n`;
    }
  });

  return {
    billSection: billSection.trim(),
    settlementSection: generateSettlementText(lang, transfers)
  };
}

function generateSettlementText(lang: Lang, transfers: Transfer[]): string {
  return transfers.length
    ? transfers.map((transfer) => t(lang, 'should_transfer', { ...transfer })).join('\n')
    : t(lang, 'no_transfer');
}
