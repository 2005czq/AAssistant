<script lang="ts">
  import DecimalInput from './DecimalInput.svelte';
  import Button from './Button.svelte';
  import { afterUpdate, beforeUpdate, onDestroy, tick } from 'svelte';
  import { animate, cancelAnimations, capture, fadeOut, MOTION, presence, reflow, reorderEasing } from '../lib/motion';
  import { errorCircle } from '../lib/ink';
  import BillExtras from './BillExtras.svelte';
  import Menu from 'lucide-svelte/icons/menu';
  import Plus from 'lucide-svelte/icons/plus';
  import X from 'lucide-svelte/icons/x';
  import ReceiptText from 'lucide-svelte/icons/receipt-text';
  import CustomDropdown from './CustomDropdown.svelte';
  import type { Bill, BillDraft, BillError, BillType, Lang, MemberChange } from '../lib/types';
  import { t } from '../lib/i18n';
  import { applyBillChanges, createBillDraft, getTypeOptions } from '../lib/bill';
  import { distributionTotal, getBillErrors } from '../lib/calculations';
  import { aassistant, editFromUI, holdUserEdit, onMemberChange, runUserEdit, showEditError } from '../lib/api';
  import { editLock } from '../lib/edit';
  import { limitTextLength } from '../lib/utils';
  import { MAX_BILL_REASON_LENGTH, MIN_MEMBERS } from '../lib/constants';

  export let lang: Lang;
  export let members: string[] = [];
  export let bills: Bill[] = [];
  export let isEditMode = false;
  export let visible = true;

  let draft = createBillDraft(members);
  let draftError: BillError | null = null;
  let billList: HTMLDivElement;
  type BillDrag = {
    id: number; pointerId: number;
    startY: number; y: number; phase: 'pending' | 'dragging';
    hold: ReturnType<typeof holdUserEdit>; finishing: boolean;
  };
  let drag: BillDrag | null = null;
  let scrollFrame = 0;
  let preserveDragLayout = false;
  let rows: Bill[] = [];
  let draftForm: HTMLFormElement;
  let draftRegion: HTMLDivElement;
  let before = new Map<HTMLElement, DOMRect>();
  let beforeDraft: DOMRect | undefined;
  let initialized = false;
  let destroyed = false;
  let addedDraft = false;
  const removalJobs = new Map<number, symbol>();
  const reorderMotion = { duration: MOTION.reorder, easing: reorderEasing };

  $: syncRows(bills);
  $: if (drag && (!visible || isEditMode)) cancelDrag();
  beforeUpdate(() => {
    before = capture(billList);
    beforeDraft = draftForm?.getClientRects().length ? draftForm.getBoundingClientRect() : undefined;
  });
  afterUpdate(() => {
    // Saving the preview must not restart the animations already in progress.
    if (preserveDragLayout) { preserveDragLayout = false; return; }
    if (!billList?.getClientRects().length) return;
    for (const node of Array.from(billList.children) as HTMLElement[]) {
      const id = Number(node.dataset.id);
      const removed = !bills.some((bill) => bill.id === id);
      if (removed && !removalJobs.has(id)) {
        const token = Symbol();
        removalJobs.set(id, token);
        void fadeOut(node).then(() => {
          if (destroyed || removalJobs.get(id) !== token || bills.some((bill) => bill.id === id)) return;
          removalJobs.delete(id);
          rows = rows.filter((bill) => bill.id !== id);
        });
      } else if (!removed && removalJobs.has(id)) {
        removalJobs.delete(id);
        cancelAnimations(node);
        node.inert = false;
        node.style.opacity = '';
      }
    }
    if (drag?.phase === 'dragging') {
      const gap = billList.querySelector<HTMLElement>(`[data-id="${drag.id}"]`);
      if (gap) before.delete(gap);
    }
    reflow(billList, before, initialized && !!beforeDraft && !drag, reorderMotion);
    if (beforeDraft && initialized) {
      const y = beforeDraft.top - draftForm.getBoundingClientRect().top;
      if (Math.abs(y) > .3) void animate(draftRegion, 'position', [{ transform: `translateY(${y}px)` }, { transform: 'translateY(0)' }], reorderMotion);
    }
    if (addedDraft) {
      addedDraft = false;
      void animate(draftRegion, 'presence', [{ opacity: 0 }, { opacity: 1 }], { duration: MOTION.reveal, delay: 80, fill: 'backwards' });
    }
    initialized = true;
  });
  onDestroy(() => {
    destroyed = true;
    cancelDrag();
    if (billList) for (const node of Array.from(billList.children) as HTMLElement[]) cancelAnimations(node);
    if (draftRegion) cancelAnimations(draftRegion);
  });

  function syncRows(next: Bill[]) {
    const live = [...next];
    for (const old of rows) if (!next.some((bill) => bill.id === old.id)) live.splice(Math.min(rows.indexOf(old), live.length), 0, old);
    rows = live;
  }

  function updateBill(bill: BillDraft, patch: Partial<Bill>) {
    const isDraft = bill === draft;
    runUserEdit(() => {
      const ledger = aassistant.getLedger();
      if (isDraft) draft = applyBillChanges(draft, patch, ledger.members);
      else if (ledger.bills.some((item) => item.id === bill.id)) {
        editFromUI(aassistant.updateBill, { id: bill.id, changes: patch });
      }
    });
  }

  function updateReason(bill: BillDraft, event: Event) {
    if ((event as InputEvent).isComposing) return;
    const input = event.currentTarget as HTMLInputElement;
    const reason = limitTextLength(input.value, MAX_BILL_REASON_LENGTH);
    if (reason !== input.value) {
      const start = input.selectionStart ?? reason.length;
      const end = input.selectionEnd ?? start;
      input.value = reason;
      input.setSelectionRange(Math.min(start, reason.length), Math.min(end, reason.length));
    }
    if (reason !== bill.reason) updateBill(bill, { reason });
  }

  function changeType(bill: BillDraft, value: string) {
    updateBill(bill, { type: value as BillType });
  }

  function updateShare(bill: BillDraft, member: string, value: number) {
    const ledger = aassistant.getLedger();
    const current = bill === draft ? draft : ledger.bills.find((item) => item.id === bill.id);
    if (!current || current.type !== bill.type || !ledger.members.includes(member)) return;
    const field = bill.type === 'Ratio' ? 'ratios' : 'distribution';
    updateBill(bill, { [field]: { ...current[field], [member]: value } });
  }

  function toggleMember(bill: BillDraft, member: string, event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    const checked = input.checked;
    input.checked = !checked;
    runUserEdit(() => {
      const ledger = aassistant.getLedger();
      const current = bill === draft ? draft : ledger.bills.find((item) => item.id === bill.id);
      if (!current || current.type !== bill.type || !ledger.members.includes(member)) return;
      updateBill(bill, { involved: checked ? [...new Set([...current.involved, member])] : current.involved.filter((name) => name !== member) });
    });
  }

  // The member list is an explicit dependency; draft edits do not reset other fields.
  $: syncDraftMembers(members);
  onDestroy(onMemberChange((change, names) => syncDraftMembers(names, change)));
  $: firstInvalidBill = bills.find((bill) => getBillErrors(bill, members).length > 0);
  $: draftErrors = getBillErrors(draft, members);
  // A submit marks one field. Correcting it clears the mark until the next submit.
  $: if (draftError && !draftErrors.includes(draftError)) {
    draftError = null;
  }

  function syncDraftMembers(nextMembers: string[], change?: MemberChange) {
    if (change?.type === 'reset') {
      draft = createBillDraft(nextMembers);
      draftError = null;
      return;
    }
    const renamed = change?.type === 'rename' ? change : null;
    const oldName = (name: string) => renamed && name === renamed.newName ? renamed.name : name;
    const newName = (name: string) => renamed && name === renamed.name ? renamed.newName : name;
    const payer = newName(draft.payer);
    const distribution = Object.fromEntries(nextMembers.map((name) => {
      const value = draft.distribution[oldName(name)];
      return [name, typeof value === 'number' ? value : 0];
    }));
    draft = {
      ...draft,
      payer: nextMembers.includes(payer) ? payer : '',
      involved: draft.involved.map(newName).filter((name) => nextMembers.includes(name)),
      distribution,
      ratios: Object.fromEntries(nextMembers.map((name) => {
        const value = draft.ratios[oldName(name)];
        return [name, typeof value === 'number' ? value : 1];
      })),
      amount: draft.type === 'Distribution' ? distributionTotal(distribution) : draft.amount
    };
  }

  function addBill() {
    runUserEdit(() => {
      const ledger = aassistant.getLedger();
      if (ledger.members.length < MIN_MEMBERS) return;
      syncDraftMembers(ledger.members);
      draftError = getBillErrors(draft, ledger.members)[0] ?? null;
      if (draftError) return;
      // The shared validation above rules out empty type and amount values.
      const { id, ...bill } = draft as Bill;
      const result = editFromUI(aassistant.addBill, { bill: { ...bill, reason: bill.reason.trim() || '-' } });
      if (result.ok) {
        draft = createBillDraft(ledger.members);
        addedDraft = true;
        draftError = null;
      }
    });
  }

  function startDrag(event: PointerEvent, id: number) {
    if (event.button !== 0 || !event.isPrimary || drag || !visible || isEditMode || bills.length < 2) return;
    event.preventDefault();
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    const hold = holdUserEdit();
    const current = aassistant.getLedger();
    if (!current.bills.some((bill) => bill.id === id)) { hold.release(); return; }
    drag = { id, pointerId: event.pointerId, startY: event.clientY, y: event.clientY, phase: 'pending', hold, finishing: false };
    const pending = drag;
    void hold.ready.then((result) => {
      if (drag !== pending) return;
      if (!result.ok) { cancelDrag(); showEditError(result.error); }
      else if (!aassistant.getLedger().bills.some((bill) => bill.id === id)) cancelDrag();
    });
    billList.setPointerCapture(event.pointerId);
  }

  function updateDropTarget(current: BillDrag) {
    const y = current.y - billList.getBoundingClientRect().top;
    // Read layout positions so the spring animation cannot move the drop target.
    const nextRow = Array.from(billList.children).find((element) => {
      const row = element as HTMLElement;
      return bills.some((bill) => bill.id === Number(row.dataset.id)) && y < row.offsetTop + row.offsetHeight / 2;
    }) as HTMLElement | undefined;
    let index = nextRow ? rows.findIndex((bill) => bill.id === Number(nextRow.dataset.id)) : rows.length;
    const previousIndex = rows.findIndex((bill) => bill.id === current.id);
    if (previousIndex < 0) return;
    if (previousIndex < index) index -= 1;
    const next = rows.filter((bill) => bill.id !== current.id);
    next.splice(index, 0, rows[previousIndex]);
    if (next.some((bill, index) => bill.id !== rows[index].id)) rows = next;
  }

  function scrollWhileDragging() {
    const current = drag;
    if (current?.phase !== 'dragging' || current.finishing) return;
    const speed = current.y < 48 ? -Math.min(16, (48 - current.y) / 3)
      : current.y > window.innerHeight - 48 ? Math.min(16, (current.y - window.innerHeight + 48) / 3) : 0;
    if (speed) {
      window.scrollBy(0, speed);
      updateDropTarget(current);
    }
    scrollFrame = requestAnimationFrame(scrollWhileDragging);
  }

  function moveDrag(event: PointerEvent) {
    const current = drag;
    if (!current || event.pointerId !== current.pointerId || current.finishing) return;
    current.y = event.clientY;
    if (current.phase === 'pending') {
      if (Math.abs(current.y - current.startY) < 6) return;
      document.body.classList.add('bill-dragging');
      current.phase = 'dragging';
      drag = current;
      scrollFrame = requestAnimationFrame(scrollWhileDragging);
    }
    updateDropTarget(current);
  }

  function cancelDrag() {
    const current = drag;
    if (!current) return;
    drag = null;
    cancelAnimationFrame(scrollFrame);
    document.body.classList.remove('bill-dragging');
    if (billList?.hasPointerCapture(current.pointerId)) billList.releasePointerCapture(current.pointerId);
    current.hold.release();
    if (!destroyed) syncRows(bills);
  }

  async function finishDrag() {
    const current = drag;
    if (!current || current.finishing) return;
    current.finishing = true;
    cancelAnimationFrame(scrollFrame);
    const ready = await current.hold.ready;
    if (destroyed || drag !== current) return;
    if (!ready.ok) { cancelDrag(); showEditError(ready.error); return; }
    const index = rows.findIndex((bill) => bill.id === current.id);
    const beforeId = rows.slice(index + 1).find((bill) => bills.some((item) => item.id === bill.id))?.id ?? null;
    drag = null;
    document.body.classList.remove('bill-dragging');
    if (billList?.hasPointerCapture(current.pointerId)) billList.releasePointerCapture(current.pointerId);
    if (current.phase === 'dragging') {
      const result = editFromUI(aassistant.moveBill, { id: current.id, beforeId });
      current.hold.release();
      if (result.ok) { preserveDragLayout = true; return; }
    } else current.hold.release();
    syncRows(bills);
  }

  function releaseDrag(event: PointerEvent) {
    if (drag?.pointerId === event.pointerId) void finishDrag();
  }

  function moveBill(event: KeyboardEvent, id: number) {
    if (event.isComposing || !['ArrowUp', 'ArrowDown'].includes(event.key)) return;
    event.preventDefault();
    cancelDrag();
    const handle = event.currentTarget as HTMLButtonElement;
    runUserEdit(() => {
      const ledger = aassistant.getLedger();
      const index = ledger.bills.findIndex((bill) => bill.id === id);
      const target = index + (event.key === 'ArrowUp' ? -1 : 1);
      if (index < 0 || target < 0 || target >= ledger.bills.length) return;
      const beforeId = event.key === 'ArrowUp' ? ledger.bills[target].id : ledger.bills[index + 2]?.id ?? null;
      editFromUI(aassistant.moveBill, { id, beforeId });
      tick().then(() => handle.focus({ preventScroll: true }));
    });
  }
</script>

<svelte:window on:pointermove={moveDrag} on:pointerup={releaseDrag}
  on:pointercancel={(event) => { if (drag?.pointerId === event.pointerId) cancelDrag(); }} on:blur={cancelDrag}
  on:keydown={(event) => { if (event.key === 'Escape' && drag) { event.preventDefault(); cancelDrag(); } }} />

<section id="section-bills" class="notebook-section" use:presence={visible}>
  <div class="section-header">
    <h2><ReceiptText size={20} aria-hidden="true" /><span>{t(lang, 'bills_title')} <span class="section-count">({bills.length})</span></span></h2>
  </div>

  <div class="bill-list-header" aria-hidden="true">
    <span>{t(lang, 'payer')}</span><span>{t(lang, 'reason')}</span>
    <span>{t(lang, 'type')}</span><span>{t(lang, 'amount')}</span><span></span>
  </div>

  <div id="bill-list" role="list" bind:this={billList}
    on:lostpointercapture={(event) => { if (drag?.pointerId === event.pointerId && !drag.finishing) cancelDrag(); }}>
    {#each rows as bill (bill.id)}
      {@const error = firstInvalidBill?.id === bill.id ? getBillErrors(bill, members)[0] : null}
      <div class="bill-row" class:dragging={drag?.phase === 'dragging' && drag.id === bill.id} data-id={bill.id} role="listitem">
        <div class="cell" data-label={t(lang, 'payer')}>
          <div class="bill-control" use:errorCircle={error === 'payer'}>
            <CustomDropdown options={members} value={bill.payer} label={t(lang, 'payer')} placeholder={t(lang, 'select_payer')}
              on:change={(event) => updateBill(bill, { payer: event.detail })} />
          </div>
        </div>
        <div class="cell" data-label={t(lang, 'reason')}>
          <input type="text" value={bill.reason} aria-label={t(lang, 'reason')} use:editLock
            on:input={(event) => updateReason(bill, event)} on:compositionend={(event) => updateReason(bill, event)} />
        </div>
        <div class="cell" data-label={t(lang, 'type')}>
          <div class="bill-control" use:errorCircle={error === 'type'}>
            <CustomDropdown options={getTypeOptions(lang)} value={bill.type} label={t(lang, 'type')} placeholder={t(lang, 'select_type')}
              on:change={(event) => changeType(bill, event.detail)} />
          </div>
        </div>
        <div class="cell" data-label={t(lang, 'amount')}>
          <div class="bill-control" use:errorCircle={error === 'amount'}>
            <DecimalInput value={bill.amount} aria-invalid={error === 'amount'}
              aria-label={t(lang, 'amount')} disabled={bill.type === 'Distribution'}
              on:input={(event) => updateBill(bill, { amount: event.detail })} />
          </div>
        </div>
        <div class="cell actions-cell">
          {#if isEditMode}
            <Button type="button" class="btn-delete" aria-label={t(lang, 'delete_bill')}
              on:click={() => editFromUI(aassistant.removeBill, { id: bill.id })}>
              <X size={16} aria-hidden="true" />
            </Button>
          {:else}
            <button type="button" class="drag-handle" aria-label={t(lang, 'reorder_bill')} disabled={bills.length < 2}
              on:pointerdown={(event) => startDrag(event, bill.id)}
              on:keydown={(event) => moveBill(event, bill.id)}>
              <Menu aria-hidden="true" />
            </button>
          {/if}
        </div>

        <BillExtras {bill} {members} {error}
          onToggleMember={(member, event) => toggleMember(bill, member, event)}
          onUpdateShare={(member, value) => updateShare(bill, member, value)} />
      </div>
    {/each}
  </div>

  <div bind:this={draftRegion}>
  <form bind:this={draftForm} class="bill-row new-bill-row"
    id="new-bill-row" data-id="0" novalidate on:submit|preventDefault={addBill}>
    <div class="cell" data-label={t(lang, 'payer')}>
      <div class="bill-control" use:errorCircle={draftError === 'payer'}>
        <CustomDropdown options={members} value={draft.payer} label={t(lang, 'payer')} placeholder={t(lang, 'select_payer')}
          on:change={(event) => updateBill(draft, { payer: event.detail })} />
      </div>
    </div>
    <div class="cell" data-label={t(lang, 'reason')}>
      <input type="text" placeholder={t(lang, 'placeholder_reason')} aria-label={t(lang, 'reason')} value={draft.reason} use:editLock
        on:input={(event) => updateReason(draft, event)} on:compositionend={(event) => updateReason(draft, event)} />
    </div>
    <div class="cell" data-label={t(lang, 'type')}>
      <div class="bill-control" use:errorCircle={draftError === 'type'}>
        <CustomDropdown options={getTypeOptions(lang)} value={draft.type}
          label={t(lang, 'type')} placeholder={t(lang, 'select_type')}
          on:change={(event) => changeType(draft, event.detail)} />
      </div>
    </div>
    <div class="cell" data-label={t(lang, 'amount')}>
      <div class="bill-control" use:errorCircle={draftError === 'amount'}>
        <DecimalInput value={draft.amount} aria-invalid={draftError === 'amount'}
          aria-label={t(lang, 'amount')} placeholder={t(lang, 'placeholder_amount')} disabled={draft.type === 'Distribution'}
          on:input={(event) => updateBill(draft, { amount: event.detail })} />
      </div>
    </div>
    <div class="cell add-bill-cell">
      <Button type="submit" id="add-bill-btn" class="btn-icon" aria-label={t(lang, 'add_bill')}><Plus size={20} aria-hidden="true" /></Button>
    </div>

    <BillExtras bill={draft} {members} error={draftError}
      onToggleMember={(member, event) => toggleMember(draft, member, event)}
      onUpdateShare={(member, value) => updateShare(draft, member, value)} />
  </form>
  </div>
</section>
