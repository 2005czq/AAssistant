export type Lang = 'en' | 'zh';
export type Theme = 'light' | 'dark';
export type BillType = 'AA' | 'Join' | 'Remove' | 'Distribution' | 'Ratio';

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

export interface Transfer {
  from: string;
  to: string;
  amount: string;
}

export interface AppState {
  members: string[];
  bills: Bill[];
  currentLang: Lang;
  currentTheme: Theme;
}
