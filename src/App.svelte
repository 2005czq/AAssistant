<script lang="ts">
  import { onMount } from 'svelte';
  import type { Bill, BillType, Lang, Theme } from './lib/types';
  import { t } from './lib/i18n';
  import { detectSystemLanguage, detectSystemTheme } from './lib/utils';
  import { calculateTransfers, hasBillErrors } from './lib/calculations';
  import { clearState, loadState, saveState } from './lib/storage';
  import { getDemoData } from './lib/demo';
  import { GITHUB_URL } from './lib/constants';

  import Header from './components/Header.svelte';
  import MembersSection from './components/MembersSection.svelte';
  import BillsSection from './components/BillsSection.svelte';
  import ResultSection from './components/ResultSection.svelte';
  import ConfirmModal from './components/ConfirmModal.svelte';
  import DetailsModal from './components/DetailsModal.svelte';

  let currentLang: Lang = 'en';
  let currentTheme: Theme = 'light';
  let members: string[] = [];
  let bills: Bill[] = [];
  let isEditMode = false;

  let showClearModal = false;
  let showDetailsModal = false;

  const MAX_MEMBER_NAME_LENGTH = 8;

  const supportedBillTypes: BillType[] = ['AA', 'Join', 'Remove', 'Distribution', 'Ratio'];

  function normalizeBill(raw: Partial<Bill>): Bill {
    const type = supportedBillTypes.includes(raw.type as BillType) ? (raw.type as BillType) : 'AA';
    const distribution =
      raw.distribution && typeof raw.distribution === 'object' && !Array.isArray(raw.distribution)
        ? raw.distribution
        : {};
    const ratios =
      raw.ratios && typeof raw.ratios === 'object' && !Array.isArray(raw.ratios) ? raw.ratios : {};
    return {
      id: typeof raw.id === 'number' ? raw.id : Date.now(),
      payer: raw.payer ?? '',
      reason: raw.reason ?? '-',
      type,
      amount: typeof raw.amount === 'number' ? raw.amount : 0,
      involved: Array.isArray(raw.involved) ? raw.involved : [],
      distribution,
      ratios
    };
  }

  function persist() {
    saveState({ members, bills, currentLang, currentTheme });
  }

  function applyTheme() {
    if (typeof document !== 'undefined') {
      document.body.setAttribute('data-theme', currentTheme);
    }
  }

  function applyTitle() {
    if (typeof document !== 'undefined') {
      document.title = t(currentLang, 'page_title');
    }
  }

  function addMember(name: string) {
    let trimmed = name.trim();
    if (!trimmed || members.includes(trimmed)) return;
    if (trimmed.length > MAX_MEMBER_NAME_LENGTH) {
      trimmed = trimmed.substring(0, MAX_MEMBER_NAME_LENGTH);
    }
    if (members.includes(trimmed)) return;
    members = [...members, trimmed];
    persist();
  }

  function removeMember(name: string) {
    members = members.filter((m) => m !== name);
    bills = bills.map((bill) => {
      const updated: Bill = {
        ...bill,
        involved: bill.involved.filter((m) => m !== name),
        distribution: { ...bill.distribution },
        ratios: { ...bill.ratios }
      };
      if (updated.payer === name) updated.payer = '';
      if (updated.distribution[name] !== undefined) delete updated.distribution[name];
      if (updated.ratios[name] !== undefined) delete updated.ratios[name];
      return updated;
    });
    persist();
  }

  function renameMember(oldName: string, newName: string) {
    const trimmed = newName.trim();
    if (!trimmed || trimmed === oldName) return;
    if (members.includes(trimmed)) return;

    members = members.map((m) => (m === oldName ? trimmed : m));
    bills = bills.map((bill) => {
      const updated: Bill = {
        ...bill,
        involved: bill.involved.map((m) => (m === oldName ? trimmed : m)),
        distribution: { ...bill.distribution },
        ratios: { ...bill.ratios }
      };
      if (updated.payer === oldName) updated.payer = trimmed;
      if (updated.distribution[oldName] !== undefined) {
        updated.distribution[trimmed] = updated.distribution[oldName];
        delete updated.distribution[oldName];
      }
      if (updated.ratios[oldName] !== undefined) {
        updated.ratios[trimmed] = updated.ratios[oldName];
        delete updated.ratios[oldName];
      }
      return updated;
    });
    persist();
  }

  function setBills(nextBills: Bill[]) {
    bills = nextBills.map((bill) => normalizeBill(bill));
    persist();
  }

  function toggleTheme() {
    currentTheme = currentTheme === 'light' ? 'dark' : 'light';
    applyTheme();
    persist();
  }

  function toggleLang() {
    currentLang = currentLang === 'en' ? 'zh' : 'en';
    applyTitle();
    persist();
  }

  function toggleEditMode() {
    isEditMode = !isEditMode;
  }

  function openGithub() {
    window.open(GITHUB_URL, '_blank');
  }

  function loadDemo() {
    const demo = getDemoData(currentLang);
    members = demo.members;
    bills = demo.bills;
    persist();
  }

  function clearAll() {
    members = [];
    bills = [];
    clearState();
    showClearModal = false;
  }

  onMount(() => {
    const stored = loadState();
    if (stored) {
      members = stored.members ?? [];
      bills = (stored.bills ?? []).map((bill) => normalizeBill(bill));
      const storedLang = stored.currentLang;
      const storedTheme = stored.currentTheme;
      currentLang = storedLang === 'en' || storedLang === 'zh' ? storedLang : detectSystemLanguage();
      currentTheme = storedTheme === 'light' || storedTheme === 'dark' ? storedTheme : detectSystemTheme();
    } else {
      currentLang = detectSystemLanguage();
      currentTheme = detectSystemTheme();
    }
    applyTheme();
    applyTitle();
  });

  $: currentTheme, applyTheme();
  $: currentLang, applyTitle();

  $: hasErrors = hasBillErrors(members, bills);
  $: transfers = calculateTransfers(members, bills);
</script>

<div class="paper">
  <Header
    lang={currentLang}
    theme={currentTheme}
    isEditMode={isEditMode}
    onToggleLang={toggleLang}
    onToggleTheme={toggleTheme}
    onDemo={loadDemo}
    onClear={() => (showClearModal = true)}
    onToggleEdit={toggleEditMode}
    onGithub={openGithub}
  />

  <main>
    <MembersSection
      lang={currentLang}
      {members}
      onAddMember={addMember}
      onRemoveMember={removeMember}
      onRenameMember={renameMember}
    />

    <BillsSection lang={currentLang} {members} {bills} {isEditMode} onSetBills={setBills} />

    <ResultSection
      lang={currentLang}
      hasErrors={hasErrors}
      transfers={transfers}
      billsCount={bills.length}
      showDetails={!hasErrors}
      onDetails={() => (showDetailsModal = true)}
    />
  </main>
</div>

<ConfirmModal
  open={showClearModal}
  lang={currentLang}
  onConfirm={clearAll}
  onClose={() => (showClearModal = false)}
/>

<DetailsModal
  open={showDetailsModal}
  lang={currentLang}
  {members}
  {bills}
  onClose={() => (showDetailsModal = false)}
/>
