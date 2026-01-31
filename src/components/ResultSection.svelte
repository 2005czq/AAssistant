<script lang="ts">
  import type { Lang, Transfer } from '../lib/types';
  import { t } from '../lib/i18n';
  import { ICON_PENCIL } from '../lib/constants';

  export let lang: Lang;
  export let hasErrors = false;
  export let transfers: Transfer[] = [];
  export let showDetails = true;
  export let onDetails: () => void;
  export let billsCount = 0;
</script>

<section id="section-result" class="notebook-section">
  <div class="result-header">
    <h2>{t(lang, 'result_title')}</h2>
    {#if showDetails}
      <button id="details-btn" on:click={onDetails}>{t(lang, 'details')}</button>
    {/if}
  </div>
  <div id="result-container" class="result-container">
    {#if hasErrors}
      <div class="error-message">
        {@html ICON_PENCIL}
        <span>{t(lang, 'error_fix_first')}</span>
      </div>
    {:else if billsCount === 0}
      <p style="text-align:center;opacity:0.6;">...</p>
    {:else if transfers.length === 0}
      <p style="text-align:center;color:var(--success-color);">{t(lang, 'no_transfer')}</p>
    {:else}
      {#each transfers as tr}
        <div class="transfer-line">
          {t(lang, 'transfer', { from: tr.from, to: tr.to, amount: tr.amount })}
        </div>
      {/each}
    {/if}
  </div>
</section>
