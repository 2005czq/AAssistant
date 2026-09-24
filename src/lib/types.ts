export type Lang = 'en' | 'zh';
export type Theme = 'light' | 'dark';
export const BILL_TYPES = ['AA', 'Join', 'Remove', 'Ratio', 'Distribution'] as const;
export type BillType = (typeof BILL_TYPES)[number];

export interface Bill {
  id: number;
  payer: string;
  reason: string;
  type: BillType;
  amount: number;
  involved: string[];
  distribution: Record<string, number>;
  ratios: Record<string, number>;
}

export type BillDraft = Omit<Bill, 'type' | 'amount'> & { type: BillType | ''; amount: number | '' };

export type BillError = 'payer' | 'type' | 'amount' | 'involved' | 'distribution' | 'ratios';

export interface Transfer {
  from: string;
  to: string;
  amount: string;
}

export interface Settlement {
  transfers: Transfer[];
  error: 'invalid' | null;
}

export interface Ledger {
  name: string;
  members: string[];
  bills: Bill[];
}

export interface AppState extends Ledger {
  currentLang: Lang;
  currentTheme: Theme;
  animations: boolean;
}

export type MemberChange = { type: 'add' | 'remove' | 'move' | 'reset' }
  | { type: 'rename'; name: string; newName: string };

export interface LedgerIssue {
  field: string;
  message: string;
  billId?: number;
  code?: ValidationCode;
  params?: Record<string, string | number>;
}

export type ValidationCode = 'object' | 'array' | 'string' | 'unknown_field'
  | 'member_name' | 'member_duplicate' | 'member_exists' | 'number' | 'bill_id' | 'duplicate_bill_id'
  | 'split_type' | 'payer' | 'reason_length' | 'involved' | 'involved_duplicate'
  | 'bill_id_assigned' | 'bill_id_exhausted' | 'language' | 'theme' | 'animations';

export interface LedgerSnapshot extends AppState {
  persisted: boolean;
  issues: LedgerIssue[];
}

export type BillInput = Pick<Bill, 'payer' | 'reason'> & (
  | { type: 'AA'; amount: number }
  | { type: 'Join' | 'Remove'; amount: number; involved: string[] }
  | { type: 'Ratio'; amount: number; ratios: Record<string, number> }
  | { type: 'Distribution'; distribution: Record<string, number> }
);

export interface ApiError {
  code: 'INVALID_ARGUMENT' | 'NOT_FOUND' | 'INVALID_LEDGER'
    | 'EMPTY_LEDGER' | 'MEMBER_LIMIT' | 'EXPORT_FAILED'
    | 'EDIT_BUSY' | 'EDIT_REQUIRED' | 'SAVE_FAILED';
  message: string;
  issues?: LedgerIssue[];
}

export type ApiResult<T> = ({ ok: true } & T) | { ok: false; error: ApiError };

export interface MutationReceipt {
  persisted: boolean;
  issues: LedgerIssue[];
}

export interface TextReport {
  name: string;
  settled: boolean;
  lang: Lang;
  theme: Theme;
  generatedAt: string;
  currentTime: string;
  billSection: string;
  settlementSection: string;
  text: string;
}
