import type { BillType, Lang } from './types';
import { t } from './i18n';

export function getTypeOptions(lang: Lang): Array<{ value: BillType; label: string }> {
  return [
    { value: 'AA', label: t(lang, 'type_AA') },
    { value: 'Join', label: t(lang, 'type_Join') },
    { value: 'Remove', label: t(lang, 'type_Remove') },
    { value: 'Ratio', label: t(lang, 'type_Ratio') },
    { value: 'Distribution', label: t(lang, 'type_Distribution') }
  ];
}

export function getTypeLabel(lang: Lang, type: BillType): string {
  return t(lang, `type_${type}`);
}
