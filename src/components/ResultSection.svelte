<script lang="ts">
  import { onDestroy, onMount, tick } from 'svelte';
  import { createProgress, MOTION } from '../lib/motion';
  import Button from './Button.svelte';
  import ClipboardCopy from 'lucide-svelte/icons/clipboard-copy';
  import Check from 'lucide-svelte/icons/check';
  import X from 'lucide-svelte/icons/x';
  import ImageDown from 'lucide-svelte/icons/image-down';
  import HandCoins from 'lucide-svelte/icons/hand-coins';
  import ReceiptText from 'lucide-svelte/icons/receipt-text';
  import ReportText from './ReportText.svelte';
  import type { ApiError, ApiResult, Lang, TextReport } from '../lib/types';
  import { t } from '../lib/i18n';
  import { MIN_MEMBERS } from '../lib/constants';
  import { aassistant } from '../lib/api';

  export let lang: Lang;
  export let result: ApiResult<TextReport>;

  let copiedText: string | null = null;
  let copyStatus: 'idle' | 'copied' | 'failed' = 'idle';
  let copying = false;
  let exporting = false;
  let downloadFailed = false;
  let copyTimer: ReturnType<typeof setTimeout>;
  let downloadTimer: ReturnType<typeof setTimeout>;
  let destroyed = false;
  let details: ReportText;
  let settlement: ReportText;
  let structureProgress = 0;
  let errorOpacity = 0;
  let columnsShown = false;
  let errorShown = false;
  let shownError = '';
  let settled = false;
  let mounted = false;
  let run = 0;
  let structure: ReturnType<typeof createProgress>;
  let errorFade: ReturnType<typeof createProgress>;

  onMount(() => {
    structure = createProgress((value) => { structureProgress = value; }, MOTION.ink);
    errorFade = createProgress((value) => { errorOpacity = value; }, MOTION.fade);
    mounted = true;
    return () => { run += 1; structure.destroy(); errorFade.destroy(); };
  });

  $: if (mounted) void present(report, message, reason);

  async function present(next: TextReport | null, message: string, reason: string) {
    const ownRun = ++run;
    details.stop();
    settlement.stop();
    structure.stop();
    errorFade.stop();
    const current = () => ownRun === run;
    if (!next) {
      if (columnsShown) {
        // Keep the full divider height until both columns finish erasing.
        const erased = await Promise.all([details.write('', true), settlement.write('', true)]);
        if (!erased.every(Boolean) || !current()) return;
        if (!await structure.set(0) || !current()) return;
        columnsShown = false;
      }
      const nextError = reason ? `${message}\n${reason}` : message;
      if (shownError !== nextError) {
        if (!await errorFade.set(0) || !current()) return;
        shownError = nextError;
      }
      errorShown = !!nextError;
      await tick();
      if (current()) await errorFade.set(1);
      return;
    }
    if (!await errorFade.set(0) || !current()) return;
    errorShown = false;
    const revealing = !columnsShown || structure.value < 1;
    columnsShown = true;
    settled = next.settled;
    await tick();
    if (!current()) return;
    if (revealing) {
      details.reserve(next.billSection);
      settlement.reserve(next.settlementSection);
    }
    if (!await structure.set(1) || !current()) return;
    await Promise.all([details.write(next.billSection), settlement.write(next.settlementSection)]);
  }

  $: report = result.ok ? result : null;
  $: copied = copyStatus === 'copied' && report?.text === copiedText;
  $: message = result.ok ? ''
    : result.error.code === 'INVALID_LEDGER' || result.error.code === 'EMPTY_LEDGER' ? t(lang, 'error_fix_first')
    : result.error.code === 'AMOUNT_OVERFLOW' ? t(lang, 'amount_overflow') : '';
  $: reason = !result.ok ? ledgerErrorReason(lang, result.error) : '';

  function ledgerErrorReason(lang: Lang, error: ApiError): string {
    if (error.code === 'EMPTY_LEDGER') return t(lang, 'reason_bills');
    if (error.code !== 'INVALID_LEDGER') return '';
    const issue = error.issues?.[0];
    if (!issue) return '';
    const field = issue.field.slice(issue.field.lastIndexOf('.') + 1);
    const keys: Record<string, string> = {
      members: 'reason_members', payer: 'select_payer', amount: 'reason_amount',
      involved: 'reason_involved', distribution: 'reason_distribution', ratios: 'reason_ratios'
    };
    return keys[field] ? t(lang, keys[field], { count: MIN_MEMBERS }) : '';
  }

  onDestroy(() => {
    destroyed = true;
    clearTimeout(copyTimer);
    clearTimeout(downloadTimer);
  });

  async function handleCopy() {
    if (!report || copying) return;
    clearTimeout(copyTimer);
    copyStatus = 'idle';
    copying = true;
    try {
      const copy = aassistant.getText();
      if (copy.ok) {
        await navigator.clipboard.writeText(copy.text);
        if (destroyed) return;
        copiedText = copy.text;
        copyStatus = 'copied';
      } else copyStatus = 'failed';
    } catch {
      if (destroyed) return;
      copyStatus = 'failed';
    } finally {
      copying = false;
    }
    if (!destroyed) {
      copyTimer = setTimeout(() => { copyStatus = 'idle'; }, copyStatus === 'failed' ? 3000 : 1500);
    }
  }

  async function handleDownload() {
    if (!report || exporting) return;
    clearTimeout(downloadTimer);
    downloadFailed = false;
    exporting = true;
    try {
      const downloaded = await aassistant.downloadImage();
      if (destroyed) return;
      downloadFailed = !downloaded.ok;
    } catch {
      if (destroyed) return;
      downloadFailed = true;
    } finally {
      exporting = false;
    }
    if (!destroyed && downloadFailed) {
      downloadTimer = setTimeout(() => { downloadFailed = false; }, 3000);
    }
  }
</script>

<section id="section-result" class="notebook-section" aria-labelledby="result-heading">
  <div class="result-toolbar">
    <h2 id="result-heading">{t(lang, 'result_title')}</h2>
    <div class="result-actions">
      <Button id="copy-btn" disabled={!report || copying} loading={copying} variant={copyStatus === 'failed' ? 'danger' : 'default'}
        aria-label={copyStatus === 'failed' ? t(lang, 'copy_failed') : undefined} aria-live="polite" aria-atomic="true" on:click={handleCopy}>
        {#if copyStatus === 'failed'}<X size={18} aria-hidden="true" />
        {:else if copied}<Check size={18} aria-hidden="true" />{:else}<ClipboardCopy size={18} aria-hidden="true" />{/if}
        {t(lang, copyStatus === 'failed' ? 'failed' : copied ? 'copied' : 'btn_copy')}
      </Button>
      <Button id="download-image-btn" disabled={exporting || !report} loading={exporting} variant={downloadFailed ? 'danger' : 'default'}
        aria-label={downloadFailed ? t(lang, 'download_failed') : undefined} aria-live="polite" aria-atomic="true" on:click={handleDownload}>
        {#if downloadFailed}<X size={18} aria-hidden="true" />{:else}<ImageDown size={18} aria-hidden="true" />{/if}
        {t(lang, downloadFailed ? 'failed' : 'btn_download_image')}
      </Button>
    </div>
  </div>
  <div class="report-stage">
    <div class="report-columns" hidden={!columnsShown} aria-hidden={!report} inert={!report}
      style:--report-progress={structureProgress}>
      <section class="report-column" aria-labelledby="details-heading">
        <h2 id="details-heading" style:opacity={structureProgress}>
          <ReceiptText size={20} aria-hidden="true" /><span>{t(lang, 'details_bill_title')}</span>
        </h2>
        <div id="bill-details-container" class="result-container">
          <ReportText bind:this={details} />
        </div>
      </section>
      <section class="report-column settlement-column" aria-labelledby="settlement-heading">
        <h2 id="settlement-heading" style:opacity={structureProgress}>
          <HandCoins size={20} aria-hidden="true" /><span>{t(lang, 'settlement_title')}</span>
        </h2>
        <div id="result-container" class="result-container">
          <ReportText bind:this={settlement} state={settled ? 'settled' : 'normal'} />
        </div>
      </section>
      <span class="report-divider" aria-hidden="true"></span>
    </div>
    <p class="result-message" hidden={!errorShown} style:opacity={errorOpacity} aria-hidden={!!report} role="status">{shownError}</p>
  </div>
</section>
