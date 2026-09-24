<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { createProgress, MOTION } from '../lib/motion';
  import { createPaperShape } from '../lib/paper';
  import Button from './Button.svelte';
  import Check from 'lucide-svelte/icons/check';
  import X from 'lucide-svelte/icons/x';
  import type { Lang } from '../lib/types';
  import { t } from '../lib/i18n';

  export let open = false;
  export let title = '';
  export let lang: Lang;
  export let confirmId: string | undefined = undefined;
  export let showCancel = true;
  export let onConfirm: () => void;
  export let onClose: () => void;

  let dialog: HTMLDialogElement;
  let content: HTMLDivElement;
  let progress: ReturnType<typeof createProgress>;
  let returnFocus: HTMLElement | null = null;
  let run = 0;
  const clipPath = createPaperShape();

  onMount(() => {
    progress = createProgress((value) => {
      dialog.style.setProperty('--modal-progress', String(value));
      content.style.opacity = String(value);
      content.style.transform = `translateY(${(1 - value) * 8}px) scale(${.98 + value * .02})`;
    }, MOTION.layout);
    dialog.addEventListener('keydown', trapFocus);
    return () => { dialog.removeEventListener('keydown', trapFocus); progress.destroy(); };
  });
  onDestroy(() => { run += 1; dialog?.close(); });
  $: if (dialog && progress) void present(open);

  async function present(next: boolean) {
    const ownRun = ++run;
    if (next) {
      content.inert = false;
      if (!dialog.open) {
        returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        dialog.showModal();
        dialog.focus({ preventScroll: true });
      }
      await progress.set(1);
    } else {
      content.inert = true;
      if (!await progress.set(0) || ownRun !== run) return;
      dialog.close();
      if (returnFocus?.isConnected) returnFocus.focus({ preventScroll: true });
    }
  }

  function trapFocus(event: KeyboardEvent) {
    if (event.key !== 'Tab') return;
    const controls = Array.from(content.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), a[href], [tabindex="0"]'));
    const first = controls[0];
    const last = controls[controls.length - 1];
    if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog)) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  }
</script>

<dialog
  class="modal-overlay"
  aria-modal="true"
  tabindex="-1"
  bind:this={dialog}
  aria-label={title}
  on:cancel|preventDefault={onClose}
  on:pointerdown={(event) => {
    if (event.target === dialog && event.button === 0) {
      event.preventDefault();
      onClose();
    }
  }}
>
  <div class="modal-content" bind:this={content}>
    <div class="paper-surface" aria-hidden="true"><div class="paper-cutout" style:clip-path={clipPath}></div></div>
    <h2><slot name="title-icon" /><span>{title}</span></h2>
    <div class="modal-body">
      <slot />
      <div class="modal-actions">
        <Button id={confirmId} variant="success" on:click={onConfirm}><Check size={18} aria-hidden="true" />{t(lang, 'btn_confirm')}</Button>
        {#if showCancel}<Button variant="danger" on:click={onClose}><X size={18} aria-hidden="true" />{t(lang, 'btn_cancel')}</Button>{/if}
      </div>
    </div>
  </div>
</dialog>

<style>
  .modal-actions {
    flex-shrink: 0;
    display: flex;
    justify-content: center;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-top: 1rem;
  }
</style>
