import type { Lang } from './types';

const i18n = {
  en: {
    // App header
    page_title: 'AAssistant - Bill Splitter',
    page_description: 'Split bills and settle up easily.',
    brand_tagline: 'Split bills with ease',
    switch_language: 'Switch to 中文',
    toggle_theme: 'Toggle theme',
    disable_animations: 'Pause animations',
    enable_animations: 'Play animations',
    agent_guide: 'Agent guide',
    ledger_tools: 'Bill tools',
    demo: 'Demo',

    // Ledger controls and dialogs
    bills_title: 'Bills',
    ledger_name: 'Bill name',
    untitled_ledger: 'Untitled bill',
    placeholder_ledger_name: 'Enter bill subject',
    edit: 'Edit',
    done: 'Done',
    clear: 'Clear',
    confirm_clear_title: 'Clear All?',
    confirm_clear_body: 'All members and bills will be deleted',
    demo_title: 'Load the demo bill?',
    demo_body: 'The demo will replace the current bill, including its name, members, and entries.',
    notice_title: 'Notice',
    btn_confirm: 'Confirm',
    btn_cancel: 'Cancel',

    // Members
    members_title: 'Members',
    member_name: 'Member name',
    placeholder_new_member: '+ Add member',
    reorder_member: 'Reorder {name}',
    delete_member: 'Remove {name}',

    // Bill fields and split types
    payer: 'Payer',
    select_payer: 'Select payer',
    reason: 'Reason',
    placeholder_reason: 'Enter reason',
    type: 'Type',
    select_type: 'Select type',
    amount: 'Amount',
    placeholder_amount: 'Enter amount',
    add_bill: 'Add bill',
    delete_bill: 'Delete bill',
    reorder_bill: 'Reorder bill',
    type_AA: 'Split Equally',
    type_Join: 'Only Selected',
    type_Remove: 'Except Selected',
    type_Distribution: 'By Amount',
    type_Ratio: 'By Shares',

    // Incomplete ledger and settlement errors
    error_fix_first: 'Please complete or correct the fields circled in red',
    reason_members: 'Add at least {count} members',
    reason_bills: 'Add at least one bill',
    reason_amount: 'Enter an amount greater than 0',
    reason_involved: 'Select members and include someone other than the payer in the split',
    reason_distribution: 'Give someone other than the payer a positive amount',
    reason_ratios: 'Give someone other than the payer a positive share',
    amount_overflow: 'The total amount is too large to calculate accurately; please reduce the amounts',

    // Storage and editing notices
    editing_busy: 'Another editor is using this bill. Try again after they finish.',
    storage_restore_failed: 'The saved bill could not be restored. Saving changes to this new bill will replace it.',
    storage_save_failed: 'Changes could not be saved automatically. Keep this page open and copy or download your results before leaving.',
    preferences_unavailable: 'Preferences could not be read or saved. Current settings only apply to this page.',

    // Result actions
    result_title: 'Split Results',
    btn_copy: 'Copy',
    btn_download_image: 'Download',
    copied: 'Copied',
    failed: 'Failed',
    copy_failed: 'Copy failed',
    download_failed: 'Image generation failed',

    // Reports and image export
    details_bill_title: 'Bill Details',
    bill_pays_for: '{payer} pays for {reason}:',
    bill_paid: '{payer} paid {amount} for {reason}',
    should_pay: '{name} owes {amount}',
    settlement_title: 'Settlement',
    should_transfer: '{from} should transfer {amount} to {to}',
    no_transfer: 'No transfers needed, all settled',
    footer_made_with: 'Made with ❤️ by AAssistant'
  },
  zh: {
    // App header
    page_title: 'AAssistant - 账单分摊',
    page_description: '轻松分摊账单，算清转账金额。',
    brand_tagline: '让分账更轻松',
    switch_language: '切换到 English',
    toggle_theme: '切换主题',
    disable_animations: '关闭动画',
    enable_animations: '开启动画',
    agent_guide: 'Agent 指南',
    ledger_tools: '账单操作',
    demo: '示例',

    // Ledger controls and dialogs
    bills_title: '账单',
    ledger_name: '账单名称',
    untitled_ledger: '未命名账单',
    placeholder_ledger_name: '填写账单主题',
    edit: '编辑',
    done: '完成',
    clear: '清空',
    confirm_clear_title: '确认清空？',
    confirm_clear_body: '所有成员和账单都将被删除',
    demo_title: '加载示例账单？',
    demo_body: '示例将替换当前账单的名称、成员和全部记录。',
    notice_title: '提示',
    btn_confirm: '确认',
    btn_cancel: '取消',

    // Members
    members_title: '成员',
    member_name: '成员姓名',
    placeholder_new_member: '+ 添加成员',
    reorder_member: '调整{name}的顺序',
    delete_member: '移除{name}',

    // Bill fields and split types
    payer: '付款人',
    select_payer: '选择付款人',
    reason: '原因',
    placeholder_reason: '填写原因',
    type: '类型',
    select_type: '选择类型',
    amount: '金额',
    placeholder_amount: '填写金额',
    add_bill: '添加账单',
    delete_bill: '删除账单',
    reorder_bill: '调整账单顺序',
    type_AA: '平均分摊',
    type_Join: '仅选中平摊',
    type_Remove: '排除选中平摊',
    type_Distribution: '自定义分摊',
    type_Ratio: '按比例分摊',

    // Incomplete ledger and settlement errors
    error_fix_first: '请先补充或修改红圈内的内容',
    reason_members: '至少需要 {count} 位成员',
    reason_bills: '请先添加一条账单',
    reason_amount: '金额须大于 0',
    reason_involved: '请选择成员，并确保付款人以外有人参与分摊',
    reason_distribution: '付款人以外至少一人的分摊金额须大于 0',
    reason_ratios: '付款人以外至少一人的比例须大于 0',
    amount_overflow: '总金额过大，无法精确计算，请减小金额',

    // Storage and editing notices
    editing_busy: '其他编辑者正在使用此账本，请在对方结束后重试。',
    storage_restore_failed: '无法恢复已保存的账本。新账本保存成功后会替换原存档。',
    storage_save_failed: '当前修改无法自动保存。请保持页面打开，并在离开前复制或下载结果。',
    preferences_unavailable: '偏好设置无法读取或保存。当前设置仅在本页生效。',

    // Result actions
    result_title: '分账结果',
    btn_copy: '复制',
    btn_download_image: '下载',
    copied: '已复制',
    failed: '失败',
    copy_failed: '复制失败',
    download_failed: '图片生成失败',

    // Reports and image export
    details_bill_title: '账单详情',
    bill_pays_for: '{payer} 支付了 {reason}：',
    bill_paid: '{payer} 为{reason}支付了 {amount}',
    should_pay: '{name} 应付 {amount}',
    settlement_title: '结算方案',
    should_transfer: '{from} 应转账 {amount} 给 {to}',
    no_transfer: '无需转账，已全部结清',
    footer_made_with: '由 AAssistant 用 ❤️ 生成'
  }
} as const satisfies Record<Lang, Record<string, string>>;

export function t(lang: Lang, key: string, params: Record<string, string | number> = {}): string {
  const dict = i18n[lang] as Record<string, string>;
  return (dict[key] ?? key).replace(/\{(\w+)\}/g, (placeholder, name: string) =>
    Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : placeholder);
}
