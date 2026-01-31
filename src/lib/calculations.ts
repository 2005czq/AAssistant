import type { Bill, Transfer } from './types';

export function calculateRatioShares(bill: Bill, members: string[]): Record<string, number> {
  const totalRatio = Object.values(bill.ratios || {}).reduce((a, b) => a + b, 0);
  if (totalRatio <= 0) return {};

  const shares: Record<string, number> = {};
  for (const [name, ratio] of Object.entries(bill.ratios || {})) {
    if (name !== bill.payer && members.includes(name) && ratio > 0) {
      shares[name] = (ratio / totalRatio) * bill.amount;
    }
  }
  return shares;
}

export function hasBillErrors(members: string[], bills: Bill[]): boolean {
  if (members.length === 0) return true;
  for (const bill of bills) {
    if (!bill.payer || !members.includes(bill.payer)) return true;
    if (!bill.amount || bill.amount <= 0) return true;

    if (bill.type === 'Distribution') {
      for (const val of Object.values(bill.distribution)) {
        if (val < 0) return true;
      }
    }

    if (bill.type === 'Ratio') {
      const totalRatio = Object.values(bill.ratios || {}).reduce((a, b) => a + b, 0);
      if (totalRatio <= 0) return true;
    }

    if ((bill.type === 'Join' || bill.type === 'Remove') && (!bill.involved || bill.involved.length === 0)) {
      return true;
    }
  }
  return false;
}

export function calculateTransfers(members: string[], bills: Bill[]): Transfer[] {
  if (hasBillErrors(members, bills) || bills.length === 0) {
    return [];
  }

  const balances: Record<string, number> = {};
  members.forEach((m) => {
    balances[m] = 0;
  });

  bills.forEach((bill) => {
    const payer = bill.payer;
    const amountCents = Math.round(bill.amount * 100);

    if (bill.type === 'Distribution') {
      for (const [name, val] of Object.entries(bill.distribution)) {
        if (name === bill.payer || !members.includes(name)) continue;
        const shareCents = Math.ceil(val * 100);
        balances[name] -= shareCents;
        balances[payer] += shareCents;
      }
    } else if (bill.type === 'Ratio') {
      const shares = calculateRatioShares(bill, members);
      for (const [name, val] of Object.entries(shares)) {
        const shareCents = Math.ceil(val * 100);
        balances[name] -= shareCents;
        balances[payer] += shareCents;
      }
    } else {
      let involved: string[] = [];
      if (bill.type === 'AA') involved = [...members];
      else if (bill.type === 'Join') involved = bill.involved.filter((m) => members.includes(m));
      else if (bill.type === 'Remove') involved = members.filter((m) => !(bill.involved || []).includes(m));

      const count = involved.length;
      if (count > 0) {
        const shareCents = Math.ceil(amountCents / count);
        involved.forEach((name) => {
          if (name === payer) return;
          balances[name] -= shareCents;
          balances[payer] += shareCents;
        });
      }
    }
  });

  const sortedMembers = Object.keys(balances)
    .map((name) => ({ name, balance: balances[name] }))
    .filter((m) => m.balance !== 0)
    .sort((a, b) => a.balance - b.balance);

  const transfers: Transfer[] = [];
  let sum = 0;

  for (let i = 0; i < sortedMembers.length - 1; i += 1) {
    sum -= sortedMembers[i].balance;
    if (Math.abs(sum) < 0.01) continue;
    transfers.push({
      from: sortedMembers[i].name,
      to: sortedMembers[i + 1].name,
      amount: (sum / 100).toFixed(2)
    });
  }

  return transfers;
}
