<script lang="ts">
  import { tick } from 'svelte';
  import Modal from './Modal.svelte';
  import type { Bill, Lang } from '../lib/types';
  import { t } from '../lib/i18n';
  import { escapeHtml, generateBillTextSections } from '../lib/details';
  import { getCurrentTimeFormatted } from '../lib/utils';
  import { generateAndDownloadImage } from '../lib/image';

  export let open = false;
  export let lang: Lang;
  export let members: string[] = [];
  export let bills: Bill[] = [];
  export let onClose: () => void;

  let currentTime = '';
  let lastOpen = false;
  let billSection = '';
  let settlementSection = '';
  let fullText = '';
  let copyLabel = '';
  let textOutput: HTMLDivElement | null = null;
  let showScrollHint = false;

  $: if (open && !lastOpen) {
    currentTime = getCurrentTimeFormatted();
    copyLabel = t(lang, 'btn_copy');
  }
  $: lastOpen = open;

  $: ({ billSection, settlementSection } = generateBillTextSections(lang, members, bills));

  $: fullText = `${currentTime}\n\n${t(lang, 'details_bill_title')}\n${billSection}` +
    (settlementSection
      ? `\n\n${t(lang, 'settlement_title')}\n${settlementSection}`
      : '');

  $: if (open) {
    tick().then(checkScroll);
  }

  function checkScroll() {
    if (!textOutput) return;
    if (textOutput.scrollHeight > textOutput.clientHeight) {
      showScrollHint = textOutput.scrollTop + textOutput.clientHeight < textOutput.scrollHeight - 5;
    } else {
      showScrollHint = false;
    }
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(fullText);
    copyLabel = t(lang, 'copied');
    setTimeout(() => {
      copyLabel = t(lang, 'btn_copy');
    }, 500);
  }

  function handleDownload() {
    generateAndDownloadImage(lang, currentTime, billSection, settlementSection);
  }
</script>

<Modal open={open} title={t(lang, 'details_title')} large={true} onClose={onClose}>
  <div class="bill-text-output" id="bill-text-output" bind:this={textOutput} on:scroll={checkScroll}>
    <div class="details-time">{currentTime}</div>
    <div class="details-section-title">{t(lang, 'details_bill_title')}</div>
    {@html escapeHtml(billSection)}
    {#if settlementSection}
      <div class="details-section-title" style="margin-top:1rem;">{t(lang, 'settlement_title')}</div>
      {@html escapeHtml(settlementSection)}
    {/if}
  </div>
  <div class="scroll-hint" id="scroll-hint" style={`visibility: ${showScrollHint ? 'visible' : 'hidden'}`}
    >↓ {t(lang, 'scroll_hint')}</div
  >
  <div class="modal-actions">
    <button id="copy-btn" on:click={handleCopy}>{copyLabel || t(lang, 'btn_copy')}</button>
    <button id="download-image-btn" on:click={handleDownload}>{t(lang, 'btn_download_image')}</button>
    <button on:click={onClose}>{t(lang, 'btn_close')}</button>
  </div>
</Modal>
