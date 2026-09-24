import type { Bill, BillDraft, BillError, Settlement, Transfer } from './types';
import { MAX_BILL_VALUE, MIN_MEMBERS } from './constants';

export function toCents(amount: number): number {
  const [coefficient, exponent = '0'] = String(amount).split('e');
  const cents = Math.round(Number(`${coefficient}e${Number(exponent) + 2}`));
  return Number.isSafeInteger(cents) ? cents : NaN;
}

export function formatCents(cents: number): string {
  return `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, '0')}`;
}

export function isBillValue(value: number): boolean {
  return value >= 0 && value <= MAX_BILL_VALUE && toCents(value) / 100 === value;
}

export function distributionTotal(distribution: Record<string, number>): number {
  return Object.values(distribution).reduce((sum, value) => sum + toCents(value), 0) / 100;
}

/** Incomplete fields in form order; input controls and the API validate the number format. */
export function getBillErrors(bill: BillDraft, members: string[]): BillError[] {
  const errors: BillError[] = [];
  if (!bill.payer) errors.push('payer');
  if (!bill.type) errors.push('type');
  if (bill.type === 'Distribution') {
    if (bill.amount === '' || bill.amount === 0
      || !members.some((name) => name !== bill.payer && bill.distribution[name] > 0)) errors.push('distribution');
  } else if (bill.amount === '' || bill.amount === 0) errors.push('amount');
  if (bill.type === 'Join' && !members.some((name) => name !== bill.payer && bill.involved.includes(name))) {
    errors.push('involved');
  }
  if (bill.type === 'Remove' && (!bill.involved.length
    || !members.some((name) => name !== bill.payer && !bill.involved.includes(name)))) {
    errors.push('involved');
  }
  if (bill.type === 'Ratio' && !members.some((name) => name !== bill.payer && bill.ratios[name] > 0)) errors.push('ratios');
  return errors;
}

export function getBillError(bill: Bill, members: string[]): BillError | null {
  const first = getBillErrors(bill, members)[0];
  if (first) return first;
  // Keep invalid values out of settlement arithmetic.
  if (bill.type === 'Distribution') {
    if (members.some((name) => !isBillValue(bill.distribution[name]))) {
      return 'distribution';
    }
    const total = toCents(distributionTotal(bill.distribution));
    if (total !== toCents(bill.amount)) return 'distribution';
  }
  if (!isBillValue(bill.amount)) return 'amount';
  if (bill.type === 'Ratio' && members.some((name) => !isBillValue(bill.ratios[name]))) return 'ratios';
  return null;
}

// Largest remainders keep the total exact; ties follow the member order.
// Weights have at most two decimal places; integer weights keep remainders exact.
function splitCents(amount: number, weights: number[]): number[] {
  const integers = weights.map((weight) => BigInt(toCents(weight)));
  const total = integers.reduce((sum, value) => sum + value, 0n);
  const numerators = integers.map((value) => BigInt(amount) * value);
  const shares = numerators.map((value) => Number(value / total));
  const order = numerators.map((value, index) => ({ index, remainder: value % total }))
    .sort((a, b) => a.remainder === b.remainder ? a.index - b.index : a.remainder > b.remainder ? -1 : 1);
  const remainder = amount - shares.reduce((sum, value) => sum + value, 0);
  for (let i = 0; i < remainder; i += 1) shares[order[i].index] += 1;
  return shares;
}

/** Each member's share in integer cents, including the payer's own share. */
export function calculateBillShares(bill: Bill, members: string[]): number[] {
  if (getBillError(bill, members)) return members.map(() => 0);
  if (bill.type === 'Distribution') return members.map((name) => toCents(bill.distribution[name]));
  const weights = members.map((name) => {
    if (bill.type === 'Ratio') return bill.ratios[name];
    if (bill.type === 'Join') return Number(bill.involved.includes(name));
    if (bill.type === 'Remove') return Number(!bill.involved.includes(name));
    return 1;
  });
  return splitCents(toCents(bill.amount), weights);
}

export function calculateSettlement(members: string[], bills: Bill[]): Settlement {
  if (members.length < MIN_MEMBERS || bills.some((bill) => getBillError(bill, members))) {
    return { transfers: [], error: 'invalid' };
  }

  const balances = members.map(() => 0);
  for (const bill of bills) {
    const shares = calculateBillShares(bill, members);
    balances[members.indexOf(bill.payer)] += toCents(bill.amount);
    shares.forEach((share, index) => { balances[index] -= share; });
  }

  const unsettled = members.map((name, index) => ({ name, balance: balances[index] }))
    .filter((member) => member.balance !== 0);
  const size = 1 << unsettled.length;
  const sums = new Float64Array(size);
  const best = new Uint8Array(size);

  // Maximize zero-sum groups; each group saves one transfer. O(n * 2^n).
  for (let mask = 1; mask < size; mask += 1) {
    const first = mask & -mask;
    sums[mask] = sums[mask ^ first] + unsettled[31 - Math.clz32(first)].balance;
    let score = 0;
    for (let bits = mask; bits; bits &= bits - 1) {
      score = Math.max(score, best[mask ^ (bits & -bits)]);
    }
    best[mask] = score + Number(sums[mask] === 0);
  }

  const groups: typeof unsettled[] = [];
  let group: typeof unsettled = [];
  for (let mask = size - 1; mask;) {
    const score = best[mask] - Number(sums[mask] === 0);
    for (let bits = mask; bits; bits &= bits - 1) {
      const bit = bits & -bits;
      if (best[mask ^ bit] !== score) continue;
      group.push(unsettled[31 - Math.clz32(bit)]);
      mask ^= bit;
      if (sums[mask] === 0) {
        groups.push(group);
        group = [];
      }
      break;
    }
  }

  const transfers: Transfer[] = [];
  for (const group of groups) {
    group.sort((a, b) => a.balance - b.balance);
    let amount = 0;
    for (let i = 0; i < group.length - 1; i += 1) {
      amount -= group[i].balance;
      if (amount > 0) transfers.push({
        from: group[i].name,
        to: group[i + 1].name,
        amount: formatCents(amount)
      });
    }
  }
  return { transfers, error: null };
}
