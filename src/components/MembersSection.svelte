<script lang="ts">
  import { afterUpdate, beforeUpdate, onDestroy, onMount, tick } from 'svelte';
  import Button from './Button.svelte';
  import { t } from '../lib/i18n';
  import X from 'lucide-svelte/icons/x';
  import Menu from 'lucide-svelte/icons/menu';
  import UsersRound from 'lucide-svelte/icons/users-round';
  import type { Lang } from '../lib/types';
  import { MAX_MEMBER_NAME_LENGTH, MAX_MEMBERS, MIN_MEMBERS } from '../lib/constants';
  import { aassistant, editFromUI, holdUserEdit, onMemberChange, runUserEdit, showEditError } from '../lib/api';
  import { editLock } from '../lib/edit';
  import { animate, autoHeight, cancelAnimations, capture, fadeOut, MOTION, reflow, reorderEasing } from '../lib/motion';
  import { errorCircle } from '../lib/ink';
  import { limitTextLength } from '../lib/utils';

  export let lang: Lang;
  export let members: string[] = [];
  export let isEditMode = false;

  type MemberItem = { key: number; name: string; draft: boolean; removing: boolean };
  let nextKey = 0;
  const emptyMember = (): MemberItem => ({ key: ++nextKey, name: '', draft: true, removing: false });
  let items: MemberItem[] = [emptyMember()];
  let promotion: { key: number; name: string } | null = null;
  let newMember = '';
  let editingKey: number | null = null;
  let editingName = '';
  let list: HTMLDivElement;
  let before = new Map<HTMLElement, DOMRect>();
  let initialized = false;
  let destroyed = false;
  const removing = new Map<number, symbol>();
  const committed = new Set<number>();
  type MemberDrag = {
    key: number; name: string; pointerId: number;
    phase: 'pending' | 'dragging';
    startX: number; startY: number; x: number; y: number;
    hold: ReturnType<typeof holdUserEdit>; finishing: boolean;
  };
  let drag: MemberDrag | null = null;
  let scrollFrame = 0;
  let preserveDragLayout = false;
  const reorderMotion = { duration: MOTION.reorder, easing: reorderEasing };

  $: reconcile(members);
  $: if (drag && isEditMode) cancelDrag();

  onDestroy(onMemberChange((change, names) => {
    if (change.type === 'reset') {
      items = [emptyMember()];
      promotion = null;
      newMember = '';
      editingKey = null;
    } else if (change.type === 'rename') {
      const item = items.find((item) => !item.draft && !item.removing && item.name === change.name);
      if (item) {
        item.name = change.newName;
        if (editingKey === item.key && editingName === change.name) editingName = change.newName;
      }
    }
    reconcile(names);
  }));

  function reconcile(names: string[]) {
    const old = items.filter((item) => !item.draft);
    const live = names.map((name) => {
      let item = old.find((entry) => !entry.removing && entry.name === name);
      if (!item && promotion?.name === name) item = items.find((entry) => entry.key === promotion!.key);
      if (!item) item = { key: ++nextKey, name, draft: false, removing: false };
      item.name = name;
      item.draft = false;
      item.removing = false;
      return item;
    });
    const leaving = old.filter((item) => !live.includes(item));
    for (const item of leaving) {
      item.removing = true;
      live.splice(Math.min(items.indexOf(item), live.length), 0, item);
    }
    if (names.length < MAX_MEMBERS) live.push(items.find((item) => item.draft) ?? emptyMember());
    items = live;
    promotion = null;
  }

  beforeUpdate(() => { before = capture(list); });
  afterUpdate(() => {
    // Saving the preview must not restart the animations already in progress.
    if (preserveDragLayout) { preserveDragLayout = false; return; }
    updateLayout();
  });

  function updateLayout(animateChanges = true) {
    if (!list?.getClientRects().length) return;
    const move = animateChanges && initialized;
    // Read all natural widths before changing flex layout.
    const measurements = Array.from(list.children, (element) => {
      const slot = element as HTMLElement;
      const key = Number(slot.dataset.key);
      const item = items.find((entry) => entry.key === key)!;
      const chip = slot.querySelector<HTMLElement>('.member-chip')!;
      const mirror = slot.querySelector<HTMLElement>('.member-name-mirror')!;
      const style = getComputedStyle(chip);
      const oldWidth = chip.getBoundingClientRect().width;
      const nameWidth = Math.max(20, mirror.getBoundingClientRect().width);
      const width = nameWidth + parseFloat(style.paddingLeft) + parseFloat(style.paddingRight)
        + parseFloat(style.borderLeftWidth) + parseFloat(style.borderRightWidth) + (item.draft ? 0 : 26);
      return { slot, key, item, chip, oldWidth, width };
    });
    for (const { slot, key, item, chip, oldWidth, width } of measurements) {
      slot.style.width = `${width}px`;
      chip.style.width = `${width}px`;
      if (move && slot.dataset.width && Math.abs(Number(slot.dataset.width) - width) > .3) {
        void animate(chip, 'width', [{ width: `${oldWidth}px` }, { width: `${width}px` }], reorderMotion);
      } else if (!move) {
        cancelAnimations(chip);
      }
      slot.dataset.width = String(width);
      if (!item.draft && !committed.has(key)) {
        committed.add(key);
        const button = slot.querySelector<HTMLElement>('.member-action')!;
        if (move && before.has(slot)) void animate(button, 'presence', [{ opacity: 0 }, { opacity: getComputedStyle(button).opacity }], {
          duration: MOTION.fade, delay: 80, fill: 'backwards',
        });
      }
      if (item.removing && !removing.has(key)) {
        const token = Symbol();
        removing.set(key, token);
        void fadeOut(slot).then(() => {
          if (destroyed || removing.get(key) !== token || !items.find((entry) => entry.key === key)?.removing) return;
          removing.delete(key);
          committed.delete(key);
          items = items.filter((entry) => entry.key !== key);
        });
      }
    }
    if (drag && drag.phase !== 'pending') {
      const gap = list.querySelector<HTMLElement>(`[data-key="${drag.key}"]`);
      if (gap) before.delete(gap);
    }
    reflow(list, move ? before : new Map(), move && !drag, reorderMotion);
    initialized = true;
  }

  onMount(() => {
    let width = list.getBoundingClientRect().width;
    const observer = new ResizeObserver(([entry]) => {
      if (Math.abs(width - entry.contentRect.width) > .3) {
        cancelDrag();
        updateLayout(false);
      }
      width = entry.contentRect.width;
    });
    observer.observe(list);
    const onFontsLoaded = () => {
      if (destroyed) return;
      cancelDrag();
      updateLayout(false);
    };
    document.fonts.addEventListener('loadingdone', onFontsLoaded);
    void document.fonts.ready.then(onFontsLoaded);
    return () => {
      observer.disconnect();
      document.fonts.removeEventListener('loadingdone', onFontsLoaded);
    };
  });
  onDestroy(() => {
    destroyed = true;
    cancelDrag();
    if (list) for (const slot of Array.from(list.children) as HTMLElement[]) {
      cancelAnimations(slot);
      cancelAnimations(slot.querySelector<HTMLElement>('.member-chip')!);
    }
  });

  function startDrag(event: PointerEvent, item: MemberItem) {
    if (event.button !== 0 || !event.isPrimary || drag || isEditMode || item.draft || item.removing || members.length < 2) return;
    event.preventDefault();
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    const hold = holdUserEdit();
    const current = aassistant.getLedger();
    if (!current.members.includes(item.name)) { hold.release(); return; }
    drag = {
      key: item.key, name: item.name, pointerId: event.pointerId, phase: 'pending',
      startX: event.clientX, startY: event.clientY, x: event.clientX, y: event.clientY,
      hold, finishing: false
    };
    const pending = drag;
    void hold.ready.then((result) => {
      if (drag !== pending) return;
      if (!result.ok) { cancelDrag(); showEditError(result.error); }
      else if (!aassistant.getLedger().members.includes(pending.name)) cancelDrag();
    });
    // The list stays mounted while keyed member slots move around it.
    list.setPointerCapture(event.pointerId);
  }

  function updateDropTarget(current: MemberDrag) {
    const bounds = list.getBoundingClientRect();
    const x = current.x - bounds.left;
    const y = current.y - bounds.top;
    const rows: Array<{ top: number; bottom: number; slots: Array<{ key: number; left: number; width: number }> }> = [];
    for (const slot of Array.from(list.children) as HTMLElement[]) {
      const key = Number(slot.dataset.key);
      if (items.find((item) => item.key === key)?.removing) continue;
      // Natural layout coordinates ignore the elastic transforms still playing.
      let row = rows.find((row) => Math.abs(row.top - slot.offsetTop) < 2);
      if (!row) rows.push(row = { top: slot.offsetTop, bottom: slot.offsetTop + slot.offsetHeight, slots: [] });
      row.bottom = Math.max(row.bottom, slot.offsetTop + slot.offsetHeight);
      row.slots.push({ key, left: slot.offsetLeft, width: slot.offsetWidth });
    }
    if (!rows.length) return;
    const row = rows.reduce((nearest, row) => Math.abs(y - (row.top + row.bottom) / 2)
      < Math.abs(y - (nearest.top + nearest.bottom) / 2) ? row : nearest);
    const nextSlot = row.slots.find((slot) => x < slot.left + slot.width / 2);
    let index = nextSlot ? items.findIndex((item) => item.key === nextSlot.key)
      : items.findIndex((item) => item.key === row.slots[row.slots.length - 1].key) + 1;
    const previousIndex = items.findIndex((item) => item.key === current.key);
    if (previousIndex < 0) return;
    if (previousIndex < index) index -= 1;
    const next = items.filter((item) => item.key !== current.key);
    const draftIndex = next.findIndex((item) => item.draft);
    index = Math.max(0, Math.min(index, draftIndex < 0 ? next.length : draftIndex));
    next.splice(index, 0, items[previousIndex]);
    if (next.some((item, index) => item.key !== items[index].key)) items = next;
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
    if (!current || current.pointerId !== event.pointerId || current.finishing) return;
    current.x = event.clientX;
    current.y = event.clientY;
    if (current.phase === 'pending') {
      if (Math.hypot(current.x - current.startX, current.y - current.startY) < 6) return;
      document.body.classList.add('member-dragging');
      current.phase = 'dragging';
      drag = current;
      scrollFrame = requestAnimationFrame(scrollWhileDragging);
    }
    updateDropTarget(current);
  }

  function releaseCapture(current: MemberDrag) {
    if (list?.hasPointerCapture(current.pointerId)) list.releasePointerCapture(current.pointerId);
  }

  function cancelDrag() {
    const current = drag;
    if (!current) return;
    drag = null;
    cancelAnimationFrame(scrollFrame);
    document.body.classList.remove('member-dragging');
    releaseCapture(current);
    current.hold.release();
    if (!destroyed) reconcile(members);
  }

  async function finishDrag() {
    const current = drag;
    if (!current || current.finishing) return;
    current.finishing = true;
    cancelAnimationFrame(scrollFrame);
    const ready = await current.hold.ready;
    if (destroyed || drag !== current) return;
    if (!ready.ok) { cancelDrag(); showEditError(ready.error); return; }
    const index = items.findIndex((item) => item.key === current.key);
    const beforeName = items.slice(index + 1).find((item) => !item.draft && !item.removing)?.name ?? null;
    drag = null;
    document.body.classList.remove('member-dragging');
    releaseCapture(current);
    if (current.phase === 'dragging') {
      const result = editFromUI(aassistant.moveMember, { name: current.name, beforeName });
      current.hold.release();
      if (result.ok) { preserveDragLayout = true; return; }
    } else current.hold.release();
    reconcile(members);
  }

  function releaseDrag(event: PointerEvent) {
    if (drag?.pointerId === event.pointerId) void finishDrag();
  }

  function moveMember(event: KeyboardEvent, item: MemberItem) {
    if (event.isComposing || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
    event.preventDefault();
    cancelDrag();
    const handle = event.currentTarget as HTMLButtonElement;
    runUserEdit(() => {
      const ledger = aassistant.getLedger();
      const index = ledger.members.indexOf(item.name);
      const backwards = event.key === 'ArrowLeft' || event.key === 'ArrowUp';
      const target = index + (backwards ? -1 : 1);
      if (index < 0 || target < 0 || target >= ledger.members.length) return;
      const beforeName = backwards ? ledger.members[target] : ledger.members[index + 2] ?? null;
      editFromUI(aassistant.moveMember, { name: item.name, beforeName });
      void tick().then(() => handle.focus({ preventScroll: true }));
    });
  }

  function editName(event: Event, item: MemberItem) {
    const input = event.currentTarget as HTMLInputElement;
    if (!(event as InputEvent).isComposing) {
      const name = limitTextLength(input.value, MAX_MEMBER_NAME_LENGTH);
      if (name !== input.value) {
        const start = input.selectionStart ?? name.length;
        const end = input.selectionEnd ?? start;
        input.value = name;
        input.setSelectionRange(Math.min(start, name.length), Math.min(end, name.length));
      }
    }
    if (item.draft) newMember = input.value;
    else editingName = input.value;
  }

  function commit(event: Event, item: MemberItem) {
    if (item.removing) return;
    const input = event.currentTarget as HTMLInputElement;
    const name = limitTextLength(input.value.trim(), MAX_MEMBER_NAME_LENGTH);
    input.value = name;
    editingKey = null;
    runUserEdit(() => {
      const ledger = aassistant.getLedger();
      if (item.draft) {
        if (!name || ledger.members.includes(name) || ledger.members.length >= MAX_MEMBERS) {
          newMember = '';
          input.value = '';
          return;
        }
        promotion = { key: item.key, name };
        const result = editFromUI(aassistant.addMember, { name });
        if (result.ok) newMember = '';
        else promotion = null;
      } else if (!ledger.members.includes(item.name)) {
        return;
      } else if (!name) {
        editFromUI(aassistant.removeMember, { name: item.name });
      } else {
        const result = editFromUI(aassistant.renameMember, { name: item.name, newName: name });
        if (result.ok) item.name = name;
        input.value = result.ok ? name : item.name;
      }
    });
  }

  function handleKey(event: KeyboardEvent, item: MemberItem) {
    if (event.isComposing || !['Enter', 'Escape'].includes(event.key)) return;
    event.preventDefault();
    const wasDraft = item.draft;
    const input = event.currentTarget as HTMLInputElement;
    if (event.key === 'Escape') {
      input.value = item.draft ? '' : item.name;
      if (item.draft) newMember = '';
    }
    input.blur();
    if (event.key === 'Enter' && wasDraft) void tick().then(() => list.querySelector<HTMLInputElement>('#add-member-input')?.focus());
  }
</script>

<svelte:window on:pointermove={moveDrag} on:pointerup={releaseDrag}
  on:pointercancel={(event) => { if (drag?.pointerId === event.pointerId) cancelDrag(); }} on:blur={cancelDrag}
  on:keydown={(event) => { if (event.key === 'Escape' && drag) { event.preventDefault(); cancelDrag(); } }} />

<section id="section-members" class="notebook-section">
  <div class="section-header">
    <h2><UsersRound size={20} aria-hidden="true" /><span>{t(lang, 'members_title')} <span class="section-count">({members.length})</span></span></h2>
  </div>
  <div use:autoHeight>
  <div class="member-list-container" id="member-list-container" bind:this={list}
    on:lostpointercapture={(event) => { if (drag?.pointerId === event.pointerId && !drag.finishing) cancelDrag(); }}>
    {#each items as item (item.key)}
      <div class="member-slot" class:member-gap={drag?.key === item.key && drag.phase !== 'pending'}
        data-key={item.key}>
        <div class="member-chip" use:errorCircle={item.draft && members.length < MIN_MEMBERS && editingKey !== item.key}>
          <span class="member-name-control">
            <span class="member-name-mirror" aria-hidden="true">{item.draft ? newMember || (editingKey === item.key ? '' : t(lang, 'placeholder_new_member')) : (editingKey === item.key ? editingName : item.name) || 'M'}</span>
            <input type="text" id={item.draft ? 'add-member-input' : undefined} class="member-name-input" use:editLock
              aria-label={t(lang, item.draft ? 'placeholder_new_member' : 'member_name')}
              enterkeyhint="done" autocomplete="off"
              value={item.draft ? newMember : editingKey === item.key ? editingName : item.name}
              on:focus={() => { editingKey = item.key; editingName = item.name; }}
              on:input={(event) => editName(event, item)} on:compositionend={(event) => editName(event, item)}
              on:keydown={(event) => handleKey(event, item)} on:blur={(event) => commit(event, item)} />
            {#if item.draft}
              <span class="member-placeholder" class:has-value={newMember.length > 0}
                class:placeholder-hidden={editingKey === item.key || newMember.length > 0} aria-hidden="true">{t(lang, 'placeholder_new_member')}</span>
            {/if}
          </span>
          <span class="member-action-slot" class:empty={item.draft}>
            {#if !item.draft}
              {#if isEditMode}
                <Button type="button" class="member-action delete-member" disabled={item.removing}
                  aria-label={t(lang, 'delete_member', { name: item.name })}
                  on:click={() => editFromUI(aassistant.removeMember, { name: item.name })}><X size={16} aria-hidden="true" /></Button>
              {:else}
                <button type="button" class="member-action member-drag-handle" disabled={members.length < 2 || item.removing}
                  aria-label={t(lang, 'reorder_member', { name: item.name })}
                  on:pointerdown={(event) => startDrag(event, item)} on:keydown={(event) => moveMember(event, item)}>
                  <Menu size={16} strokeWidth={1.5} aria-hidden="true" />
                </button>
              {/if}
            {/if}
          </span>
        </div>
      </div>
    {/each}
  </div>
  </div>
</section>
