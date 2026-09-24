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

type EditRequest = { sessionId: string };
type Editor = 'user' | 'agent';
type MutationResult = ApiResult<MutationReceipt>;
type LedgerView = LedgerSnapshot & {
  generation: number; editing: boolean; result: ApiResult<TextReport>;
};
type Notice = 'editing_busy' | 'storage_restore_failed' | 'storage_save_failed' | 'preferences_unavailable';
type EditSession = { id: string; owner: Editor; expires: number };
type UserHold = { ready: Promise<ApiResult<{}>>; release: () => void };
const LOCK_TIMEOUT = 15_000;

let data: AppState = { name: '', members: [], bills: [], currentLang: 'en', currentTheme: 'light' };
let session: EditSession | null = null;
let acquiring = false;
let disposed = false;
let heartbeat: ReturnType<typeof setInterval>;
let released = Promise.resolve();
let userRequest: Promise<ApiResult<{}>> | null = null;
const userHolds = new Set<symbol>();
let nextId = 1;
let generation = 0;
let persisted = true;
let preferencesPersisted = true;
let restoreFailed = false;
let settlement = calculateSettlement(data.members, data.bills);
let issues = ledgerIssues(data);
let report: TextReport | null = null;
const store = writable<LedgerView>({ ...data, persisted: persisted && preferencesPersisted, issues, generation, editing: false, result: getText() });
export const appState = { subscribe: store.subscribe };
export const notices = writable<Notice[]>([]);
const memberListeners = new Set<(change: MemberChange, members: string[]) => void>();

export function onMemberChange(listener: (change: MemberChange, members: string[]) => void): () => void {
  memberListeners.add(listener);
  return () => { memberListeners.delete(listener); };
}

function publish(memberChange?: MemberChange) {
  const state = { ...data, persisted: persisted && preferencesPersisted, issues, generation, editing: session?.owner === 'user', result: getText() };
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
  window.addEventListener('blur', endUserEditing);
  window.addEventListener('pagehide', releaseEdit);
}

function endUserEditing() {
  if (session?.owner !== 'user' && !userRequest) return;
  // Blur handlers retain their own hold until pending saves finish.
  if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
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
  if (session || acquiring) return;
  if (event.key === PREFERENCES_KEY || event.key === null) readSavedPreferences();
  if (event.key === STORAGE_KEY || event.key === null) readSavedLedger();
}

/** The read and write share one transaction, so competing tabs cannot both win. */
function changeEditLock(update: (current: EditSession | undefined) => EditSession | undefined): Promise<void> {
  return new Promise((resolve, reject) => {
    const open = indexedDB.open('aassistant_edit', 1);
    open.onupgradeneeded = () => open.result.createObjectStore('lock');
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const db = open.result;
      const transaction = db.transaction('lock', 'readwrite');
      const store = transaction.objectStore('lock');
      let failure: unknown;
      transaction.oncomplete = () => { db.close(); resolve(); };
      transaction.onabort = () => { db.close(); reject(failure ?? transaction.error); };
      const read = store.get('ledger');
      read.onsuccess = () => {
        try {
          const next = update(read.result);
          if (next) store.put(next, 'ledger');
          else store.delete('ledger');
        } catch (error) { failure = error; transaction.abort(); }
      };
    };
  });
}

function releaseEdit() {
  userHolds.clear();
  const current = session;
  if (!current) return;
  session = null;
  clearInterval(heartbeat);
  released = changeEditLock((lock) => lock?.id === current.id ? undefined : lock)
    .catch(() => { /* The lease still expires if storage becomes unavailable. */ });
  publish();
}

if (import.meta.hot) import.meta.hot.dispose(() => {
  disposed = true;
  window.removeEventListener('storage', handleStorage);
  window.removeEventListener('blur', endUserEditing);
  window.removeEventListener('pagehide', releaseEdit);
  releaseEdit();
});

function apiFailure(error: unknown, fallback: ApiError['code'] = 'INVALID_ARGUMENT'): { ok: false; error: ApiError } {
  return { ok: false, error: error instanceof InputError ? error.detail : { code: fallback, message: 'The operation could not be completed.' } };
}

function request(value: unknown, keys: string[]): Record<string, unknown> {
  const input = object(value);
  checkKeys(input, ['sessionId', ...keys], 'request');
  if (!session || typeof input.sessionId !== 'string' || input.sessionId !== session.id) {
    throw new InputError({ code: 'EDIT_REQUIRED', message: 'This edit session is missing or has ended. Begin a new edit session and read its ledger before writing.' });
  }
  if (session.expires <= Date.now()) {
    releaseEdit();
    throw new InputError({ code: 'EDIT_REQUIRED', message: 'This edit session has expired. Begin editing again before writing.' });
  }
  return input;
}

async function renewEdit() {
  const current = session;
  if (!current) return;
  try {
    let expires = current.expires;
    await changeEditLock((lock) => {
      const now = Date.now();
      if (session !== current || lock?.id !== current.id || lock.expires <= now || current.expires <= now) {
        throw new InputError({ code: 'EDIT_REQUIRED', message: 'This edit session has expired. Begin editing again before writing.' });
      }
      expires = now + LOCK_TIMEOUT;
      return { ...current, expires };
    });
    if (session === current) current.expires = expires;
  } catch (error) {
    if (session !== current) return;
    const failure = apiFailure(error, 'SAVE_FAILED');
    releaseEdit();
    if (current.owner === 'user') showEditError(failure.error);
  }
}

async function beginEditing(owner: Editor): Promise<ApiResult<{ sessionId: string; ledger: LedgerSnapshot }>> {
  if (session || acquiring || disposed) return apiFailure(new InputError({ code: 'EDIT_BUSY', message: 'The ledger is being edited. Retry after the current editor finishes.' }));
  acquiring = true;
  try {
    await released;
    const current = { id: Array.from(crypto.getRandomValues(new Uint32Array(4)), (part) => part.toString(16)).join('-'), owner, expires: 0 };
    await changeEditLock((lock) => {
      const now = Date.now();
      if (lock && lock.expires > now) throw new InputError({ code: 'EDIT_BUSY', message: 'Another page is editing this ledger. Retry after it finishes.' });
      current.expires = now + LOCK_TIMEOUT;
      return current;
    });
    session = current;
    if (disposed) {
      releaseEdit();
      throw new InputError({ code: 'EDIT_REQUIRED', message: 'This page has ended its edit session.' });
    }
    readSavedPreferences();
    readSavedLedger();
    publish();
    heartbeat = setInterval(() => { void renewEdit(); }, LOCK_TIMEOUT / 3);
    return { ok: true, sessionId: current.id, ledger: aassistant.getLedger() };
  } catch (error) {
    return apiFailure(error, 'SAVE_FAILED');
  } finally { acquiring = false; }
}

export function holdUserEdit(): UserHold {
  const claim = Symbol();
  userHolds.add(claim);
  const release = () => {
    userHolds.delete(claim);
    if (!userHolds.size && session?.owner === 'user') releaseEdit();
  };
  const pending = session?.owner === 'user' ? Promise.resolve({ ok: true } as const)
    : userRequest ?? (userRequest = beginEditing('user').finally(() => { userRequest = null; }));
  return {
    ready: pending.then((result) => {
      if (!result.ok || !userHolds.has(claim)) release();
      return result;
    }),
    release
  };
}

function showNotice(notice: Notice): void {
  notices.update((pending) => pending.includes(notice) ? pending : [...pending, notice]);
}

export function showEditError(error: ApiError): void {
  if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  showNotice(error.code === 'SAVE_FAILED' ? 'storage_save_failed' : 'editing_busy');
}

export function runUserEdit(action: () => void): void {
  const hold = holdUserEdit();
  const run = () => { try { action(); } finally { hold.release(); } };
  if (session?.owner === 'user') run();
  else void hold.ready.then((result) => {
    if (result.ok) run();
    else showEditError(result.error);
  });
}

export function editFromUI<P extends EditRequest, R>(action: (input: P) => R, input: Omit<P, 'sessionId'>): R | { ok: false; error: ApiError } {
  if (session?.owner !== 'user') return apiFailure(new InputError({ code: 'EDIT_REQUIRED', message: 'This input or drag no longer owns the edit lock.' }));
  return action({ ...input, sessionId: session.id } as P);
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
    if (settlement.error === 'amount_overflow') {
      throw new InputError({
        code: 'AMOUNT_OVERFLOW', message: 'The total amount exceeds the supported range.'
      });
    }
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
  apiVersion: 2,

  beginEdit: () => beginEditing('agent'),

  async endEdit(input: EditRequest): Promise<ApiResult<{ persisted: boolean }>> {
    try {
      request(input, []);
      releaseEdit();
      await released;
      return { ok: true, persisted: persisted && preferencesPersisted };
    } catch (error) {
      return apiFailure(error);
    }
  },

  getLedger(): LedgerSnapshot {
    return structuredClone({ ...data, persisted: persisted && preferencesPersisted, issues });
  },

  setLedger(input: EditRequest & { name: string; members: string[]; bills: Array<BillInput & { id: number }> }): MutationResult {
    return change(input, ['name', 'members', 'bills'], (value) => ({
      ...data, name: value.name as string,
      members: value.members as string[], bills: value.bills as Bill[]
    }), 'reset');
  },

  renameLedger(input: EditRequest & { name: string }): MutationResult {
    return change(input, ['name'], (value) => {
      if (typeof value.name !== 'string') invalid('name', 'string');
      return { ...data, name: value.name };
    });
  },

  addMember(input: EditRequest & { name: string }): MutationResult {
    return change(input, ['name'], (value) => {
      const name = memberName(value.name, 'name');
      if (data.members.includes(name)) return data;
      return {
        ...data, members: [...data.members, name],
        bills: data.bills.map((bill) => ({ ...bill, distribution: { ...bill.distribution, [name]: 0 }, ratios: { ...bill.ratios, [name]: 0 } }))
      };
    }, 'add');
  },

  renameMember(input: EditRequest & { name: string; newName: string }): MutationResult {
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

  removeMember(input: EditRequest & { name: string }): MutationResult {
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

  moveMember(input: EditRequest & { name: string; beforeName: string | null }): MutationResult {
    return change(input, ['name', 'beforeName'], (value) => {
      const name = findMember(value.name);
      const before = value.beforeName === null ? null : findMember(value.beforeName);
      if (before === name) return data;
      const members = data.members.filter((member) => member !== name);
      members.splice(before === null ? members.length : members.indexOf(before), 0, name);
      return { ...data, members };
    }, 'move');
  },

  addBill(input: EditRequest & { bill: BillInput }): ApiResult<MutationReceipt & { billId: number }> {
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

  updateBill(input: EditRequest & { id: number; changes: Partial<Omit<Bill, 'id'>> }): MutationResult {
    return change(input, ['id', 'changes'], (value) => {
      const bill = findBill(value.id);
      const raw = object(value.changes, 'changes');
      checkKeys(raw, ['payer', 'reason', 'type', 'amount', 'involved', 'distribution', 'ratios'], 'changes');
      const changes = Object.fromEntries(Object.entries(raw).filter(([, value]) => value !== undefined));
      const base = changes.type === undefined ? bill : applyBillChanges(bill, { type: changes.type as Bill['type'] }, data.members);
      return { ...data, bills: data.bills.map((item) => item.id === bill.id ? { ...base, ...changes } as Bill : item) };
    });
  },

  removeBill(input: EditRequest & { id: number }): MutationResult {
    return change(input, ['id'], (value) => {
      const bill = findBill(value.id);
      return { ...data, bills: data.bills.filter((item) => item.id !== bill.id) };
    });
  },

  moveBill(input: EditRequest & { id: number; beforeId: number | null }): MutationResult {
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

  clearLedger(input: EditRequest): MutationResult {
    return change(input, [], () => ({ ...data, name: t(data.currentLang, 'untitled_ledger'), members: [], bills: [] }), 'reset');
  },

  loadDemo(input: EditRequest): MutationResult {
    return change(input, [], () => ({ ...data, ...getDemoData(data.currentLang) }), 'reset');
  },

  setPreferences(input: EditRequest & { currentLang?: Lang; currentTheme?: Theme }): MutationResult {
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
