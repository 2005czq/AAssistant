<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { flip } from 'svelte/animate';
  import { backOut } from 'svelte/easing';
  import Check from 'lucide-svelte/icons/check';
  import DecimalInput from './DecimalInput.svelte';
  import type { BillDraft, BillError } from '../lib/types';
  import { autoHeight, createProgress, motionEnabled, MOTION } from '../lib/motion';
  import { errorCircle, checkInk } from '../lib/ink';
  import { calculateBillShares, formatCents, toCents } from '../lib/calculations';
  import { MAX_BILL_VALUE } from '../lib/constants';

  export let bill: BillDraft;
  export let members: string[];
  export let error: BillError | null;
  export let onToggleMember: (member: string, event: Event) => void;
  export let onUpdateShare: (member: string, value: number) => void;

  const group = (type: BillDraft['type']) => type === 'Join' || type === 'Remove' ? 'check'
    : type === 'Ratio' || type === 'Distribution' ? 'shares' : 'none';
  let shownBill = bill;
  let shownGroup = group(bill.type);
  let opacity = shownGroup === 'none' ? 0 : 1;
  let changing = false;
  let progress: ReturnType<typeof createProgress>;
  let run = 0;
  let mounted = false;

  onMount(() => {
    progress = createProgress((value) => { opacity = value; }, MOTION.reveal, opacity);
    mounted = true;
    return () => { run += 1; progress.destroy(); };
  });
  $: if (mounted) void present(bill);
  $: shares = shownBill.type === 'Ratio' && bill.id !== 0
    ? calculateBillShares({ ...shownBill, type: 'Ratio', amount: shownBill.amount || 0 }, members) : [];

  async function present(next: BillDraft) {
    const ownRun = ++run;
    if (shownGroup !== group(next.type)) {
      changing = true;
      if (!await progress.set(0) || ownRun !== run) return;
      shownGroup = group(next.type);
    }
    shownBill = next;
    changing = false;
    await tick();
    if (ownRun === run) void progress.set(shownGroup === 'none' ? 0 : 1);
  }

  function shareMax(member: string): number {
    if (shownBill.type !== 'Distribution') return MAX_BILL_VALUE;
    const others = members.reduce((total, name) => total + (name === member ? 0 : toCents(shownBill.distribution[name])), 0);
    return Number.isFinite(others) ? Math.max(0, (toCents(MAX_BILL_VALUE) - others) / 100) : 0;
  }
</script>

<div class="bill-details-region" use:autoHeight>
  <div class="bill-details-row" hidden={shownGroup === 'none'} style:opacity inert={changing}>
    {#if shownGroup === 'check'}
      <div class="checkbox-grid" use:errorCircle={error === 'involved'}>
        {#each members as member (member)}
          <label class="custom-checkbox" animate:flip={{ duration: $motionEnabled ? MOTION.reorder : 0, easing: backOut }}>
            <input type="checkbox" checked={shownBill.involved.includes(member)} on:change={(event) => onToggleMember(member, event)} />
            <span class="checkmark" use:checkInk={shownBill.involved.includes(member)}><Check size={18} aria-hidden="true" /></span>
            <span>{member}</span>
          </label>
        {/each}
      </div>
    {:else if shownGroup === 'shares'}
      <div class="details-grid" use:errorCircle={error === 'distribution' || error === 'ratios'}>
        {#each members as member, index (member)}
          <label class="details-item" for={`bill-${bill.id}-share-${index}`}
            animate:flip={{ duration: $motionEnabled ? MOTION.reorder : 0, easing: backOut }}>
            <span class="details-item-label">{member}{shownBill.type === 'Ratio' && bill.id !== 0 ? ` (${formatCents(shares[index])})` : ''}</span>
            <DecimalInput id={`bill-${bill.id}-share-${index}`} class="details-input" max={shareMax(member)}
              value={shownBill.type === 'Ratio' ? shownBill.ratios[member] : shownBill.distribution[member]}
              aria-invalid={error === 'distribution' || error === 'ratios'} on:input={(event) => onUpdateShare(member, event.detail)} />
          </label>
        {/each}
      </div>
    {/if}
  </div>
</div>
