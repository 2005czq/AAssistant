<script lang="ts">
  import { onMount } from 'svelte';
  import type { Bill, BillType, Lang } from '../lib/types';
  import { t } from '../lib/i18n';
  import { getTypeOptions } from '../lib/bill';
  import { formatNumberDisplay, isMobileDevice } from '../lib/utils';
  import { ICON_BARS, ICON_TRASH } from '../lib/constants';
  import CustomDropdown from './CustomDropdown.svelte';

  export let lang: Lang;
  export let members: string[] = [];
  export let bills: Bill[] = [];
  export let isEditMode = false;
  export let onSetBills: (nextBills: Bill[]) => void;

  let isMobile = false;
  let billListEl: HTMLDivElement | null = null;
  let newBillRowEl: HTMLDivElement | null = null;

  let draggedEl: HTMLDivElement | null = null;

  let newPayer = '';
  let newReason = '';
  let newType: BillType = 'AA';
  let newAmount = '';
  let newInvolved: string[] = [];
  let newDistribution: Record<string, number> = {};
  let newRatios: Record<string, number> = {};

  onMount(() => {
    isMobile = isMobileDevice();
  });

  function updateBill(index: number, updater: (bill: Bill) => Bill) {
    const current = bills[index];
    if (!current) return;
    const clone: Bill = {
      ...current,
      involved: [...(current.involved || [])],
      distribution: { ...(current.distribution || {}) },
      ratios: { ...(current.ratios || {}) }
    };
    const updated = updater(clone);
    const next = bills.slice();
    next[index] = updated;
    onSetBills(next);
  }

  function handleTypeChange(index: number, nextType: string) {
    updateBill(index, (bill) => {
      const oldType = bill.type;
      const type = (nextType || 'AA') as BillType;
      bill.type = type;

      if (bill.type === 'Distribution' && oldType !== 'Distribution') {
        bill.amount = 0;
        bill.distribution = {};
      }
      if (bill.type === 'AA') {
        bill.involved = [];
        bill.distribution = {};
        bill.ratios = {};
      }

      if (bill.type === 'Ratio' && Object.keys(bill.ratios || {}).length === 0) {
        const nextRatios: Record<string, number> = {};
        members.forEach((m) => {
          nextRatios[m] = 1;
        });
        bill.ratios = nextRatios;
      }

      return bill;
    });
  }

  function handleAmountInput(index: number, value: string) {
    updateBill(index, (bill) => {
      bill.amount = parseFloat(value) || 0;
      return bill;
    });
  }

  function handleReasonInput(index: number, event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    updateBill(index, (next) => ({ ...next, reason: input.value }));
  }

  function handleAmountInputEvent(index: number, event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    handleAmountInput(index, input.value);
  }

  function handleAmountBlurEvent(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    const val = parseFloat(input.value) || 0;
    input.value = String(val);
  }

  function handleDistributionInput(index: number, member: string, value: string) {
    updateBill(index, (bill) => {
      const nextVal = parseFloat(value) || 0;
      bill.distribution[member] = nextVal;
      const sum = Object.values(bill.distribution).reduce((a, b) => a + b, 0);
      bill.amount = sum;
      return bill;
    });
  }

  function handleDistributionInputEvent(index: number, member: string, event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    handleDistributionInput(index, member, input.value);
  }

  function handleDistributionBlurEvent(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    const val = parseFloat(input.value) || 0;
    input.value = String(val);
  }

  function handleRatioInput(index: number, member: string, value: string) {
    updateBill(index, (bill) => {
      const nextVal = parseFloat(value) || 0;
      bill.ratios[member] = nextVal;
      return bill;
    });
  }

  function handleRatioInputEvent(index: number, member: string, event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    handleRatioInput(index, member, input.value);
  }

  function handleRatioBlurEvent(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    const val = parseFloat(input.value) || 0;
    input.value = String(val);
  }

  function handleToggleInvolved(index: number, member: string, checked: boolean) {
    updateBill(index, (bill) => {
      if (checked) {
        if (!bill.involved.includes(member)) bill.involved.push(member);
      } else {
        bill.involved = bill.involved.filter((m) => m !== member);
      }
      return bill;
    });
  }

  function handleInvolvedChange(index: number, member: string, event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    handleToggleInvolved(index, member, input.checked);
  }

  function handleDelete(index: number) {
    const next = bills.filter((_, idx) => idx !== index);
    onSetBills(next);
  }

  function getDistributionSum(dist: Record<string, number>): number {
    return Object.values(dist).reduce((a, b) => a + b, 0);
  }

  function handleNewTypeChange(value: string) {
    newType = (value || 'AA') as BillType;
    if (newType === 'Join' || newType === 'Remove') {
      newInvolved = [];
    }
    if (newType === 'Distribution') {
      newDistribution = {};
      members.forEach((m) => {
        newDistribution[m] = 0;
      });
      newAmount = String(getDistributionSum(newDistribution));
    }
    if (newType === 'Ratio') {
      newRatios = {};
      members.forEach((m) => {
        newRatios[m] = 1;
      });
    }
  }

  function syncNewDetails() {
    if (newType === 'Distribution') {
      const next: Record<string, number> = {};
      let changed = false;
      members.forEach((m) => {
        if (Object.prototype.hasOwnProperty.call(newDistribution, m)) {
          next[m] = newDistribution[m];
        } else {
          next[m] = 0;
          changed = true;
        }
      });
      if (Object.keys(newDistribution).some((m) => !members.includes(m))) {
        changed = true;
      }
      if (changed) {
        newDistribution = next;
      }
      newAmount = String(getDistributionSum(newDistribution));
    }

    if (newType === 'Ratio') {
      const next: Record<string, number> = {};
      let changed = false;
      members.forEach((m) => {
        if (Object.prototype.hasOwnProperty.call(newRatios, m)) {
          next[m] = newRatios[m];
        } else {
          next[m] = 1;
          changed = true;
        }
      });
      if (Object.keys(newRatios).some((m) => !members.includes(m))) {
        changed = true;
      }
      if (changed) {
        newRatios = next;
      }
    }

    if (newType === 'Join' || newType === 'Remove') {
      newInvolved = newInvolved.filter((m) => members.includes(m));
    }
  }

  $: syncNewDetails();

  function handleAddBill() {
    if (!newPayer) return;

    let amount = parseFloat(newAmount) || 0;
    let involved: string[] = [];
    let distribution: Record<string, number> = {};
    let ratios: Record<string, number> = {};

    if (newType === 'Join' || newType === 'Remove') {
      involved = [...newInvolved];
    } else if (newType === 'Distribution') {
      distribution = { ...newDistribution };
      amount = getDistributionSum(distribution);
    } else if (newType === 'Ratio') {
      ratios = { ...newRatios };
    }

    const nextBill: Bill = {
      id: Date.now(),
      payer: newPayer,
      reason: newReason.trim() || '-',
      type: newType,
      amount,
      involved,
      distribution,
      ratios
    };

    onSetBills([...bills, nextBill]);

    newPayer = '';
    newReason = '';
    newType = 'AA';
    newAmount = '';
    newInvolved = [];
    newDistribution = {};
    newRatios = {};
  }

  function handleNewDistributionInput(member: string, value: string) {
    newDistribution = { ...newDistribution, [member]: parseFloat(value) || 0 };
    newAmount = String(getDistributionSum(newDistribution));
  }

  function handleNewDistributionInputEvent(member: string, event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    handleNewDistributionInput(member, input.value);
  }

  function handleNewRatioInput(member: string, value: string) {
    newRatios = { ...newRatios, [member]: parseFloat(value) || 0 };
  }

  function handleNewRatioInputEvent(member: string, event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    handleNewRatioInput(member, input.value);
  }

  function handleNewInvolvedToggle(member: string, checked: boolean) {
    if (checked) {
      if (!newInvolved.includes(member)) {
        newInvolved = [...newInvolved, member];
      }
    } else {
      newInvolved = newInvolved.filter((m) => m !== member);
    }
  }

  function handleNewInvolvedChange(member: string, event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    handleNewInvolvedToggle(member, input.checked);
  }

  function handleDragStart(event: DragEvent) {
    const handle = event.currentTarget as HTMLElement | null;
    const row = handle?.closest('.bill-row') as HTMLDivElement | null;
    if (!row) {
      event.preventDefault();
      return;
    }
    draggedEl = row;
    event.dataTransfer?.setData('text/plain', '');
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
    }
    setTimeout(() => row.classList.add('dragging'), 0);
  }

  function handleDragEnd() {
    if (draggedEl) {
      draggedEl.classList.remove('dragging');
    }

    if (!billListEl) {
      draggedEl = null;
      return;
    }

    const newOrder: Bill[] = [];
    Array.from(billListEl.children).forEach((child) => {
      const element = child as HTMLElement;
      if (element.id === 'new-bill-row') return;
      const id = Number(element.dataset.id);
      const bill = bills.find((b) => b.id === id);
      if (bill) newOrder.push(bill);
    });

    if (newOrder.length === bills.length) {
      onSetBills(newOrder);
    }

    draggedEl = null;
  }

  function handleDragOver(event: DragEvent) {
    if (!draggedEl || !billListEl) return;
    event.preventDefault();
    const afterElement = getDragAfterElement(billListEl, event.clientY);
    if (afterElement == null) {
      if (newBillRowEl) {
        billListEl.insertBefore(draggedEl, newBillRowEl);
      } else {
        billListEl.appendChild(draggedEl);
      }
    } else {
      billListEl.insertBefore(draggedEl, afterElement);
    }
  }

  function getDragAfterElement(container: HTMLElement, y: number): HTMLElement | null {
    const draggableElements = Array.from(
      container.querySelectorAll('.bill-row:not(.dragging):not(#new-bill-row)')
    ) as HTMLElement[];

    const result = draggableElements.reduce(
      (closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        if (offset < 0 && offset > closest.offset) {
          return { offset, element: child };
        }
        return closest;
      },
      { offset: Number.NEGATIVE_INFINITY, element: null as HTMLElement | null }
    );

    return result.element;
  }

</script>

<section id="section-bills" class="notebook-section">
  <div class="section-header">
    <h2>{t(lang, 'bills_title')}</h2>
  </div>

  <div class="bill-list-headers bill-list-header">
    <span>{t(lang, 'payer')}</span>
    <span>{t(lang, 'reason')}</span>
    <span>{t(lang, 'type')}</span>
    <span>{t(lang, 'amount')}</span>
    <span></span>
  </div>

  <div id="bill-list" bind:this={billListEl} on:dragover={handleDragOver} role="list">
    {#each bills as bill, index (bill.id)}
      <div
        class="bill-row"
        data-id={bill.id}
        role="listitem"
      >
        <div class="cell" data-label={t(lang, 'payer')} class:error-circle={!bill.payer || !members.includes(bill.payer)}>
          <CustomDropdown
            options={members}
            value={bill.payer}
            on:change={(event) => updateBill(index, (next) => ({ ...next, payer: event.detail }))}
          />
        </div>

        <div class="cell" data-label={t(lang, 'reason')}>
          <input
            type="text"
            value={bill.reason}
            on:input={(event) => handleReasonInput(index, event)}
          />
        </div>

        <div class="cell" data-label={t(lang, 'type')}>
          <CustomDropdown
            options={getTypeOptions(lang)}
            value={bill.type}
            skipEmpty={true}
            on:change={(event) => handleTypeChange(index, event.detail)}
          />
        </div>

        <div
          class="cell"
          data-label={t(lang, 'amount')}
          class:error-circle={bill.type !== 'Distribution' && (!bill.amount || bill.amount <= 0)}
        >
          <input
            type="number"
            step="0.01"
            value={bill.amount}
            disabled={bill.type === 'Distribution'}
            on:blur={handleAmountBlurEvent}
            on:input={(event) => handleAmountInputEvent(index, event)}
          />
        </div>

        <div class="cell actions-cell">
          {#if isEditMode}
            <button class="btn-delete" on:click={() => handleDelete(index)}>{@html ICON_TRASH}</button>
          {:else if isMobile}
            <!-- Empty cell on mobile -->
          {:else}
            <button
              type="button"
              class="drag-handle"
              draggable="true"
              aria-label="Drag to reorder"
              on:dragstart={handleDragStart}
              on:dragend={handleDragEnd}
            >
              {@html ICON_BARS}
            </button>
          {/if}
        </div>

        {#if bill.type === 'Join' || bill.type === 'Remove' || bill.type === 'Distribution' || bill.type === 'Ratio'}
          <div class="bill-details-row">
            {#if bill.type === 'Join' || bill.type === 'Remove'}
              <div
                class="checkbox-grid"
                class:error-circle={members.length > 0 && (!bill.involved || bill.involved.length === 0)}
              >
                {#each members as member}
                  <label class="custom-checkbox">
                    <input
                      type="checkbox"
                      checked={bill.involved.includes(member)}
                      on:change={(event) => handleInvolvedChange(index, member, event)}
                    />
                    <span class="checkmark"></span>
                    <span class="label-text">{member}</span>
                  </label>
                {/each}
              </div>
            {:else if bill.type === 'Distribution'}
              <div class="details-grid" class:error-circle={Object.values(bill.distribution).every((v) => v === 0 || v === undefined)}>
                {#each members as member}
                  <div class="details-item" class:error-circle={(bill.distribution[member] || 0) < 0}>
                    <span class="details-item-label">{member}</span>
                    <input
                      class="details-input"
                      type="number"
                      value={bill.distribution[member] ?? 0}
                      on:blur={handleDistributionBlurEvent}
                      on:input={(event) => handleDistributionInputEvent(index, member, event)}
                    />
                  </div>
                {/each}
              </div>
            {:else if bill.type === 'Ratio'}
              <div class="details-grid" class:error-circle={Object.values(bill.ratios || {}).reduce((a, b) => a + b, 0) === 0}>
                {#each members as member}
                  <div class="details-item">
                    <span class="details-item-label" data-member-prop={member}
                      >{member} ({formatNumberDisplay((bill.ratios?.[member] || 0) > 0 ? ((bill.ratios?.[member] || 0) / Object.values(bill.ratios || {}).reduce((a, b) => a + b, 0)) * bill.amount : 0)})</span
                    >
                    <input
                      class="details-input"
                      type="number"
                      min="0"
                      value={bill.ratios?.[member] ?? 0}
                      on:blur={handleRatioBlurEvent}
                      on:input={(event) => handleRatioInputEvent(index, member, event)}
                    />
                  </div>
                {/each}
              </div>
            {/if}
          </div>
        {/if}
      </div>
    {/each}

    <div class="bill-row new-bill-row" id="new-bill-row" bind:this={newBillRowEl}>
      <div class="cell" data-label={t(lang, 'payer')}>
        <CustomDropdown
          options={members}
          value={newPayer}
          on:change={(event) => (newPayer = event.detail)}
        />
      </div>
      <div class="cell" data-label={t(lang, 'reason')}>
        <input
          type="text"
          placeholder={lang === 'zh' ? '事由' : 'Reason'}
          bind:value={newReason}
        />
      </div>
      <div class="cell" data-label={t(lang, 'type')}>
        <CustomDropdown
          options={getTypeOptions(lang)}
          value={newType}
          skipEmpty={true}
          on:change={(event) => handleNewTypeChange(event.detail)}
        />
      </div>
      <div class="cell" data-label={t(lang, 'amount')}>
        <input
          type="number"
          step="0.01"
          min="0"
          bind:value={newAmount}
          disabled={newType === 'Distribution'}
        />
      </div>
      <div class="cell">
        <button id="add-bill-btn" on:click={handleAddBill}>{t(lang, 'add')}</button>
      </div>

      <div class="bill-details-row" class:hidden={newType === 'AA'} id="new-bill-details">
        <div class="checkbox-grid" class:hidden={newType !== 'Join' && newType !== 'Remove'} id="new-bill-members">
          {#if newType === 'Join' || newType === 'Remove'}
            {#each members as member}
              <label class="custom-checkbox">
                <input
                  type="checkbox"
                  checked={newInvolved.includes(member)}
                  on:change={(event) => handleNewInvolvedChange(member, event)}
                />
                <span class="checkmark"></span>
                <span class="label-text">{member}</span>
              </label>
            {/each}
          {/if}
        </div>
        <div class="details-grid" class:hidden={newType !== 'Distribution' && newType !== 'Ratio'} id="new-bill-dist">
          {#if newType === 'Distribution'}
            {#each members as member}
              <div class="details-item">
                <span class="details-item-label">{member}</span>
                <input
                  type="number"
                  class="details-input"
                  value={newDistribution[member] ?? 0}
                  on:input={(event) => handleNewDistributionInputEvent(member, event)}
                />
              </div>
            {/each}
          {:else if newType === 'Ratio'}
            {#each members as member}
              <div class="details-item">
                <span class="details-item-label">{member}</span>
                <input
                  type="number"
                  class="details-input"
                  value={newRatios[member] ?? 1}
                  on:input={(event) => handleNewRatioInputEvent(member, event)}
                />
              </div>
            {/each}
          {/if}
        </div>
      </div>
    </div>
  </div>
</section>
