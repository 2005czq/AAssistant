<script lang="ts">
  import Modal from './Modal.svelte';
  import type { Lang } from '../lib/types';
  import { t } from '../lib/i18n';

  export let open = false;
  export let lang: Lang;
  export let onConfirm: () => void;
  export let onClose: () => void;
</script>

<Modal open={open} title={t(lang, 'confirm_clear_title')} onClose={onClose}>
  <p>{t(lang, 'confirm_clear_body')}</p>
  <div class="modal-actions">
    <button class="btn-danger" on:click={onConfirm}>{t(lang, 'btn_yes')}</button>
    <button on:click={onClose}>{t(lang, 'btn_no')}</button>
  </div>
</Modal>
