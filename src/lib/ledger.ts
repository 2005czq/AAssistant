import type { ApiError, Bill, Ledger, LedgerIssue, ValidationCode } from './types';
import { BILL_TYPES } from './types';
import { MAX_BILL_REASON_LENGTH, MAX_MEMBER_NAME_LENGTH, MAX_MEMBERS, MIN_MEMBERS } from './constants';
import { distributionTotal, getBillError, isBillValue } from './calculations';
import { limitTextLength } from './utils';

export class InputError extends Error {
  constructor(public detail: ApiError) {
    super(detail.message);
  }
}

export function invalid(field: string, code: ValidationCode, params: Record<string, string | number> = {}): never {
  // API diagnostics stay in English; UI translations live in the presentation layer.
  const messages: Record<ValidationCode, string> = {
    object: `${field} must be an object`,
    array: `${field} must be an array`,
    string: `${field} must be a string`,
    unknown_field: `Unknown field: ${params.name}`,
    member_name: `Member names must be nonempty and within ${MAX_MEMBER_NAME_LENGTH} characters, without surrounding whitespace; Western characters count as half`,
    member_duplicate: 'Member names must be unique',
    member_exists: 'That member name already exists',
    number: `${field} must be a number from 0 to 9,999,999.99 with at most two decimal places`,
    bill_id: `${field} must be a positive safe integer`,
    duplicate_bill_id: `Duplicate bill ID: ${params.id}`,
    split_type: 'Unknown split type',
    payer: 'The payer must be a member, or be empty while editing',
    reason_length: `Reasons allow up to ${MAX_BILL_REASON_LENGTH} characters; Western characters count as half`,
    involved: 'Participants must be an array of member names',
    involved_duplicate: 'Participants must not contain duplicates',
    bill_id_assigned: 'Omit the bill ID when adding a bill; the app assigns it',
    bill_id_exhausted: 'No further bill IDs are available',
    language: 'Use en or zh for the language',
    theme: 'Use light or dark for the theme'
  };
  const message = `${messages[code]}.`;
  throw new InputError({ code: 'INVALID_ARGUMENT', message, issues: [{ field, message, code, params }] });
}

export function object(value: unknown, field = 'request'): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) invalid(field, 'object');
  return value as Record<string, unknown>;
}

export function checkKeys(value: Record<string, unknown>, allowed: string[], field: string): void {
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) invalid(`${field}.${key}`, 'unknown_field', { name: key });
  }
}

export function memberName(value: unknown, field: string): string {
  if (typeof value !== 'string' || !value || value !== value.trim() || limitTextLength(value, MAX_MEMBER_NAME_LENGTH) !== value) {
    invalid(field, 'member_name', { count: MAX_MEMBER_NAME_LENGTH });
  }
  return value;
}

function number(value: unknown, field: string): number {
  if (typeof value !== 'number' || !isBillValue(value)) {
    invalid(field, 'number');
  }
  return value;
}

export function billId(value: unknown, field = 'id'): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value <= 0) invalid(field, 'bill_id');
  return value;
}

function memberValues(value: unknown, members: string[], field: string): Record<string, number> {
  const values = object(value, field);
  checkKeys(values, members, field);
  return Object.fromEntries(members.map((name) => [name, number(values[name], `${field}.${name}`)]));
}

/** Validate API input and saved state; unfinished bills remain editable. */
export function parseLedger(value: unknown): Ledger {
  const input = object(value, 'ledger');
  checkKeys(input, ['name', 'members', 'bills'], 'ledger');
  const name = input.name;
  if (typeof name !== 'string') invalid('name', 'string');
  if (!Array.isArray(input.members)) invalid('members', 'array');
  if (!Array.isArray(input.bills)) invalid('bills', 'array');
  if (input.members.length > MAX_MEMBERS) throw new InputError({ code: 'MEMBER_LIMIT', message: `A ledger can have at most ${MAX_MEMBERS} members.` });
  const members = input.members.map((name, index) => memberName(name, `members[${index}]`));
  if (new Set(members).size !== members.length) invalid('members', 'member_duplicate');
  const ids = new Set<number>();
  const bills: Bill[] = input.bills.map((value, index) => {
    const field = `bills[${index}]`;
    const raw = object(value, field);
    checkKeys(raw, ['id', 'payer', 'reason', 'type', 'amount', 'involved', 'distribution', 'ratios'], field);
    const id = billId(raw.id, `${field}.id`);
    if (ids.has(id)) invalid(`${field}.id`, 'duplicate_bill_id', { id });
    ids.add(id);
    const type = raw.type;
    if (!BILL_TYPES.includes(type as Bill['type'])) invalid(`${field}.type`, 'split_type');
    const payer = raw.payer;
    if (typeof payer !== 'string' || (payer !== '' && !members.includes(payer))) invalid(`${field}.payer`, 'payer');
    const reason = raw.reason;
    if (typeof reason !== 'string') invalid(`${field}.reason`, 'string');
    if (limitTextLength(reason, MAX_BILL_REASON_LENGTH) !== reason) invalid(`${field}.reason`, 'reason_length', { count: MAX_BILL_REASON_LENGTH });
    const involved = type === 'Join' || type === 'Remove' ? raw.involved : [];
    if (!Array.isArray(involved) || involved.some((name) => !members.includes(name))) invalid(`${field}.involved`, 'involved');
    if (new Set(involved).size !== involved.length) invalid(`${field}.involved`, 'involved_duplicate');
    const distribution = type === 'Distribution' ? memberValues(raw.distribution, members, `${field}.distribution`) : {};
    const ratios = type === 'Ratio' ? memberValues(raw.ratios, members, `${field}.ratios`) : {};
    const amount = number(type === 'Distribution' ? distributionTotal(distribution) : raw.amount, `${field}.amount`);
    return { id, payer, reason, type: type as Bill['type'], amount, involved: [...involved], distribution, ratios };
  });
  return { name, members, bills };
}

export function ledgerIssues(ledger: Ledger): LedgerIssue[] {
  const issues: LedgerIssue[] = [];
  if (ledger.members.length < MIN_MEMBERS) issues.push({ field: 'members', message: `Add at least ${MIN_MEMBERS} members.` });
  for (const [index, bill] of ledger.bills.entries()) {
    const error = getBillError(bill, ledger.members);
    if (!error) continue;
    const messages: Record<string, string> = {
      payer: 'Select a payer who is a member.',
      amount: 'Enter an amount greater than 0.',
      involved: 'Select members so that someone other than the payer participates.',
      distribution: 'Give someone other than the payer a positive amount.',
      ratios: 'Give someone other than the payer a positive ratio.'
    };
    issues.push({ billId: bill.id, field: `bills[${index}].${error}`, message: messages[error] });
  }
  return issues;
}
