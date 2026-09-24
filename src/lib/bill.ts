import type { Bill, BillDraft, BillType, Lang } from './types';
import { BILL_TYPES } from './types';
import { t } from './i18n';
import { distributionTotal } from './calculations';

export function getTypeOptions(lang: Lang): Array<{ value: BillType; label: string }> {
  return BILL_TYPES.map((value) => ({ value, label: t(lang, `type_${value}`) }));
}

export function createBillDraft(members: string[]): BillDraft {
  return {
    id: 0, payer: '', reason: '', type: '', amount: '', involved: [],
    distribution: Object.fromEntries(members.map((name) => [name, 0])),
    ratios: Object.fromEntries(members.map((name) => [name, 1]))
  };
}

export function applyBillChanges(bill: BillDraft, changes: Partial<Bill>, members: string[]): BillDraft {
  let updated = { ...bill };
  if (changes.type && changes.type !== bill.type) {
    updated = {
      ...updated,
      involved: [],
      distribution: Object.fromEntries(members.map((name) => [name, 0])),
      ratios: Object.fromEntries(members.map((name) => [name, changes.type === 'Ratio' ? 1 : 0]))
    };
  }
  updated = { ...updated, ...changes };
  if (updated.type === 'Distribution') updated.amount = distributionTotal(updated.distribution);
  return updated;
}
