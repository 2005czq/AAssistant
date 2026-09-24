import { writable } from 'svelte/store';
import type { ApiError, ApiResult, AppState, Bill, BillInput, Lang, Ledger, LedgerSnapshot, MemberChange, MutationReceipt, TextReport, Theme } from './types';
import { applyBillChanges } from './bill';
import { calculateSettlement, distributionTotal } from './calculations';
import { getDemoData } from './demo';
import { generateBillTextSections } from './details';
import { generateAndDownloadImage } from './image';
import { InputError, billId, checkKeys, invalid, ledgerIssues, memberName, object, parseLedger } from './ledger';
import { loadLedger, loadPreferences, saveLedger, savePreferences, PREFERENCES_KEY, STORAGE_KEY } from './storage';
import { detectSystemLanguage, detectSystemTheme, getCurrentTimeFormatted } from './utils';
import { t } from './i18n';

type MutationResult = ApiResult<MutationReceipt>;
type LedgerView = LedgerSnapshot & {
  generation: number; editing: boolean; result: ApiResult<TextReport>;
};
type Notice = 'editing_busy' | 'storage_restore_failed' | 'storage_save_failed' | 'preferences_unavailable';

let data: AppState = { name: '', members: [], bills: [], currentLang: 'en', currentTheme: 'light' };
let localUIHolds = 0;
let nextId = 1;
let generation = 0;
let persisted = true;
let preferencesPersisted = true;
let restoreFailed = false;
let settlement = calculateSettlement(data.members, data.bills);
let issues = ledgerIssues(data);
let report: TextReport | null = null;

export function isUIBusy(): boolean {
  return localUIHolds > 0;
}

export function holdUI(): () => void {
  localUIHolds++;
  publish();
  let released = false;
  return () => {
    if (!released) {
      released = true;
      localUIHolds = Math.max(0, localUIHolds - 1);
      publish();
    }
  };
}

const store = writable<LedgerView>({ ...data, persisted: persisted && preferencesPersisted, issues, generation, editing: false, result: getText() });
export const appState = { subscribe: store.subscribe };
export const notices = writable<Notice[]>([]);
const memberListeners = new Set<(change: MemberChange, members: string[]) => void>();

export function onMemberChange(listener: (change: MemberChange, members: string[]) => void): () => void {
  memberListeners.add(listener);
  return () => { memberListeners.delete(listener); };
}

function publish(memberChange?: MemberChange) {
  const state = { ...data, persisted: persisted && preferencesPersisted, issues, generation, editing: isUIBusy(), result: getText() };
  store.set(state);
  // Subscribers process every committed operation before Svelte batches DOM updates.
  if (memberChange) for (const listener of memberListeners) {
    try { listener(memberChange, [...state.members]); } catch (error) { reportError(error); }
  }
}

export function initializeLedger(): void {
  readSavedPreferences();
  readSavedLedger();
  window.addEventListener('storage', handleStorage);
}

function readSavedLedger() {
  if (!persisted && !restoreFailed) return;
  const stored = loadLedger();
  persisted = !stored.failed;
  const next = { ...data, ...(stored.ledger ?? { name: t(data.currentLang, 'untitled_ledger'), members: [], bills: [] }) };
  if (JSON.stringify(next) === JSON.stringify(data) && stored.failed === restoreFailed) return;
  data = next;
  restoreFailed = stored.failed;
  nextId = 1;
  settlement = calculateSettlement(data.members, data.bills);
  issues = ledgerIssues(data);
  report = null;
  publish();
  if (stored.failed) showNotice('storage_restore_failed');
}

function readSavedPreferences() {
  if (!preferencesPersisted) return;
  const stored = loadPreferences();
  const next = stored.preferences ?? { currentLang: detectSystemLanguage(), currentTheme: detectSystemTheme() };
  if (next.currentLang === data.currentLang && next.currentTheme === data.currentTheme && !stored.failed) return;
  preferencesPersisted = !stored.failed;
  data = { ...data, ...next };
  report = null;
  publish();
  if (stored.failed) showNotice('preferences_unavailable');
}

function handleStorage(event: StorageEvent) {
  if (isUIBusy()) return;
  if (event.key === PREFERENCES_KEY || event.key === null) readSavedPreferences();
  if (event.key === STORAGE_KEY || event.key === null) readSavedLedger();
}

if (import.meta.hot) import.meta.hot.dispose(() => {
  window.removeEventListener('storage', handleStorage);
});

function apiFailure(error: unknown, fallback: ApiError['code'] = 'INVALID_ARGUMENT'): { ok: false; error: ApiError } {
  return { ok: false, error: error instanceof InputError ? error.detail : { code: fallback, message: 'The operation could not be completed.' } };
}

function request(value: unknown, keys: string[]): Record<string, unknown> {
  const input = object(value ?? {});
  // Allow optional sessionId for backwards compatibility if callers still pass it
  const allowed = 'sessionId' in input ? [...keys, 'sessionId'] : keys;
  checkKeys(input, allowed, 'request');
  return input;
}

export function showNotice(notice: Notice): void {
  notices.update((pending) => pending.includes(notice) ? pending : [...pending, notice]);
}

export function showEditError(error: ApiError): void {
  if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  showNotice(error.code === 'SAVE_FAILED' ? 'storage_save_failed' : 'editing_busy');
}

function settlementChanged(next: Ledger): boolean {
  // Member order breaks rounding ties; bill order and reasons do not affect settlement.
  if (next.members.length !== data.members.length
    || next.members.some((name, index) => name !== data.members[index])
    || next.bills.length !== data.bills.length) return true;
  const previousBills = new Map(data.bills.map((bill) => [bill.id, bill]));
  return next.bills.some((bill) => {
    const previous = previousBills.get(bill.id);
    return !previous || bill.payer !== previous.payer || bill.type !== previous.type || bill.amount !== previous.amount
      || next.members.some((name) => bill.involved.includes(name) !== previous.involved.includes(name)
        || bill.distribution[name] !== previous.distribution[name] || bill.ratios[name] !== previous.ratios[name]);
  });
}

function change(value: unknown, keys: string[], update: (input: Record<string, unknown>) => AppState, memberAction?: MemberChange['type']): MutationResult {
  try {
    const input = request(value, keys);
    const next = update(input);
    const reset = memberAction === 'reset';
    const ledgerChanged = next.members !== data.members || next.bills !== data.bills;
    // Renaming is validated by its setter; keep untouched collections.
    const state = ledgerChanged || reset
      ? { ...next, ...parseLedger({ name: next.name, members: next.members, bills: next.bills }) }
      : next;
    const changed = state.name !== data.name
      || (ledgerChanged && JSON.stringify(state) !== JSON.stringify(data));
    if (reset || changed) {
      const recalculate = ledgerChanged && settlementChanged(state);
      data = state;
      if (reset) generation += 1;
      if (recalculate) settlement = calculateSettlement(data.members, data.bills);
      if (ledgerChanged) issues = ledgerIssues(data);
      report = null;
      persisted = saveLedger(data);
      restoreFailed = false;
      publish(memberAction === 'rename'
        ? { type: memberAction, name: input.name as string, newName: input.newName as string }
        : memberAction ? { type: memberAction } : undefined);
    } else if (!persisted) {
      persisted = saveLedger(data);
      restoreFailed = false;
      publish();
    }
    if (!persisted) showNotice('storage_save_failed');
    return { ok: true, persisted: persisted && preferencesPersisted, issues: structuredClone(issues) };
  } catch (error) {
    return apiFailure(error);
  }
}

function findMember(value: unknown): string {
  const name = memberName(value, 'name');
  if (!data.members.includes(name)) throw new InputError({ code: 'NOT_FOUND', message: `Member not found: ${name}.` });
  return name;
}

function findBill(value: unknown): Bill {
  const id = billId(value);
  const bill = data.bills.find((item) => item.id === id);
  if (!bill) throw new InputError({ code: 'NOT_FOUND', message: `Bill not found: ${id}.` });
  return bill;
}

function getText(): ApiResult<TextReport> {
  try {
    if (issues.length) throw new InputError({ code: 'INVALID_LEDGER', message: 'Complete the ledger before exporting.', issues: structuredClone(issues) });
    if (!data.bills.length) throw new InputError({ code: 'EMPTY_LEDGER', message: 'Add a bill before exporting.' });
    if (!report) {
      const now = new Date();
      const currentTime = getCurrentTimeFormatted(now);
      const sections = generateBillTextSections(data.currentLang, data.members, data.bills, settlement.transfers);
      const name = data.name.trim() || t(data.currentLang, 'untitled_ledger');
      report = {
        name, settled: settlement.transfers.length === 0,
        lang: data.currentLang, theme: data.currentTheme, generatedAt: now.toISOString(), currentTime, ...sections,
        text: `${name}\n${currentTime}\n\n${t(data.currentLang, 'details_bill_title')}\n${sections.billSection}\n\n${t(data.currentLang, 'settlement_title')}\n${sections.settlementSection}`
      };
    }
    return { ok: true, ...report };
  } catch (error) {
    return apiFailure(error);
  }
}

export const aassistant = Object.freeze({
  beginEdit: () => {
    return { ok: true, ledger: aassistant.getLedger() };
  },

  endEdit: () => ({ ok: true, persisted: persisted && preferencesPersisted }),

  getLedger(): LedgerSnapshot {
    return structuredClone({ ...data, persisted: persisted && preferencesPersisted, issues });
  },

  setLedger(input: { name: string; members: string[]; bills: Array<BillInput & { id: number }> }): MutationResult {
    return change(input, ['name', 'members', 'bills'], (value) => ({
      ...data, name: value.name as string,
      members: value.members as string[], bills: value.bills as Bill[]
    }), 'reset');
  },

  renameLedger(input: { name: string }): MutationResult {
    return change(input, ['name'], (value) => {
      if (typeof value.name !== 'string') invalid('name', 'string');
      return { ...data, name: value.name };
    });
  },

  addMember(input: { name: string }): MutationResult {
    return change(input, ['name'], (value) => {
      const name = memberName(value.name, 'name');
      if (data.members.includes(name)) return data;
      return {
        ...data, members: [...data.members, name],
        bills: data.bills.map((bill) => ({ ...bill, distribution: { ...bill.distribution, [name]: 0 }, ratios: { ...bill.ratios, [name]: 0 } }))
      };
    }, 'add');
  },

  renameMember(input: { name: string; newName: string }): MutationResult {
    return change(input, ['name', 'newName'], (value) => {
      const name = findMember(value.name);
      const newName = memberName(value.newName, 'newName');
      if (name === newName) return data;
      if (data.members.includes(newName)) invalid('newName', 'member_exists');
      return {
        ...data,
        members: data.members.map((member) => member === name ? newName : member),
        bills: data.bills.map((bill) => ({
          ...bill, payer: bill.payer === name ? newName : bill.payer,
          involved: bill.involved.map((member) => member === name ? newName : member),
          distribution: Object.fromEntries(Object.entries(bill.distribution).map(([member, amount]) => [member === name ? newName : member, amount])),
          ratios: Object.fromEntries(Object.entries(bill.ratios).map(([member, ratio]) => [member === name ? newName : member, ratio]))
        }))
      };
    }, 'rename');
  },

  removeMember(input: { name: string }): MutationResult {
    return change(input, ['name'], (value) => {
      const name = findMember(value.name);
      return {
        ...data, members: data.members.filter((member) => member !== name),
        bills: data.bills.map((bill) => {
          const distribution = Object.fromEntries(Object.entries(bill.distribution).filter(([member]) => member !== name));
          return {
            ...bill, payer: bill.payer === name ? '' : bill.payer,
            involved: bill.involved.filter((member) => member !== name), distribution,
            ratios: Object.fromEntries(Object.entries(bill.ratios).filter(([member]) => member !== name)),
            amount: bill.type === 'Distribution' ? distributionTotal(distribution) : bill.amount
          };
        })
      };
    }, 'remove');
  },

  moveMember(input: { name: string; beforeName: string | null }): MutationResult {
    return change(input, ['name', 'beforeName'], (value) => {
      const name = findMember(value.name);
      const before = value.beforeName === null ? null : findMember(value.beforeName);
      if (before === name) return data;
      const members = data.members.filter((member) => member !== name);
      members.splice(before === null ? members.length : members.indexOf(before), 0, name);
      return { ...data, members };
    }, 'move');
  },

  addBill(input: { bill: BillInput }): ApiResult<MutationReceipt & { billId: number }> {
    const result = change(input, ['bill'], (value) => {
      const bill = object(value.bill, 'bill');
      if ('id' in bill) invalid('bill.id', 'bill_id_assigned');
      const usedIds = new Set(data.bills.map((bill) => bill.id));
      while (usedIds.has(nextId)) nextId += 1;
      if (!Number.isSafeInteger(nextId)) invalid('bill.id', 'bill_id_exhausted');
      return { ...data, bills: [...data.bills, { ...bill, id: nextId } as unknown as Bill] };
    });
    if (!result.ok) return result;
    const id = data.bills[data.bills.length - 1].id;
    nextId = id + 1;
    return { ...result, billId: id };
  },

  updateBill(input: { id: number; changes: Partial<Omit<Bill, 'id'>> }): MutationResult {
    return change(input, ['id', 'changes'], (value) => {
      const bill = findBill(value.id);
      const raw = object(value.changes, 'changes');
      checkKeys(raw, ['payer', 'reason', 'type', 'amount', 'involved', 'distribution', 'ratios'], 'changes');
      const changes = Object.fromEntries(Object.entries(raw).filter(([, value]) => value !== undefined));
      const base = changes.type === undefined ? bill : applyBillChanges(bill, { type: changes.type as Bill['type'] }, data.members);
      return { ...data, bills: data.bills.map((item) => item.id === bill.id ? { ...base, ...changes } as Bill : item) };
    });
  },

  removeBill(input: { id: number }): MutationResult {
    return change(input, ['id'], (value) => {
      const bill = findBill(value.id);
      return { ...data, bills: data.bills.filter((item) => item.id !== bill.id) };
    });
  },

  moveBill(input: { id: number; beforeId: number | null }): MutationResult {
    return change(input, ['id', 'beforeId'], (value) => {
      const bill = findBill(value.id);
      const before = value.beforeId === null ? null : findBill(value.beforeId);
      if (before?.id === bill.id) return data;
      const bills = data.bills.filter((item) => item.id !== bill.id);
      const index = before ? bills.findIndex((item) => item.id === before.id) : bills.length;
      bills.splice(index, 0, bill);
      return { ...data, bills };
    });
  },

  clearLedger(input?: Record<string, never>): MutationResult {
    return change(input ?? {}, [], () => ({ ...data, name: t(data.currentLang, 'untitled_ledger'), members: [], bills: [] }), 'reset');
  },

  loadDemo(input?: Record<string, never>): MutationResult {
    return change(input ?? {}, [], () => ({ ...data, ...getDemoData(data.currentLang) }), 'reset');
  },

  setPreferences(input: { currentLang?: Lang; currentTheme?: Theme }): MutationResult {
    try {
      const value = request(input, ['currentLang', 'currentTheme']);
      if (value.currentLang !== undefined && value.currentLang !== 'en' && value.currentLang !== 'zh') invalid('currentLang', 'language');
      if (value.currentTheme !== undefined && value.currentTheme !== 'light' && value.currentTheme !== 'dark') invalid('currentTheme', 'theme');
      const currentLang = (value.currentLang ?? data.currentLang) as Lang;
      const currentTheme = (value.currentTheme ?? data.currentTheme) as Theme;
      const changed = currentLang !== data.currentLang || currentTheme !== data.currentTheme;
      if (changed) {
        data = { ...data, currentLang, currentTheme };
        report = null;
      }
      if (changed || !preferencesPersisted) {
        preferencesPersisted = savePreferences(data);
        publish();
        if (!preferencesPersisted) showNotice('preferences_unavailable');
      }
      return { ok: true, persisted: persisted && preferencesPersisted, issues: structuredClone(issues) };
    } catch (error) {
      return apiFailure(error);
    }
  },

  getText,

  async downloadImage(): Promise<ApiResult<{ generatedAt: string; fileName: string }>> {
    const result = getText();
    if (!result.ok) return result;
    try {
      await generateAndDownloadImage(result);
      return { ok: true, generatedAt: result.generatedAt, fileName: 'bill-details.png' };
    } catch (error) {
      return apiFailure(error, 'EXPORT_FAILED');
    }
  }
});

function agentGuard<T extends (...args: any[]) => any>(fn: T): T {
  return ((...args: any[]) => {
    if (isUIBusy()) {
      return apiFailure(new InputError({
        code: 'EDIT_BUSY',
        message: 'The ledger is being edited by the user. Retry after the user finishes interacting.'
      }));
    }
    return fn(...args);
  }) as T;
}

export const agentApi = Object.freeze({
  ...aassistant,
  beginEdit: agentGuard(aassistant.beginEdit),
  setLedger: agentGuard(aassistant.setLedger),
  renameLedger: agentGuard(aassistant.renameLedger),
  addMember: agentGuard(aassistant.addMember),
  renameMember: agentGuard(aassistant.renameMember),
  removeMember: agentGuard(aassistant.removeMember),
  moveMember: agentGuard(aassistant.moveMember),
  addBill: agentGuard(aassistant.addBill),
  updateBill: agentGuard(aassistant.updateBill),
  removeBill: agentGuard(aassistant.removeBill),
  moveBill: agentGuard(aassistant.moveBill),
  clearLedger: agentGuard(aassistant.clearLedger),
  loadDemo: agentGuard(aassistant.loadDemo),
  setPreferences: agentGuard(aassistant.setPreferences)
});
