import type { Lang } from './types';

export const i18n = {
  en: {
    page_title: 'AAssistant - Bill Splitter',
    members_title: 'Members',
    demo: 'Example',
    clear: 'Clear',
    details: 'Details',
    bills_title: 'Bills',
    add: '+',
    payer: 'Payer',
    reason: 'Reason',
    type: 'Type',
    amount: 'Amount',
    result_title: 'Settlement',
    transfer: '{from} → {amount} → {to}',
    error_fix_first: 'Please complete the red-circled items first~',
    placeholder_new_member: '+ Add',
    confirm_clear_title: 'Clear All?',
    confirm_clear_body: 'All members and bills will be deleted.',
    btn_yes: 'Yes',
    btn_no: 'Cancel',
    details_title: 'Bill Details',
    btn_copy: 'Copy',
    btn_close: 'Close',
    btn_download_image: 'Download Image',
    copied: 'Copied!',
    bill_pays_for: '{payer} pays for {reason}:',
    should_pay: '  {name} owes {amount}',
    settlement_title: 'Settlement',
    should_transfer: '{from} should transfer {amount} to {to}',
    details_bill_title: 'Bill Details',
    footer_made_with: 'Made with ❤️ by AAssistant',
    footer_qr_text: 'Create your bill',
    type_AA: 'Split Equally',
    type_Join: 'Only Selected',
    type_Remove: 'Except Selected',
    type_Distribution: 'By Amount',
    type_Ratio: 'By Shares',
    scroll_hint: 'Scroll for more',
    edit: 'Edit',
    done: 'Done',
    no_transfer: 'No transfers needed, all settled!'
  },
  zh: {
    page_title: 'AAssistant - 账单分摊',
    members_title: '成员',
    demo: '示例',
    clear: '清空',
    details: '详情',
    bills_title: '账单',
    add: '+',
    payer: '付款人',
    reason: '原因',
    type: '类型',
    amount: '金额',
    result_title: '结算方案',
    transfer: '{from} → {amount} → {to}',
    error_fix_first: '请先完成红圈标记的内容哦~',
    placeholder_new_member: '+ 添加',
    confirm_clear_title: '确认清空？',
    confirm_clear_body: '所有成员和账单都将被删除。',
    btn_yes: '确认',
    btn_no: '取消',
    details_title: '账单详情',
    btn_copy: '复制',
    btn_close: '关闭',
    btn_download_image: '下载图片',
    copied: '已复制！',
    bill_pays_for: '{payer} 支付了 {reason}：',
    should_pay: '  {name} 应付 {amount}',
    settlement_title: '结算方案',
    should_transfer: '{from} 应转账 {amount} 给 {to}',
    details_bill_title: '账单详情',
    footer_made_with: '由 AAssistant 用 ❤️ 生成',
    footer_qr_text: '创作你的账单',
    type_AA: '平均分摊',
    type_Join: '仅选中平摊',
    type_Remove: '排除选中平摊',
    type_Distribution: '自定义分摊',
    type_Ratio: '按比例分摊',
    scroll_hint: '下滑查看更多',
    edit: '编辑',
    done: '完成',
    no_transfer: '无需转账，已全部结清！'
  }
} as const;

export type I18nKey = keyof (typeof i18n)['en'];

export function t(lang: Lang, key: string, params: Record<string, string | number> = {}): string {
  const dict = i18n[lang] as Record<string, string>;
  let str = dict[key] ?? key;
  Object.entries(params).forEach(([k, v]) => {
    str = str.replace(`{${k}}`, String(v));
  });
  return str;
}
