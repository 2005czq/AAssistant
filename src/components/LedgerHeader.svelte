<script lang="ts">
  import Button from './Button.svelte';
  import Check from 'lucide-svelte/icons/check';
  import Eraser from 'lucide-svelte/icons/eraser';
  import Pencil from 'lucide-svelte/icons/pencil';
  import type { Lang } from '../lib/types';
  import { t } from '../lib/i18n';
  import { editLock } from '../lib/edit';

  export let lang: Lang;
  export let name: string;
  export let onRename: (name: string) => void;
  export let onClear: () => void;
  export let isEditMode = false;
  export let onToggleEdit: () => void;
  export let hasMembers: boolean;
  export let hasBills: boolean;

  const unnamedNames = [t('en', 'untitled_ledger'), t('zh', 'untitled_ledger')];
  let editingName = false;
  let displayName = '';
  $: if (!editingName) displayName = unnamedNames.includes(name) ? '' : name;
  $: canClear = hasMembers || hasBills || (!!name.trim() && !unnamedNames.includes(name.trim()));
</script>

<div class="ledger-header">
  <h1 class="ledger-title" aria-label={name || t(lang, 'untitled_ledger')}>
    <input type="text" class="ledger-name-input" value={displayName} aria-label={t(lang, 'ledger_name')} use:editLock
      placeholder={t(lang, 'placeholder_ledger_name')}
      on:focus={() => (editingName = true)}
      on:input={(event) => { displayName = event.currentTarget.value; onRename(displayName); }}
      on:blur={(event) => { editingName = false; onRename(event.currentTarget.value.trim() || t(lang, 'untitled_ledger')); }}
      on:keydown={(event) => { if (event.key === 'Enter' && !event.isComposing) event.currentTarget.blur(); }} />
  </h1>
  <div class="ledger-actions">
    <Button id="edit-btn" disabled={!hasMembers && !isEditMode} aria-pressed={isEditMode} on:click={onToggleEdit}>
      {#if isEditMode}<Check size={18} aria-hidden="true" />{:else}<Pencil size={18} aria-hidden="true" />{/if}
      {t(lang, isEditMode ? 'done' : 'edit')}
    </Button>
    <Button id="clear-btn" variant="danger" disabled={!canClear} on:click={onClear}><Eraser size={18} aria-hidden="true" />{t(lang, 'clear')}</Button>
  </div>
</div>
