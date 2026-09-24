<script lang="ts">
  import { onDestroy } from 'svelte';
  import { t } from './lib/i18n';
  import { aassistant, appState, editFromUI, holdUserEdit, notices, runUserEdit, showEditError } from './lib/api';
  import { applyTheme } from './lib/theme';
  import { MIN_MEMBERS } from './lib/constants';
  import Header from './components/Header.svelte';
  import LedgerHeader from './components/LedgerHeader.svelte';
  import Paper from './components/Paper.svelte';
  import MembersSection from './components/MembersSection.svelte';
  import BillsSection from './components/BillsSection.svelte';
  import ResultSection from './components/ResultSection.svelte';
  import Modal from './components/Modal.svelte';
  import BookOpen from 'lucide-svelte/icons/book-open';
  import Eraser from 'lucide-svelte/icons/eraser';
  import Info from 'lucide-svelte/icons/info';

  let editModeHold: ReturnType<typeof holdUserEdit> | null = null;
  let isEditMode = false;
  let lastGeneration = 0;
  let confirmationAction: 'demo' | 'clear' = 'clear';
  let confirmationOpen = false;
  let confirmationHold: ReturnType<typeof holdUserEdit> | null = null;
  let members = $appState.members;
  let bills = $appState.bills;

  async function requestAction(action: 'demo' | 'clear') {
    if (confirmationHold) return;
    const hold = confirmationHold = holdUserEdit();
    const result = await hold.ready;
    if (confirmationHold !== hold) return;
    if (!result.ok) { closeConfirmation(); showEditError(result.error); return; }
    const current = aassistant.getLedger();
    const unnamed = !current.name.trim() || [t('en', 'untitled_ledger'), t('zh', 'untitled_ledger')].includes(current.name.trim());
    if (action === 'clear' && !current.members.length && !current.bills.length && unnamed) { closeConfirmation(); return; }
    if (action === 'demo' && !current.members.length && !current.bills.length && unnamed) {
      editFromUI(aassistant.loadDemo, {});
      closeConfirmation();
      return;
    }
    confirmationAction = action;
    confirmationOpen = true;
  }

  function confirmAction() {
    if (!confirmationOpen) return;
    if (confirmationAction === 'clear') editFromUI(aassistant.clearLedger, {});
    else editFromUI(aassistant.loadDemo, {});
    closeConfirmation();
  }

  function closeConfirmation() {
    confirmationOpen = false;
    confirmationHold?.release();
    confirmationHold = null;
  }

  async function toggleEditMode() {
    if (editModeHold) { closeUserEditing(); return; }
    const hold = editModeHold = holdUserEdit();
    const result = await hold.ready;
    if (editModeHold !== hold) return;
    if (!result.ok) { closeUserEditing(); showEditError(result.error); return; }
    isEditMode = true;
  }

  function closeUserEditing() {
    if (editModeHold) {
      if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
      editModeHold.release();
      editModeHold = null;
    }
    isEditMode = false;
    closeConfirmation();
  }

  onDestroy(closeUserEditing);

  $: if ((isEditMode && !$appState.editing) || (confirmationOpen && !$appState.editing) || $appState.generation !== lastGeneration) {
    closeUserEditing();
    lastGeneration = $appState.generation;
  }
  $: applyTheme($appState.currentTheme);
  $: document.documentElement.lang = $appState.currentLang;
  // Svelte 4 dirties object props even when equal; forward collections only when replaced.
  $: if (members !== $appState.members) members = $appState.members;
  $: if (bills !== $appState.bills) bills = $appState.bills;
  $: hasMembers = members.length > 0;
</script>

<svelte:head>
  <title>{t($appState.currentLang, 'page_title')}</title>
  <meta name="description" content={t($appState.currentLang, 'page_description')} />
</svelte:head>
<svelte:window on:blur={closeUserEditing} />

<div class="workspace">
  <Header
    lang={$appState.currentLang}
    theme={$appState.currentTheme}
    onDemo={() => requestAction('demo')}
    onToggleLang={() => runUserEdit(() => { editFromUI(aassistant.setPreferences, {
      currentLang: $appState.currentLang === 'en' ? 'zh' : 'en'
    }); })}
    onToggleTheme={() => runUserEdit(() => { editFromUI(aassistant.setPreferences, {
      currentTheme: $appState.currentTheme === 'light' ? 'dark' : 'light'
    }); })}
  />

  <main class="paper-stack">
    <Paper label={t($appState.currentLang, 'bills_title')}>
      {#key $appState.generation}
        <LedgerHeader lang={$appState.currentLang} name={$appState.name}
          {hasMembers} hasBills={bills.length > 0} {isEditMode}
          onToggleEdit={toggleEditMode}
          onRename={(name) => runUserEdit(() => { editFromUI(aassistant.renameLedger, { name }); })}
          onClear={() => requestAction('clear')} />
        <MembersSection lang={$appState.currentLang} {members}
          {isEditMode} />
        <BillsSection
          visible={members.length >= MIN_MEMBERS}
          lang={$appState.currentLang} {members} {bills}
          {isEditMode}
        />
      {/key}
    </Paper>
    <Paper label={t($appState.currentLang, 'result_title')}>
      <ResultSection
        lang={$appState.currentLang}
        result={$appState.result}
      />
    </Paper>
  </main>
</div>

<Modal open={confirmationOpen} lang={$appState.currentLang}
  title={t($appState.currentLang, confirmationAction === 'clear' ? 'confirm_clear_title' : 'demo_title')}
  confirmId={`confirm-${confirmationAction}-btn`} onConfirm={confirmAction} onClose={closeConfirmation}>
  <svelte:component this={confirmationAction === 'clear' ? Eraser : BookOpen} slot="title-icon" size={22} aria-hidden="true" />
  <p>{t($appState.currentLang, confirmationAction === 'clear' ? 'confirm_clear_body' : 'demo_body')}</p>
</Modal>

<Modal open={$notices.length > 0} lang={$appState.currentLang}
  title={t($appState.currentLang, 'notice_title')} showCancel={false}
  onConfirm={() => notices.update((pending) => pending.slice(1))} onClose={() => notices.update((pending) => pending.slice(1))}>
  <Info slot="title-icon" size={22} aria-hidden="true" />
  <p>{t($appState.currentLang, $notices[0] ?? '')}</p>
</Modal>
